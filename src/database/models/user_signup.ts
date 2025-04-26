import { SignUpResponse } from "../interface/response.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { UserSignUpInterface } from "../interface/user_signup.js";
import { DeviceInterface } from "../interface/device_info.js";
import { queueEmployee } from "../../utils/workers.js";
import { saveInDBQueueEmployee, saveInRedisQueueEmployee } from "../../utils/queue.js";
import { ContextInterface, EmailSignUpLabelInterface } from "../interface/logger.js";
import { logger } from "../../config/loki.js";
import { MultipleQueryObject } from "../../utils/custom_types.js";

interface UserSignUp {
    checkIfUserExists(values, userInfo: UserSignUpInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse>;
    createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse>;
}

class UserSignUpImpl implements UserSignUp {
    async checkIfUserExists(values, userInfo: UserSignUpInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse> {
        const userTableName = Constants.TABLES.USER_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT users._id, users.name, users.username, auth.is_email_verified FROM ${userTableName}
                        JOIN ${authTableName} ON users._id = auth.user_id WHERE
                        (users.email = $1 OR $1 IS NULL) AND
                        (users.primary_country_code = $2 OR $2 IS NULL) AND
                        (users.phone_number = $3 OR $3 IS NULL) LIMIT 1`;

        const valuesArray = [
            values.email ?? null,
            values.primary_country_code ?? null,
            values.phone_number ?? null,
        ];

        const response: SignUpResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.BAD_GATEWAY,
            verified: false,
        };
        let loggerDefaultParams = {};

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rowCount)) {
                if (!queryResponse.rowCount) response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                else response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;

                const data = queryResponse.rows[0];

                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = data.is_email_verified;

                const redisEmailValue: Object = {
                    _id: data._id,
                    name: data.name,
                    username: data.username,
                    isEmailVerified: data.is_email_verified,
                };
                await queueEmployee.addJobToQueue(context, labels, saveInRedisQueueEmployee, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.READ_FAILURE;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: {
                    query: query,
                    valuesArray: valuesArray,
                },
                error,
            });

            throw new SignUpResponse(response);
        }

        return response;
    }

    async createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const deviceTableName = Constants.TABLES.DEVICE_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const usersDataQuery = `INSERT INTO ${usersTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const usersValuesArray = Object.values(userInfo);

        const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const deviceValuesArray = Object.values(deviceInfo);

        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7)`;
        const authValuesArray = Object.values(helper.createAuthSchema(userInfo._id));

        const usersAuthDataQuery: MultipleQueryObject = [
            {
                query: usersDataQuery,
                valuesArray: usersValuesArray
            },
            {
                query: authDataQuery,
                valuesArray: authValuesArray
            },
        ];

        const response: SignUpResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
            verified: false,
        };
        let loggerDefaultParams = {};

        try {
            const queryResponse = await helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);
            const redisEmailValue: Object = {
                _id: userInfo._id,
                name: userInfo.name,
                username: userInfo.username,
                isEmailVerified: false,
            };

            if (queryResponse.length) {
                response.token = helper.generateAuthToken(userInfo._id, userInfo.username);
                response.message = Constants.SIGNUP_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await queueEmployee.addJobToQueue(context, labels, saveInDBQueueEmployee, Constants.DB.SAVE_IN_DB, {
                    query: deviceDataQuery,
                    valuesArray: deviceValuesArray,
                    errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
                });

                await queueEmployee.addJobToQueue(context, labels, saveInRedisQueueEmployee, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logger.error({
                labels,
                ...loggerDefaultParams,
                ...usersAuthDataQuery,
                error,
            });

            throw new SignUpResponse(response);
        }

        return response;
    }
}

export const userSignUpImpl = new UserSignUpImpl();
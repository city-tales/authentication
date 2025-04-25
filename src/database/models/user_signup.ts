import { SignUpSuccessResponse } from "../interface/response.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { SignUpError } from "../../utils/errors.js";
import { UserSignUpInterface } from "../interface/user_signup.js";
import { DeviceInterface } from "../interface/device_info.js";
import { queueEmployee } from "../../utils/workers.js";
import { saveInDBQueueEmployee, saveInRedisQueueEmployee } from "../../utils/queue.js";
import { ContextInterface, EmailSignUpLabelInterface } from "../interface/logger.js";
import { logger } from "../../config/loki.js";

interface UserSignUp {
    checkIfUserExists(values, userInfo: UserSignUpInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpSuccessResponse>;
    createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpSuccessResponse>;
}

class UserSignUpImpl implements UserSignUp {
    async checkIfUserExists(values, userInfo: UserSignUpInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpSuccessResponse> {
        const tableName = Constants.AUTH_TABLES.USER_TABLE;
        const query = `SELECT _id, username FROM ${tableName} WHERE 
            (email = $1 OR $1 IS NULL) AND
            (primary_country_code = $2 OR $2 IS NULL) AND
            (phone_number = $3 OR $3 IS NULL) LIMIT 1`;

        const valuesArray = [
            values.email ?? null,
            values.primary_country_code ?? null,
            values.phone_number ?? null,
        ];

        const response: SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.SERVICE_UNAVAILABLE,
        };
        let loggerDefaultParams = {};

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rowCount)) {
                if (!queryResponse.rowCount) response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                else response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;

                response.statusCode = Constants.STATUS_CODES.OK;      
                
                const data = queryResponse.rows[0];
                const redisEmailValue: Object = {
                    _id: data._id,
                    username: data.username
                };
                await queueEmployee.addJobToQueue(context, labels, saveInRedisQueueEmployee, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.READ_FAILURE;
            response.statusCode = Constants.STATUS_CODES.BAD_GATEWAY;

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

            throw new SignUpError(helper.convertToClassType(response, SignUpError));
        }

        return response;
    }

    async createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpSuccessResponse> {
        const usersTableName = Constants.AUTH_TABLES.USER_TABLE;
        const deviceTableName = Constants.AUTH_TABLES.DEVICE_TABLE;

        const usersDataQuery = `INSERT INTO ${usersTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const usersValuesArray = Object.values(userInfo);

        const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const deviceValuesArray = Object.values(deviceInfo);

        const response: SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };
        let loggerDefaultParams = {};

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, usersDataQuery, usersValuesArray, Constants.DB_ERRORS.INSERTION_FAILED, labels);
            const redisEmailValue: Object = {
                _id: userInfo._id,
                username: userInfo.username
            };

            if (helper.isInsertQuerySuccessful(queryResponse.command, queryResponse.rowCount)) {
                await queueEmployee.addJobToQueue(context, labels, saveInDBQueueEmployee, Constants.DB.SAVE_IN_DB, {
                    query: deviceDataQuery,
                    valuesArray: deviceValuesArray,
                    errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
                });
                await queueEmployee.addJobToQueue(context, labels, saveInRedisQueueEmployee, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });

                response.token = helper.generateAuthToken(userInfo._id, userInfo.username);
                response.message = Constants.SIGNUP_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;
            response.statusCode = Constants.STATUS_CODES.METHOD_NOT_ALLOWED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: { 
                    query: usersDataQuery,
                    valuesArray: usersValuesArray,
                },
                error,
            });

            throw new SignUpError(helper.convertToClassType({ ...response }, SignUpError));
        }

        return response;
    }
}

export const userSignUpImpl = new UserSignUpImpl();
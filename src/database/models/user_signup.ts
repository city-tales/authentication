import { SignUpResponse } from "../types/response.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { AuthDataSignUpType, UserDataSignUpType, UserSignUpType } from "../types/user_signup.js";
import { DeviceType } from "../types/device_info.js";
import { queueEmployee } from "../../utils/workers.js";
import { ContextType, EmailSignUpLabelType } from "../types/logger.js";
import { logger } from "../../config/loki.js";
import { utils } from "../../utils/utils.js";
import { MultipleQueryObject } from "../../utils/types.js";

interface UserSignUp {
    checkIfUserExists(values, userInfo: UserDataSignUpType, redisKey: string, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse>;
    createUser(userInfo: UserSignUpType, userDataInfo: UserDataSignUpType, authDataSchemaInfo: AuthDataSignUpType, deviceInfo: DeviceType, redisKey: string, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse>;
}

class UserSignUpImpl implements UserSignUp {
    async checkIfUserExists(values, userInfo: UserDataSignUpType, redisKey: string, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse> {
        const userDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT user_data.user_id as _id, user_data.name, user_data.username, auth.password, 
                        auth.is_email_verified, auth.is_passwordless, auth.is_google_verified, 
                        auth.salt FROM ${userDataTableName} user_data
                        JOIN ${authTableName} ON user_data.user_id = auth.user_id WHERE
                        (user_data.email = $1) OR
                        (user_data.primary_country_code = $2 OR $2 IS NULL) AND
                        (user_data.phone_number = $3) LIMIT 1`;

        const valuesArray = [
            values.email ?? null,
            values.primary_country_code ?? null,
            values.phone_number ?? null,
        ];

        let response = new SignUpResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                query: query,
                valuesArray: valuesArray,
            },
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rowCount)) {
                if (!queryResponse.rowCount) response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                else response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;

                const data = queryResponse.rows[0];
                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = data.is_email_verified || data.is_passwordless || data.is_google_verified;

                if (response.verified) response.token = helper.generateUserAuthToken(data._id, data.username, valuesArray['email'], labels.operation, response.verified);
                else throw new Error(Constants.SIGNUP_MESSAGE.NOT_VERIFIED);

                const redisEmailValue: Object = {
                    _id: data._id,
                    name: data.name,
                    username: data.username,
                    password: data.password,
                    salt: data.salt,
                    isEmailVerified: response.verified,
                };
                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });
            }
            else {
                response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.OK;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.READ_FAILURE;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new SignUpResponse(response);
        }

        return response;
    }

    async createUser(userInfo: UserSignUpType, userDataInfo: UserDataSignUpType, authDataSchemaInfo: AuthDataSignUpType, deviceInfo: DeviceType, redisKey: string, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const usersDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const usersQuery = `INSERT INTO ${usersTableName} VALUES ($1)`;
        const usersValuesArray = Object.values(userInfo);

        const usersDataQuery = `INSERT INTO ${usersDataTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
        const usersDataValuesArray = Object.values(userDataInfo);

        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
        const authValuesArray = Object.values(authDataSchemaInfo);

        const usersAuthDataQuery: MultipleQueryObject = [
            {
                query: usersQuery,
                valuesArray: usersValuesArray
            },
            {
                query: usersDataQuery,
                valuesArray: usersDataValuesArray,
            },
            {
                query: authDataQuery,
                valuesArray: authValuesArray
            },
        ];

        const response = new SignUpResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            ...usersAuthDataQuery,
        };

        try {
            const queryResponse = await helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);
            const redisEmailValue: Object = {
                _id: userInfo._id,
                name: userDataInfo.name,
                username: userDataInfo.username,
                password: authDataSchemaInfo.password,
                salt: authDataSchemaInfo.salt,
                isEmailVerified: authDataSchemaInfo.is_email_verified,
            };

            if (queryResponse.length) {
                response.token = helper.generateUserAuthToken(userInfo._id, userDataInfo.username, userDataInfo.email, labels.operation);
                response.message = Constants.SIGNUP_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await utils.logUserDevice(deviceInfo, context, labels);
                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new SignUpResponse(response);
        }

        return response;
    }
}

export const userSignUpImpl = new UserSignUpImpl();
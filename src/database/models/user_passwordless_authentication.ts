import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { MultipleQueryObject, PasswordlessAuthenticationTokenType, RedisEmailKeySerialisation } from "../../utils/types.js";
import { utils } from "../../utils/utils.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, PasswordlessAuthenticationLabelType } from "../types/logger.js";
import { EmailVerificationResponse, PasswordlessAuthenticationResponse } from "../types/response.js";
import { PasswordlessAuthenticationAuthType, PasswordlessAuthenticationDataType, PasswordlessAuthenticationType } from "../types/user_passwordless_authentication.js";

interface UserPasswordlessAuthentication {
    checkIfUserExists(userDataSchemaInfo: PasswordlessAuthenticationDataType, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<PasswordlessAuthenticationResponse>;
    authenticateUserEmailForPasswordless(email: string, _id: string, username: string, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<EmailVerificationResponse>;
    createUser(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, authDataSchemaInfo: PasswordlessAuthenticationAuthType, deviceInfo: DeviceType, redisKey: string, context: ContextType, labels: PasswordlessAuthenticationLabelType, serialisationKey?: string): Promise<EmailVerificationResponse>;
}

class UserPasswordlessAuthenticationImpl implements UserPasswordlessAuthentication {
    async checkIfUserExists(userDataSchemaInfo: PasswordlessAuthenticationDataType, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<PasswordlessAuthenticationResponse> {
        const usersTableName = Constants.TABLES.USER_DATA_TABLE;
        const response = new PasswordlessAuthenticationResponse();

        const query = `SELECT user_data.user_id as _id, user_data.username from ${usersTableName} user_data WHERE 
                user_data.email = $1 OR (user_data.user_id = $2 OR user_data.user_id IS NULL)
                LIMIT 1`;
        const valuesArray = [ userDataSchemaInfo.email, userDataSchemaInfo.user_id ];

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            email: userDataSchemaInfo.email,
        };

        try {
            const queryResponse = await Helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (Helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];
                
                const prepareExistingUserToken: PasswordlessAuthenticationTokenType = {
                    _id: data._id!,
                    username: data.username!,
                    email: userDataSchemaInfo.email,
                };

                const userInfoFromData: RedisEmailKeySerialisation = {
                    email: Helper.sanitiseStringValue(userDataSchemaInfo.email),
                };
                const redisKey: string = Helper.serialiseRedisKeyValues(
                    Helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.PASSWORDLESS, userInfoFromData)
                );
                const redisEmailValue: Object = {
                    _id: data._id,
                    username: data.username,
                };

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: Helper.serialiseRedisKeyValues(redisEmailValue),
                    timeout: Constants.DB_TIMEOUTS.SHORT_CACHE_DB_REDIS_TIMEOUT,
                });

                response._id = data._id;
                response.username = data.username;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER;
                response.token = Helper.generatePasswordlessAuthenticationAuthToken(prepareExistingUserToken, deviceInfo, labels.operation);
            }
            else {
                response._id = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EMPTY;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.NO_CONTENT;
            }

            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            response.message = Helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new PasswordlessAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUserEmailForPasswordless(email: string, _id: string, username: string, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<EmailVerificationResponse> {
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const response = new EmailVerificationResponse();
        const query = `SELECT is_email_verified, is_passwordless, is_google_verified FROM ${authTableName} WHERE user_id = $1 LIMIT 1`;
        const valuesArray = [_id];

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            authQuery :query,
        };

        try {
            const queryResponse = await Helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (Helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length))  {
                const data = queryResponse.rows[0];

                if(!data.is_email_verified || !data.is_passwordless) {
                    const updateQuery = `UPDATE ${authTableName} SET is_email_verified = true, updated_at = ${Helper.formatDateTimeString()} is_passwordless = true WHERE user_id = $1`;
                    const updatedQueryResponse = await Helper.executeQueryAsyncWithoutLock(context, updateQuery, valuesArray, Constants.DB_ERRORS.UPDATE_FAILED, labels);

                    if (Helper.isUpdateQuerySuccessful(updatedQueryResponse.command, updatedQueryResponse.rowCount)) {
                        response.success = true;
                        response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.UPDATED;
                    }
                }
                else {
                    response.success = true;
                    response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.ALREADY_VERIFIED;
                }

                await utils.logUserDevice(deviceInfo, context, labels);
            }
            else {
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.FAILED;
            }
            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            response.message = Helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(response);
        }

        return response;
    }

    async createUser(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, authDataSchemaInfo: PasswordlessAuthenticationAuthType, deviceInfo: DeviceType, redisKey: string, context: ContextType, labels: PasswordlessAuthenticationLabelType, serialisationKey?: string): Promise<EmailVerificationResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const usersDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const usersQuery = `INSERT INTO ${usersTableName} VALUES ($1, $2)`;
        const usersValuesArray = Object.values(userInfo);

        const usersDataQuery = `INSERT INTO ${usersDataTableName} (_id, email, username, user_id, updated_at) VALUES ($1, $2, $3, $4, $5)`;
        const usersDataValuesArray = Object.values(userDataSchemaInfo);

        authDataSchemaInfo.is_passwordless = true;
        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const authValuesArray = Object.values(authDataSchemaInfo);

        const usersAuthDataQuery: MultipleQueryObject = [
            {
                query: usersQuery,
                valuesArray: usersValuesArray
            },
            {
                query: usersDataQuery,
                valuesArray: usersDataValuesArray
            },
            {
                query: authDataQuery,
                valuesArray: authValuesArray
            },
        ];

        const response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            ...usersAuthDataQuery,
        };

        try {
            const queryResponse = await Helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);
            const redisEmailValue: Object = {
                _id: userInfo._id,
                username: userDataSchemaInfo.username,
            };

            if (queryResponse.length) {
                response.success = true;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.NEW_USER;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await utils.logUserDevice(deviceInfo, context, labels);

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: Helper.serialiseRedisKeyValues(redisEmailValue),
                    timeout: Constants.DB_TIMEOUTS.VERY_SHORT_CACHE_DB_REDIS_TIMEOUT,
                });
            }
        }
        catch (error) {
            response.message = Helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(response);
        }

        return response;
    }
}

export const userPasswordlessAuthenticationImpl = new UserPasswordlessAuthenticationImpl();
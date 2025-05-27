import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { MultipleQueryObject } from "../../utils/custom_types.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, PasswordlessAuthenticationLabelInterface } from "../interface/logger.js";
import { EmailVerificationResponse, PasswordlessAuthenticationResponse } from "../interface/response.js";
import { PasswordlessAuthenticationInterface } from "../interface/user_passwordless_authentication.js";

interface UserPasswordlessAuthentication {
    logUserDevice(deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<void>;
    checkIfUserExists(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse>;
    authenticateUserEmailForPasswordless(email: string, _id: string, username: string, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse>;
    createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface, serialisationKey?: string): Promise<EmailVerificationResponse>;
}

class UserPasswordlessAuthenticationImpl implements UserPasswordlessAuthentication {
    async logUserDevice(deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<void> {
        const deviceTableName = Constants.TABLES.DEVICE_TABLE;
        const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const deviceValuesArray = Object.values(deviceInfo);

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            query: deviceDataQuery,
            values: deviceValuesArray,
        };

        try {
            await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_DB, {
                query: deviceDataQuery,
                valuesArray: deviceValuesArray,
                errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
            });
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });
        }
    }

    async checkIfUserExists(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const response = new PasswordlessAuthenticationResponse();

        const query = `SELECT users._id, users.username from ${usersTableName} WHERE users.email = $1 LIMIT 1`;
        const valuesArray = [ userInfo.email ];

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            email: userInfo.email,
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];

                const userInfoFromData: RedisEmailKeySerialisation = {
                    email: helper.sanitiseStringValue(userInfo.email),
                };
                const redisKey: string = helper.serialiseRedisKeyValues(
                    helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.PASSWORDLESS, userInfoFromData)
                );
                const redisEmailValue: Object = {
                    _id: data._id,
                    username: data.username,
                };

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue),
                    timeout: Constants.DB_TIMEOUTS.SHORT_CACHE_DB_REDIS_TIMEOUT,
                });

                response._id = data._id;
                response.username = data.username;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER;
                response.token = helper.generatePasswordlessAuthenticationAuthToken(userInfo, deviceInfo, labels.operation);
            }
            else {
                response._id = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EMPTY;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.NO_CONTENT;
            }

            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new PasswordlessAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUserEmailForPasswordless(email: string, _id: string, username: string, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse> {
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const response = new EmailVerificationResponse();
        const query = `SELECT is_email_verified, is_passwordless FROM ${authTableName} WHERE user_id = $1 LIMIT 1`;
        const valuesArray = [_id];

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            authQuery :query,
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length))  {
                const data = queryResponse.rows[0];

                if(!data.is_email_verified || !data.is_passwordless) {
                    const updateQuery = `UPDATE ${authTableName} SET is_email_verified = TRUE AND is_passwordless = TRUE WHERE user_id = $1`;
                    const updatedQueryResponse = await helper.executeQueryAsyncWithoutLock(context, updateQuery, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

                    if (helper.isSelectQuerySuccessful(updatedQueryResponse.command, updatedQueryResponse.rows.length)) {
                        response.success = true;
                        response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.UPDATED;
                    }
                }
                else {
                    response.success = true;
                    response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.ALREADY_VERIFIED;
                }

                await this.logUserDevice(deviceInfo, context, labels);
            }
            else {
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.FAILED;
            }
            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(response);
        }

        return response;
    }

    async createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface, serialisationKey?: string): Promise<EmailVerificationResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const usersDataQuery = `INSERT INTO ${usersTableName} (_id, username, email) VALUES ($1, $2, $3)`;
        const usersValuesArray = Object.values(userInfo);

        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        const authValuesArray = Object.values(helper.createAuthSchema(userInfo._id, null, null, null, true, true));

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

        const response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            ...usersAuthDataQuery,
        };

        try {
            const queryResponse = await helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);
            const redisEmailValue: Object = {
                _id: userInfo._id,
                username: userInfo.username,
            };

            if (queryResponse.length) {
                response.success = true;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await this.logUserDevice(deviceInfo, context, labels);

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue),
                    timeout: Constants.DB_TIMEOUTS.VERY_SHORT_CACHE_DB_REDIS_TIMEOUT,
                });
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(response);
        }

        return response;
    }
}

export const userPasswordlessAuthenticationImpl = new UserPasswordlessAuthenticationImpl();
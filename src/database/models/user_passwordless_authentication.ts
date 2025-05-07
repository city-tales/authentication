import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { MultipleQueryObject } from "../../utils/custom_types.js";
import { helper } from "../../utils/helper.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, PasswordlessAuthenticationLabelInterface } from "../interface/logger.js";
import { EmailVerificationResponse } from "../interface/response.js";
import { PasswordlessAuthenticationInterface } from "../interface/user_passwordless_authentication.js";

interface UserPasswordlessAuthentication {
    logUserDevice(deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<void>;
    createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse>;
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
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });
        }
    }

    async createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, redisKey: string, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse> {
        const usersTableName = Constants.TABLES.USER_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        /* check for existing user first */

        const usersDataQuery = `INSERT INTO ${usersTableName} (_id, name, username, email) VALUES ($1, $2, $3, $4)`;
        const usersValuesArray = Object.values(userInfo);

        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
        const authValuesArray = Object.values(helper.createAuthSchema(userInfo._id, null, true));

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
                name: userInfo.name,
                username: userInfo.username,
                isEmailVerified: true,
            };

            if (queryResponse.length) {
                response.success = true;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await this.logUserDevice(deviceInfo, context, labels);

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

            throw new EmailVerificationResponse(response);
        }

        return response;
    }
}

export const userPasswordlessAuthenticationImpl = new UserPasswordlessAuthenticationImpl();
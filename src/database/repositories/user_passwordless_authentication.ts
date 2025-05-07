import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface, GPRCDeviceInterface } from "../interface/device_info.js";
import { ContextInterface, PasswordlessAuthenticationLabelInterface } from "../interface/logger.js";
import { EmailVerificationResponse, PasswordlessAuthenticationResponse } from "../interface/response.js";
import { PasswordlessAuthenticationInterface } from "../interface/user_passwordless_authentication.js";
import { userPasswordlessAuthenticationImpl } from "../models/user_passwordless_authentication.js";

interface UserPasswordlessAuthenticationRepositories {
    generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse>;
    createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse>;
}

class UserPasswordlessAuthenticationRepositoriesImpl implements UserPasswordlessAuthenticationRepositories {
    async generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse> {
        let response = new PasswordlessAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };
        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.MAGIC_LINK, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                response.token = deSerialisedObject.token;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.LINK_ALREADY_SENT;
            }
            else {
                const generatedToken = helper.generatePasswordlessAuthenticationAuthToken(userInfo, deviceInfo, labels.operation);
                const redisEmailValue: Object = {
                    _id: userInfo._id,
                    name: userInfo.name,
                    username: userInfo.username,
                    token: generatedToken,
                };

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue),
                    timeout: Constants.DB_TIMEOUTS.LONG_CACHE_DB_REDIS_TIMEOUT
                });
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.SUCCESS;
            }
            response.statusCode = Constants.STATUS_CODES.OK;

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...{ token: response.token } };
            logPayload = { ...logPayload, ...loggerDefaultParams };
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }
        
        logPayload = helper.logResponse(logPayload, response);
        return response;
    }

    async createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceInfo,
            },
        };

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                if (deSerialisedObject.isEmailVerified) {
                    await userPasswordlessAuthenticationImpl.logUserDevice(deviceInfo, context, labels);

                    loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                    logPayload = { ...logPayload, ...loggerDefaultParams };
                    logPayload = helper.logResponse(logPayload, deSerialisedObject);
                    logger.info({ ...logPayload });

                    return response;
                }
            }
            const userResponse: EmailVerificationResponse = await userPasswordlessAuthenticationImpl.createUser(userInfo, deviceInfo, redisKey, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userPasswordlessAuthenticationRepositories = new UserPasswordlessAuthenticationRepositoriesImpl();
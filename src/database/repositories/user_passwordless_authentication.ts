import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { PasswordlessAuthenticationTokenInterface, RedisEmailKeySerialisation } from "../../utils/interface.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, PasswordlessAuthenticationLabelInterface } from "../interface/logger.js";
import { EmailVerificationResponse, PasswordlessAuthenticationResponse } from "../interface/response.js";
import { PasswordlessAuthenticationInterface } from "../interface/user_passwordless_authentication.js";
import { userPasswordlessAuthenticationImpl } from "../models/user_passwordless_authentication.js";

interface UserPasswordlessAuthenticationRepositories {
    generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse>;
    createUser(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<EmailVerificationResponse>;
}

class UserPasswordlessAuthenticationRepositoriesImpl implements UserPasswordlessAuthenticationRepositories {
    async generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse> {
        let response = new PasswordlessAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };
        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.PASSWORDLESS, userInfoForRedisKey)
        );
        let generatedToken = '';

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                const prepareExistingUserToken: PasswordlessAuthenticationInterface = {
                    _id: deSerialisedObject._id!,
                    username: deSerialisedObject.username!,
                    email: userInfo.email,
                };
                generatedToken = helper.generatePasswordlessAuthenticationAuthToken(prepareExistingUserToken, deviceInfo, labels.operation);

                response.token = generatedToken;
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.LINK_ALREADY_SENT;
            }
            else {
                const isExistingUser: PasswordlessAuthenticationResponse = await userPasswordlessAuthenticationImpl.checkIfUserExists(userInfo, deviceInfo, context, labels);
                if (isExistingUser.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                    const prepareExistingUserToken: PasswordlessAuthenticationTokenInterface = {
                        _id: isExistingUser._id!,
                        username: isExistingUser.username!,
                        email: userInfo.email,
                    };
                    deviceInfo.user_id = isExistingUser._id;
                    generatedToken = helper.generatePasswordlessAuthenticationAuthToken(prepareExistingUserToken, deviceInfo, labels.operation);
                    
                    response.token = generatedToken;
                }
                else {
                    generatedToken = helper.generatePasswordlessAuthenticationAuthToken(userInfo, deviceInfo, labels.operation);
                }
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.SUCCESS;
            }
            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
        logPayload = { ...logPayload, ...{ token: response } };
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = helper.logResponse(logPayload, response);
        logger.info({ ...logPayload });
        
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
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.MAGIC_LINK, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                await userPasswordlessAuthenticationImpl.logUserDevice(deviceInfo, context, labels);

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logResponse(logPayload, deSerialisedObject);
                logger.info({ ...logPayload });

                return response;
            }
            
            const isExistingUser: PasswordlessAuthenticationResponse = await userPasswordlessAuthenticationImpl.checkIfUserExists(userInfo, deviceInfo, context, labels);
            if(isExistingUser.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                const dbResponse: EmailVerificationResponse = await userPasswordlessAuthenticationImpl.authenticateUserEmailForPasswordless(userInfo.email, isExistingUser._id!, isExistingUser.username!, deviceInfo, context, labels);
                if(dbResponse.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.ALREADY_VERIFIED || dbResponse.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.UPDATED) {
                    response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.SUCCESS;
                }
            }
            else {
                const userResponse: EmailVerificationResponse = await userPasswordlessAuthenticationImpl.createUser(userInfo, deviceInfo, redisKey, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userPasswordlessAuthenticationRepositories = new UserPasswordlessAuthenticationRepositoriesImpl();
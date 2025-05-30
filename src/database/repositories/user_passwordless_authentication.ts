import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { PasswordlessAuthenticationTokenType, RedisEmailKeySerialisation } from "../../utils/types.js";
import { utils } from "../../utils/utils.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, PasswordlessAuthenticationLabelType } from "../types/logger.js";
import { EmailVerificationResponse, PasswordlessAuthenticationResponse } from "../types/response.js";
import { PasswordlessAuthenticationAuthType, PasswordlessAuthenticationDataType, PasswordlessAuthenticationType } from "../types/user_passwordless_authentication.js";
import { userPasswordlessAuthenticationImpl } from "../models/user_passwordless_authentication.js";

interface UserPasswordlessAuthenticationRepositories {
    generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, deviceSchemaInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<PasswordlessAuthenticationResponse>;
    createUser(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, authDataSchemaInfo: PasswordlessAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<EmailVerificationResponse>;
}

class UserPasswordlessAuthenticationRepositoriesImpl implements UserPasswordlessAuthenticationRepositories {
    async generateUserPasswordlessTokenDetails(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, deviceSchemaInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<PasswordlessAuthenticationResponse> {
        let response = new PasswordlessAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };
        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userDataSchemaInfo.email,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.PASSWORDLESS, userInfoForRedisKey)
        );
        let generatedToken = '';

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            let prepareUserToken: PasswordlessAuthenticationTokenType = {
                _id: userInfo._id,
                username: userDataSchemaInfo.username,
                email: userDataSchemaInfo.email,
            };

            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));

                prepareUserToken._id = deSerialisedObject._id;
                prepareUserToken.username = deSerialisedObject.username;

                generatedToken = helper.generatePasswordlessAuthenticationAuthToken(prepareUserToken, deviceSchemaInfo, labels.operation);
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.LINK_ALREADY_SENT;
            }
            else {
                const isExistingUser: PasswordlessAuthenticationResponse = await userPasswordlessAuthenticationImpl.checkIfUserExists(userDataSchemaInfo, deviceSchemaInfo, context, labels);
                if (isExistingUser.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                    prepareUserToken._id = isExistingUser._id!;
                    prepareUserToken.username = isExistingUser.username!;
                    generatedToken = helper.isNeitherNullNorUndefinedNorEmpty(isExistingUser.token) ? isExistingUser.token : helper.generatePasswordlessAuthenticationAuthToken(prepareUserToken, deviceSchemaInfo, labels.operation);
                }
                else {
                    generatedToken = helper.generatePasswordlessAuthenticationAuthToken(prepareUserToken, deviceSchemaInfo, labels.operation);
                }
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.CREATED;
            }

            response._id = prepareUserToken._id;
            response.username = prepareUserToken.username;
            response.token = generatedToken;
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

    async createUser(userInfo: PasswordlessAuthenticationType, userDataSchemaInfo: PasswordlessAuthenticationDataType, authDataSchemaInfo: PasswordlessAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: PasswordlessAuthenticationLabelType): Promise<EmailVerificationResponse> {
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
            email: userDataSchemaInfo.email,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.MAGIC_LINK, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                await utils.logUserDevice(deviceInfo, context, labels);
                response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.ALREADY_VERIFIED;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.success = true;

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logResponse(logPayload, deSerialisedObject);
                logger.info({ ...logPayload });

                return response;
            }
            
            const isExistingUser: PasswordlessAuthenticationResponse = await userPasswordlessAuthenticationImpl.checkIfUserExists(userDataSchemaInfo, deviceInfo, context, labels);
            if(isExistingUser.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                const dbResponse: EmailVerificationResponse = await userPasswordlessAuthenticationImpl.authenticateUserEmailForPasswordless(userDataSchemaInfo.email, isExistingUser._id!, isExistingUser.username!, deviceInfo, context, labels);
                if(dbResponse.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.ALREADY_VERIFIED || dbResponse.message === Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.UPDATED) {
                    response.statusCode = Constants.STATUS_CODES.OK;
                    response.success = true;
                    response.message = Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EXISTING_USER;
                }
            }
            else {
                const userResponse: EmailVerificationResponse = await userPasswordlessAuthenticationImpl.createUser(userInfo, userDataSchemaInfo, authDataSchemaInfo, deviceInfo, redisKey, context, labels);
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
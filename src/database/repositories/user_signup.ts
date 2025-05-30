import { AuthDataSignUpType, UserDataSignUpType, UserSignUpType } from "../types/user_signup.js";
import { userSignUpImpl } from "../models/user_signup.js";
import { SignUpResponse } from "../types/response.js";
import { DeviceType } from "../types/device_info.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { cacheDB } from "../../config/redis.js";
import { RedisEmailKeySerialisation } from "../../utils/types.js";
import { ContextType, EmailSignUpLabelType } from "../types/logger.js";
import { logger } from "../../config/loki.js";

interface UserSignUpRepository {
    checkIfUserExists(userInfo: UserDataSignUpType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse>;
    createUser(userInfo: UserSignUpType, userDataInfo: UserDataSignUpType, authDataSchemaInfo: AuthDataSignUpType, deviceInfo: DeviceType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse>;
}

class UserSignUpRepositoryImpl implements UserSignUpRepository {
    async checkIfUserExists(userInfo: UserDataSignUpType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse> {
        let response = new SignUpResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };

        try {
            const redisKey: string = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );
            const isKeyInRedis = await cacheDB.get(redisKey);

            if (helper.isEitherNullOrUndefinedOrEmpty(isKeyInRedis)) {
                const userInfoForCheckingExistingUser = {
                    email: helper.passStringNullParams(userInfo.email),
                    primary_country_code: helper.passStringNullParams(userInfo.primary_country_code),
                    phone_number: helper.passStringNullParams(userInfo.phone_number),
                };

                const userResponse: SignUpResponse = await userSignUpImpl.checkIfUserExists(userInfoForCheckingExistingUser, userInfo, redisKey, context, labels);
                response = userResponse;
            }
            else {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));

                response.token = helper.generateUserAuthToken(deSerialisedObject._id, deSerialisedObject.username, userInfo.email, labels.operation, deSerialisedObject.isEmailVerified);
                response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = deSerialisedObject.isEmailVerified;

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = { ...logPayload, ...{ redisKey: redisKey } };
                logPayload = helper.logResponse(logPayload, response);
                logger.info({ ...logPayload });
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...{ userInfo: userInfo } };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new SignUpResponse(error);
        }

        return response;
    }

    async createUser(userInfo: UserSignUpType, userDataInfo: UserDataSignUpType, authDataSchemaInfo: AuthDataSignUpType, deviceInfo: DeviceType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse> {
        let response = new SignUpResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceInfo,
            },
        };

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userDataInfo.email,
        };

        try {
            const redisKey: string = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );

            const userResponse: SignUpResponse = await userSignUpImpl.createUser(userInfo, userDataInfo, authDataSchemaInfo, deviceInfo, redisKey, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new SignUpResponse(error);
        }

        return response;
    }
}

export const userSignUp = new UserSignUpRepositoryImpl();


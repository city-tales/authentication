import { UserSignUpInterface } from "../interface/user_signup.js";
import { userSignUpImpl } from "../models/user_signup.js";
import { SignUpResponse } from "../interface/response.js";
import { DeviceInterface } from "../interface/device_info.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { cacheDB } from "../../config/redis.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { ContextInterface, EmailSignUpLabelInterface } from "../interface/logger.js";
import { logger } from "../../config/loki.js";

interface UserSignUpRepository {
    checkIfUserExists(userInfo: UserSignUpInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse>;
    createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse>;
}

class UserSignUpRepositoryImpl implements UserSignUpRepository {
    async checkIfUserExists(userInfo: UserSignUpInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse> {
        let response = new SignUpResponse();
        let loggerDefaultParams = {};

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

                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username);
                response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = deSerialisedObject.isEmailVerified;

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                logger.info({
                    labels,
                    ...loggerDefaultParams,
                    request: {
                        redisKey: redisKey
                    },
                    response,
                });
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: {
                    userInfo: userInfo,
                },
                error,
            });

            throw new SignUpResponse(error);
        }

        return response;
    }

    async createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse> {
        let response: SignUpResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
            verified: false,
        };
        let loggerDefaultParams = {};

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };

        try {
            const redisKey = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );

            const userResponse: SignUpResponse = await userSignUpImpl.createUser(userInfo, deviceInfo, redisKey, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: {
                    userInfo,
                    deviceInfo,
                },
                error,
            });

            throw new SignUpResponse(error);
        }

        return response;
    }
}

export const userSignUp = new UserSignUpRepositoryImpl();


import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { LoginError } from "../../utils/errors.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface } from "../interface/helper.js";
import { LoginSuccessResponse } from "../interface/response.js";
import { UserLoginInterface } from "../interface/user_login.js";
import { userLoginImpl } from "../models/user_login.js";

interface UserLoginRepository {
    checkUserInRedis(email: string, context: ContextInterface);
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse>;
}

class UserLoginRepositoryImpl implements UserLoginRepository {
    async checkUserInRedis(email: string, context: ContextInterface) {
        let response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.SERVICE_UNAVAILABLE,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };
        let loggerDefaultParams = {};

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: email,
        };

        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis));

                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = true; /* YET TO IMPLEMENT */
                response.retryVerification = true; /* YET TO IMPLEMENT */

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                logger.info(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
                    labels: {
                        operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
                    },
                    loggerDefaultParams,
                    request: {
                        redisKey: redisKey,
                    },
                    response,
                });
            }
            else {
                response.message = Constants.REDIS_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;
            response.statusCode = Constants.STATUS_CODES.SERVICE_UNAVAILABLE;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
                labels: {
                    operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                    type: Constants.LOKI_LOGGER_LABELS.EMAIL,
                },
                loggerDefaultParams,
                request: {
                    redisKey: redisKey,
                },
                error,
            });

            throw new LoginError(
                helper.convertToClassType<LoginError>(response, LoginError)
            );
        }

        return response;
    }

    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse> {
        let response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };
        let loggerDefaultParams = {};

        try {
            const userResponse = await userLoginImpl.loginUser(userInfo, deviceInfo, context);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
                labels: {
                    operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                    type: Constants.LOKI_LOGGER_LABELS.EMAIL,
                },
                loggerDefaultParams,
                request: {
                    userInfo,
                    deviceInfo, 
                },
                error: error,
            });

            throw new LoginError(error);
        }

        return response;
    }
}

export const userLoginRepositoryImpl = new UserLoginRepositoryImpl();
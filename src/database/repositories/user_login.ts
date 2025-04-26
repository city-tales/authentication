import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, EmailLoginLabelInterface } from "../interface/logger.js";
import { LoginResponse } from "../interface/response.js";
import { UserLoginInterface } from "../interface/user_login.js";
import { userLoginImpl } from "../models/user_login.js";

interface UserLoginRepository {
    checkUserInRedis(email: string, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
}

class UserLoginRepositoryImpl implements UserLoginRepository {
    async checkUserInRedis(email: string, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
        let response: LoginResponse = {
            name: Constants.LOGIN_MESSAGE.EMPTY,
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.BAD_GATEWAY,
            retryVerification: true,
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

                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username, deSerialisedObject.isEmailVerified);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.retryVerification = !deSerialisedObject.isEmailVerified;

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                logger.info({
                    labels,
                    ...loggerDefaultParams,
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

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: {
                    redisKey: redisKey,
                },
                error,
            });

            throw new LoginResponse(response);
        }

        return response;
    }

    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
        let response = new LoginResponse();
        let loggerDefaultParams = {};

        try {
            const userResponse: LoginResponse = await userLoginImpl.loginUser(userInfo, deviceInfo, context, labels);
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
                error: error,
            });

            throw new LoginResponse(error);
        }

        return response;
    }
}

export const userLoginRepositoryImpl = new UserLoginRepositoryImpl();
import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/types.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, EmailLoginLabelType } from "../types/logger.js";
import { LoginResponse } from "../types/response.js";
import { UserLoginType } from "../types/user_login.js";
import { userLoginImpl } from "../models/user_login.js";

interface UserLoginRepository {
    checkUserInRedis(
        userInfo: UserLoginType,
        context: ContextType,
        labels: EmailLoginLabelType,
    ): Promise<LoginResponse>;
    loginUser(
        userInfo: UserLoginType,
        deviceInfo: DeviceType,
        context: ContextType,
        labels: EmailLoginLabelType,
    ): Promise<LoginResponse>;
}

class UserLoginRepositoryImpl implements UserLoginRepository {
    async checkUserInRedis(
        userInfo: UserLoginType,
        context: ContextType,
        labels: EmailLoginLabelType,
    ): Promise<LoginResponse> {
        let response = new LoginResponse();

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
        };
        const redisKey: string = Helper.serialiseRedisKeyValues(
            Helper.prepareUserRedisKeyValues(
                Constants.SERIALISATION_KEYS.USER,
                userInfoForRedisKey,
            ),
        );

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                redisKey: redisKey,
            },
        };

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (Helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = Helper.parseRedisValueToObject(
                    Helper.convertToType<string>(
                        isKeyInRedis,
                        Constants.TYPE_SWITCH.STRING,
                    ),
                );

                if (
                    Helper.verifyPassword(
                        userInfo.password,
                        deSerialisedObject.password,
                        deSerialisedObject.salt,
                    )
                ) {
                    response.name = deSerialisedObject.name;
                    response.token = Helper.generateUserAuthToken(
                        deSerialisedObject._id,
                        deSerialisedObject.username,
                        userInfo.email,
                        labels.operation,
                    );
                    response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                    response.statusCode = Constants.STATUS_CODES.OK;
                    response.retryVerification =
                        !deSerialisedObject.isEmailVerified;

                    loggerDefaultParams = Helper.generateDefaultSuccessParams(
                        context.tracerId,
                        Constants.LOKI_LOGGER_LABELS.REPOSITORIES,
                    );
                    logPayload = { ...logPayload, ...loggerDefaultParams };
                    logPayload = Helper.logResponse(logPayload, response);
                    logger.info({ ...logPayload });
                } else {
                    response.message =
                        Constants.LOGIN_MESSAGE.PASSWORD_DO_NOT_MATCH;
                    response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
                }
            } else {
                response.message = Constants.REDIS_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
            }
        } catch (error) {
            response.message = Helper.isNeitherNullNorUndefinedNorEmpty(
                error.message,
            )
                ? error.message
                : Constants.REDIS_MESSAGE.FAILED;

            loggerDefaultParams = Helper.generateDefaultFailureParams(
                context.tracerId,
                Constants.LOKI_LOGGER_LABELS.REPOSITORIES,
            );
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(response);
        }

        return response;
    }

    async loginUser(
        userInfo: UserLoginType,
        deviceInfo: DeviceType,
        context: ContextType,
        labels: EmailLoginLabelType,
    ): Promise<LoginResponse> {
        let response = new LoginResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceInfo,
            },
        };

        try {
            const userResponse: LoginResponse = await userLoginImpl.loginUser(
                userInfo,
                deviceInfo,
                context,
                labels,
            );
            response = userResponse;
        } catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(
                context.tracerId,
                Constants.LOKI_LOGGER_LABELS.REPOSITORIES,
            );
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(error);
        }

        return response;
    }
}

export const userLoginRepositoryImpl = new UserLoginRepositoryImpl();

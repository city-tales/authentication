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
    checkUserInRedis(userInfo: UserLoginInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
}

class UserLoginRepositoryImpl implements UserLoginRepository {
    async checkUserInRedis(userInfo: UserLoginInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
        let response = new LoginResponse();

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: userInfo.email,
            password: userInfo.password,
        };
        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
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
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));

                response.name = deSerialisedObject.name;
                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username, userInfo.email);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.retryVerification = !deSerialisedObject.isEmailVerified;

                loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logResponse(logPayload, response);
                logger.info({ ...logPayload });
            }
            else {
                response.message = Constants.REDIS_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(response);
        }

        return response;
    }

    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
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
            const userResponse: LoginResponse = await userLoginImpl.loginUser(userInfo, deviceInfo, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(error);
        }

        return response;
    }
}

export const userLoginRepositoryImpl = new UserLoginRepositoryImpl();
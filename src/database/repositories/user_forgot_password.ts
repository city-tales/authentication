import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/types.js";
import { userForgotPasswordImpl } from "../models/user_forgot_password.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, EmailForgotPasswordLabelType } from "../types/logger.js";
import { EmailForgotPasswordResponse } from "../types/response.js";

interface UserForgotPasswordRepository {
    forgotPassword(email: string, deviceInfo: DeviceType, context: ContextType, labels: EmailForgotPasswordLabelType): Promise<EmailForgotPasswordResponse>;
}

class UserForgotPasswordRepositoryImpl implements UserForgotPasswordRepository {
    async forgotPassword(email: string, deviceInfo: DeviceType, context: ContextType, labels: EmailForgotPasswordLabelType): Promise<EmailForgotPasswordResponse> {
        let response = new EmailForgotPasswordResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                email,
                deviceInfo,
            },
        };

        try {
            const userInfoForRedisKey: RedisEmailKeySerialisation = {
                email: email,
            };
            const redisKey: string = Helper.serialiseRedisKeyValues(
                Helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (Helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = Helper.parseRedisValueToObject(Helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                const isEmailVerified = deSerialisedObject.isEmailVerified;

                if(Helper.isGenericNeitherNullNorUndefined(isEmailVerified) && isEmailVerified) {
                    response.name = deSerialisedObject.name;
                    response.token = Helper.generateUserAuthToken(deSerialisedObject._id, deSerialisedObject.username, email, labels.operation);
                    response.message = Constants.FORGOT_PASSWORD_MESSAGE.SUCCESS;
                    response.statusCode = Constants.STATUS_CODES.OK;

                    loggerDefaultParams = Helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                    logPayload = { ...logPayload, ...loggerDefaultParams };
                    logPayload = Helper.logResponse(logPayload, response);
                    logger.info({ ...logPayload });
                }
                else {
                    response.message = Constants.FORGOT_PASSWORD_MESSAGE.NOT_VERIFIED;
                    response.statusCode = Constants.STATUS_CODES.OK;
                    response.token = Constants.FORGOT_PASSWORD_MESSAGE.EMPTY_TOKEN;
                }
            }
            else {
                const userResponse: EmailForgotPasswordResponse = await userForgotPasswordImpl.authenticateEmail(email, deviceInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailForgotPasswordResponse(error);
        }

        return response;
    }
}

export const userForgotPasswordRepositoryImpl = new UserForgotPasswordRepositoryImpl();
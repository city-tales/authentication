import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { DecryptedAuthTokenType } from "../../utils/types.js";
import { ContextType, EmailVerificationLabelType } from "../types/logger.js";
import { EmailVerificationResponse } from "../types/response.js";
import { userEmailVerificationImpl } from "../models/user_email_verification.js";

interface UserEmailVerificationRepositories {
    verifyEmail(decryptedAuthToken: DecryptedAuthTokenType, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse>
}

class UserEmailVerificationRepositoriesImpl implements UserEmailVerificationRepositories {
    async verifyEmail(decryptedAuthToken: DecryptedAuthTokenType, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };

        const userInfoFromData = {
            email: Helper.sanitiseStringValue(decryptedAuthToken.email)
        };

        const redisKey: string = Helper.serialiseRedisKeyValues(
            Helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.VERIFICATION, userInfoFromData)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (Helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = Helper.parseRedisValueToObject(Helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                const isEmailVerified: boolean = Helper.convertToType<boolean>(deSerialisedObject.isEmailVerified, Constants.TYPE_SWITCH.BOOLEAN);

                if (isEmailVerified) {
                    response.success = true;
                    response.message = Constants.LOGIN_MESSAGE.ALREADY_VERIFIED;
                    response.statusCode = Constants.STATUS_CODES.OK;

                    loggerDefaultParams = Helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
                    logPayload = { ...logPayload, ...loggerDefaultParams };
                    logPayload = { ...logPayload, ...{ redisKey: redisKey } };
                    logPayload = Helper.logResponse(logPayload, response);
                    logger.info({ ...logPayload });

                    return response;
                }
            }

            const userResponse: EmailVerificationResponse = await userEmailVerificationImpl.verifyEmail(decryptedAuthToken, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...decryptedAuthToken };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userEmailVerificationRepositoriesImpl = new UserEmailVerificationRepositoriesImpl();
import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { DecryptedAuthTokenInterface, RedisEmailKeySerialisation } from "../../utils/interface.js";
import { ContextInterface, EmailVerificationLabelInterface } from "../interface/logger.js";
import { EmailVerificationResponse } from "../interface/response.js";
import { userEmailVerificationImpl } from "../models/user_email_verification.js";

interface UserEmailVerificationRepositories {
    verifyEmail(decryptedAuthToken: DecryptedAuthTokenInterface, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse>
}

class UserEmailVerificationRepositoriesImpl implements UserEmailVerificationRepositories {
    async verifyEmail(decryptedAuthToken: DecryptedAuthTokenInterface, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};

        const userInfoFromData: RedisEmailKeySerialisation = {
            email: helper.sanitiseStringValue(decryptedAuthToken.email)
        };

        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.VERIFICATION, userInfoFromData)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if(helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));
                const isEmailVerified: boolean = helper.convertToType<boolean>(deSerialisedObject.isEmailVerified, Constants.TYPE_SWITCH.BOOLEAN);

                if(isEmailVerified) {
                    response.success = true;
                    response.message = Constants.LOGIN_MESSAGE.ALREADY_VERIFIED;
                    response.statusCode = Constants.STATUS_CODES.OK;

                    loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
                    logger.info({
                        labels,
                        ...loggerDefaultParams,
                        request: {
                            redisKey: redisKey,
                        },
                        response,
                    });

                    return response;
                }
            }

            const userResponse: EmailVerificationResponse = await userEmailVerificationImpl.verifyEmail(decryptedAuthToken, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logger.error({
                labels,
                ...loggerDefaultParams,
                decryptedAuthToken,
                error,
            });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userEmailVerificationRepositoriesImpl = new UserEmailVerificationRepositoriesImpl();
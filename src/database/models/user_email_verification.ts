import { logger } from "../../config/loki.js";
import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { DecryptedAuthTokenType, RedisEmailKeySerialisation } from "../../utils/types.js";
import { queueEmployee } from "../../utils/workers.js";
import { ContextType, EmailVerificationLabelType } from "../types/logger.js";
import { EmailVerificationResponse } from "../types/response.js";

interface UserEmailVerification {
    verifyEmail(decryptedAuthToken: DecryptedAuthTokenType, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse>;
}

class UserEmailVerificationImpl implements UserEmailVerification {
    async verifyEmail(decryptedAuthToken: DecryptedAuthTokenType, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };

        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT is_email_verified FROM ${authTableName} WHERE user_id = $1`;
        const valuesArray = [decryptedAuthToken._id];

        const userInfoFromData: RedisEmailKeySerialisation = {
            email: helper.sanitiseStringValue(decryptedAuthToken.email)
        };

        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.VERIFICATION, userInfoFromData)
        );
        const existingRedisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoFromData)
        );

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);
            if (!helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const updateQuery = `UPDATE ${authTableName} SET is_email_verified = true WHERE user_id = $1`;

                const updateQueryResponse = await helper.executeQueryAsyncWithoutLock(context, updateQuery, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);
                if (!helper.isUpdateQuerySuccessful(updateQueryResponse.command, updateQueryResponse.rowCount)) throw new Error(Constants.DB_ERRORS.UPDATE_FAILED);

                response.message = Constants.LOGIN_MESSAGE.EMAIL_VERIFIED;
            }
            else {
                response.message = Constants.LOGIN_MESSAGE.ALREADY_VERIFIED;
            }

            const redisEmailValue: Object = {
                _id: decryptedAuthToken._id,
                name: Constants.SIGNUP_MESSAGE.EMPTY,
                username: decryptedAuthToken.username,
                isEmailVerified: true,
            };

            const isKeyInRedis = await cacheDB.get(existingRedisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis, Constants.TYPE_SWITCH.STRING));

                const updatedRedisEmailValue: Object = {
                    _id: deSerialisedObject._id,
                    name: deSerialisedObject.name,
                    username: deSerialisedObject.username,
                    password: deSerialisedObject.password,
                    salt: deSerialisedObject.salt,
                    isEmailVerified: true,
                };

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: existingRedisKey,
                    value: helper.serialiseRedisKeyValues(updatedRedisEmailValue),
                });
            }

            await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                key: redisKey,
                value: helper.serialiseRedisKeyValues(redisEmailValue),
                timeout: Constants.DB_TIMEOUTS.LONG_CACHE_DB_REDIS_TIMEOUT
            });

            response.success = true;
            response.statusCode = Constants.STATUS_CODES.OK;
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.LOGIN_MESSAGE.FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...decryptedAuthToken };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(response);
        }

        return response;
    }
}

export const userEmailVerificationImpl = new UserEmailVerificationImpl();
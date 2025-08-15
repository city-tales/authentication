import { error } from "winston";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/types.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, EmailForgotPasswordLabelType } from "../types/logger.js";
import { EmailForgotPasswordResponse } from "../types/response.js";
import { logger } from "../../config/loki.js";
import { queueEmployee } from "../../utils/workers.js";

interface UserForgotPassword {
    authenticateEmail(
        email: string,
        deviceInfo: DeviceType,
        context: ContextType,
        labels: EmailForgotPasswordLabelType,
    ): Promise<EmailForgotPasswordResponse>;
}

class UserForgotPasswordImpl implements UserForgotPassword {
    async authenticateEmail(
        email: string,
        deviceInfo: DeviceType,
        context: ContextType,
        labels: EmailForgotPasswordLabelType,
    ): Promise<EmailForgotPasswordResponse> {
        let response = new EmailForgotPasswordResponse();

        const userTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT user_data.user_id as _id, user_data.name, user_data.username, auth.password, auth.is_email_verified, auth.is_passwordless, auth.is_google_verified, auth.salt from ${userTableName} user_data
            JOIN ${authTableName} auth ON user_data.user_id = auth.user_id WHERE user_data.email = $1 LIMIT 1`;

        const valuesArray = [email];
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                email,
                deviceInfo,
            },
        };

        try {
            const queryResponse = await Helper.executeQueryAsyncWithoutLock(
                context,
                query,
                valuesArray,
                Constants.DB_ERRORS.READ_FAILURE,
                labels,
            );

            if (
                Helper.isSelectQuerySuccessful(
                    queryResponse.command,
                    queryResponse.rows.length,
                )
            ) {
                const data = queryResponse.rows[0];

                if (Helper.isGenericEitherNullOrUndefined(data))
                    throw new Error(
                        Constants.FORGOT_PASSWORD_MESSAGE.NO_CONTENT,
                    );

                const isEmailVerified =
                    data.is_email_verified ||
                    data.is_passwordless ||
                    data.is_google_verified;
                if (!isEmailVerified)
                    throw new Error(
                        Constants.FORGOT_PASSWORD_MESSAGE.NOT_VERIFIED,
                    );

                const userInfoFromData: RedisEmailKeySerialisation = {
                    email: Helper.sanitiseStringValue(email),
                };
                const redisKey: string = Helper.serialiseRedisKeyValues(
                    Helper.prepareUserRedisKeyValues(
                        Constants.SERIALISATION_KEYS.USER,
                        userInfoFromData,
                    ),
                );
                const redisEmailValue: Object = {
                    _id: data._id,
                    name: data.name,
                    username: data.username,
                    password: data.password,
                    salt: data.salt,
                    isEmailVerified: isEmailVerified,
                };

                response.message = Constants.FORGOT_PASSWORD_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.token = Helper.generateUserAuthToken(
                    data._id,
                    data.username,
                    email,
                    labels.operation,
                    isEmailVerified,
                );
                response.name = data.name;

                await queueEmployee.addJobToQueue(
                    context,
                    labels,
                    Constants.DB.SAVE_IN_REDIS,
                    {
                        key: redisKey,
                        value: Helper.serialiseRedisKeyValues(redisEmailValue),
                    },
                );
            } else {
                response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
                response.message =
                    Constants.FORGOT_PASSWORD_MESSAGE.EMAIL_DO_NOT_EXISTS;
            }
        } catch (error) {
            response.message = Helper.isNeitherNullNorUndefinedNorEmpty(
                error.message,
            )
                ? error.message
                : Constants.LOGIN_MESSAGE.FAILED;

            loggerDefaultParams = Helper.generateDefaultFailureParams(
                context.tracerId,
                Constants.LOKI_LOGGER_LABELS.MODELS,
            );
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailForgotPasswordResponse(response);
        }

        return response;
    }
}

export const userForgotPasswordImpl = new UserForgotPasswordImpl();

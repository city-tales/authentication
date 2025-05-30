import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/types.js";
import { utils } from "../../utils/utils.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, EmailLoginLabelType } from "../types/logger.js";
import { LoginResponse } from "../types/response.js";
import { UserLoginType } from "../types/user_login.js";

interface UserLogin {
    loginUser(userInfo: UserLoginType, deviceInfo: DeviceType, context: ContextType, labels: EmailLoginLabelType): Promise<LoginResponse>;
}

class UserLoginImpl implements UserLogin {
    async loginUser(userInfo: UserLoginType, deviceInfo: DeviceType, context: ContextType, labels: EmailLoginLabelType): Promise<LoginResponse> {
        let response = new LoginResponse();

        const userTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT user_data.user_id as _id, user_data.name, user_data.username, user_data.primary_country_code, user_data.phone_number, 
                        auth.password, auth.is_email_verified, auth.is_passwordless, auth.is_google_verified, auth.salt from ${userTableName} user_data
                        JOIN ${authTableName} auth ON user_data.user_id = auth.user_id
                        WHERE user_data.email = $1 LIMIT 1`;

        const valuesArray = [userInfo.email];
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceInfo,
            },
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];

                const userInfoFromData: RedisEmailKeySerialisation = {
                    email: helper.sanitiseStringValue(userInfo.email),
                };
                const redisKey: string = helper.serialiseRedisKeyValues(
                    helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoFromData)
                );
                const redisEmailValue: Object = {
                    _id: data._id,
                    name: data.name,
                    username: data.username,
                    password: data.password,
                    salt: data.salt,
                    isEmailVerified: data.is_email_verified || data.is_passwordless || data.is_google_verified,
                };

                response.name = data.name;
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.retryVerification = !(data.is_email_verified || data.is_passwordless || data.is_google_verified);
                response.token = helper.generateUserAuthToken(data._id, data.username, userInfo.email, labels.operation, !response.retryVerification);

                if(helper.verifyPassword(userInfo.password, data.password, data.salt)) {
                    if(data.is_email_verified || data.is_passwordless || data.is_google_verified) {
                        deviceInfo.user_id = data._id;
                        
                        await utils.logUserDevice(deviceInfo, context, labels);
                    }
                    else {
                        response.message = Constants.LOGIN_MESSAGE.NOT_VERIFIED;
                    }

                    await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                        key: redisKey,
                        value: helper.serialiseRedisKeyValues(redisEmailValue)
                    }); 
                }
                else {
                    response.name = Constants.LOGIN_MESSAGE.EMPTY;
                    response.message = Constants.LOGIN_MESSAGE.WRONG_AUTHENTICATION;
                    response.token = Constants.LOGIN_MESSAGE.EMPTY_TOKEN;
                }
            }
            else {
                response.message = Constants.LOGIN_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.retryVerification = false;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.LOGIN_MESSAGE.FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(response);
        }

        return response;
    }
}

export const userLoginImpl = new UserLoginImpl();
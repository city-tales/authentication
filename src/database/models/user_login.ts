import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, EmailLoginLabelInterface } from "../interface/logger.js";
import { LoginResponse } from "../interface/response.js";
import { UserLoginInterface } from "../interface/user_login.js";

interface UserLogin {
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
}

class UserLoginImpl implements UserLogin {
    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
        let response = new LoginResponse();

        const userTableName = Constants.TABLES.USER_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const query = `SELECT users._id, users.name, users.username, users.primary_country_code, users.phone_number, users.password, auth.is_email_verified, auth.salt from ${userTableName} 
                        JOIN ${authTableName} ON users._id = auth.user_id
                        WHERE users.email = $1 AND users.password = $2 LIMIT 1`;

        const valuesArray = Object.values(userInfo);
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

                const deviceTableName = Constants.TABLES.DEVICE_TABLE;
                const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
                const deviceValuesArray = Object.values(deviceInfo);

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
                    isEmailVerified: data.is_email_verified,
                };

                deviceInfo.user_id = data._id;

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_DB, {
                    query: deviceDataQuery,
                    valuesArray: deviceValuesArray,
                    errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
                });

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_REDIS, {
                    key: redisKey,
                    value: helper.serialiseRedisKeyValues(redisEmailValue)
                });

                response.name = data.name;
                response.token = helper.generateAuthToken(data._id, data.username, userInfo.email);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.retryVerification = !data.is_email_verified;
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
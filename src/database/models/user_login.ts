import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { LoginError } from "../../utils/errors.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { saveInDBQueueEmployee, saveInRedisQueueEmployee } from "../../utils/queue.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface } from "../interface/helper.js";
import { LoginSuccessResponse } from "../interface/response.js";
import { UserLoginInterface } from "../interface/user_login.js";

interface UserLogin {
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse>;
}

class UserLoginImpl implements UserLogin {
    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse> {
        const response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };

        const tableName = Constants.AUTH_TABLES.USER_TABLE;
        const query = `SELECT _id, username, email, primary_country_code, phone_number from ${tableName} WHERE 
            email = $1 AND password = $2 LIMIT 1`;
        const valuesArray = Object.values(userInfo);
        let loggerDefaultParams = {};

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST, Constants.LOKI_LOGGER_LABELS.EMAIL);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];

                const deviceTableName = Constants.AUTH_TABLES.DEVICE_TABLE;
                const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
                const deviceValuesArray = Object.values(deviceInfo);

                const userInfoFromData: RedisEmailKeySerialisation = {
                    email: helper.sanitiseStringValue(data.email)
                };

                const redisKey: string = helper.serialiseRedisKeyValues(
                    helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoFromData)
                );

                const redisEmailValue = helper.serialiseRedisKeyValues(
                    helper.convertToType<Object>({
                        _id: data._id,
                        username: data.username,
                    })
                );
                deviceInfo.user_id = data._id;

                await queueEmployee.addJobToQueue(context, Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST, Constants.LOKI_LOGGER_LABELS.EMAIL, saveInDBQueueEmployee, Constants.DB.SAVE_IN_DB, [deviceDataQuery, deviceValuesArray, Constants.DB_ERRORS.INSERTION_FAILED]);
                await queueEmployee.addJobToQueue(context, Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST, Constants.LOKI_LOGGER_LABELS.EMAIL, saveInRedisQueueEmployee, Constants.DB.SAVE_IN_REDIS, [redisKey, helper.serialiseRedisKeyValues(redisEmailValue)]);

                response.token = helper.generateAuthToken(data._id, data.username);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.verified = true; // to be fetched from auth table
                response.statusCode = Constants.STATUS_CODES.OK;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.LOGIN_MESSAGE.FAILED;
            response.statusCode = Constants.STATUS_CODES.SERVICE_UNAVAILABLE;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logger.error(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
                labels: {
                    operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                    type: Constants.LOKI_LOGGER_LABELS.EMAIL,
                },
                loggerDefaultParams,
                request: {
                    userInfo,
                    deviceInfo,
                },
                error,
            });

            throw new LoginError(
                helper.convertToClassType<LoginError>(response, LoginError)
            );
        }

        return response;
    }
}

export const userLoginImpl = new UserLoginImpl();
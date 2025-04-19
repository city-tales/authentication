import { Constants } from "../../utils/constants.js";
import { LoginError } from "../../utils/errors.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { LoginSuccessResponse } from "../interface/response.js";


interface UserLogin {
    loginUser(columns, values) : Promise<LoginSuccessResponse>;
}

class UserLoginImpl implements UserLogin {
    async loginUser(columns, values) : Promise<LoginSuccessResponse> {
        const response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };

        const userInfoFromData : RedisEmailKeySerialisation = {
            email: Constants.SERIALISATION_KEYS.EMAIL,
        }

        const redisEmailValue = {
            _id: null,
            username: null,
        };

        const tableName = Constants.USER_TABLE;
        const query = `SELECT _id, username, email, primary_country_code, phone_number from ${tableName} WHERE (${columns}) = (${values})`;

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(query);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];
                
                userInfoFromData.email = helper.sanitiseStringValue(data.email);
                
                redisEmailValue._id = data._id;
                redisEmailValue.username = data.username;

                response.token = helper.generateAuthToken(data._id, data.username);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.verified = true; // to be fetched from auth table
                response.statusCode = Constants.STATUS_CODES.OK;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.LOGIN_MESSAGE.FAILED;
            response.statusCode = Constants.STATUS_CODES.SERVICE_UNAVAILABLE;
        }

        try {
            const redisKey : string = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoFromData)
            );

            if(response.message === Constants.LOGIN_MESSAGE.SUCCESS) {
                await helper.setRedis(redisKey, 
                    helper.serialiseRedisKeyValues(
                        helper.convertToType<Object>(redisEmailValue)
                    )
                );
            }
        }
        catch (error) { 
            if(response.message === Constants.LOGIN_MESSAGE.SUCCESS) 
                response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;

            throw new LoginError(
                helper.convertToClassType<LoginError>(response, LoginError)
            );
        }

        return response;
    }
}

export const userLoginImpl = new UserLoginImpl();
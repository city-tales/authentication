import { cacheDB } from "../../config/redis.js";
import { Constants } from "../../utils/constants.js";
import { LoginError } from "../../utils/errors.js";
import { helper } from "../../utils/helper.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";
import { DeviceInterface } from "../interface/device_info.js";
import { LoginSuccessResponse } from "../interface/response.js";
import { UserLoginInterface } from "../interface/user_login.js";
import { userLoginImpl } from "../models/user_login.js";

interface UserLoginRepository {
    checkUserInRedis(email: string);
    loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface): Promise<LoginSuccessResponse>;
}

class UserLoginRepositoryImpl implements UserLoginRepository {
    async checkUserInRedis(email: string) {
        let response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.SERVICE_UNAVAILABLE,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };

        const userInfoForRedisKey: RedisEmailKeySerialisation = {
            email: email,
        };

        const redisKey: string = helper.serialiseRedisKeyValues(
            helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
        );

        try {
            const isKeyInRedis = await cacheDB.get(redisKey);
            if (helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis)) {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis));

                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username);
                response.message = Constants.LOGIN_MESSAGE.SUCCESS;
                response.statusCode = Constants.STATUS_CODES.OK;
                response.verified = true; /* YET TO IMPLEMENT */
                response.retryVerification = true; /* YET TO IMPLEMENT */
            }
            else {
                response.message = Constants.REDIS_MESSAGE.NO_CONTENT;
                response.statusCode = Constants.STATUS_CODES.NOT_FOUND;
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;
            response.statusCode = Constants.STATUS_CODES.SERVICE_UNAVAILABLE;

            throw new LoginError(
                helper.convertToClassType<LoginError>(response, LoginError)
            );
        }

        return response;
    }

    async loginUser(userInfo: UserLoginInterface, deviceInfo: DeviceInterface): Promise<LoginSuccessResponse> {
        let response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };

        try {
            const userResponse = await userLoginImpl.loginUser(userInfo, deviceInfo);
            response = userResponse;
        }
        catch (error) {
            throw new LoginError(error);
        }

        return response;
    }
}

export const userLoginRepositoryImpl = new UserLoginRepositoryImpl();
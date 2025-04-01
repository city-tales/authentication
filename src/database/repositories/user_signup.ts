import { UserSignUpInterface } from "../interface/user_signup.js";
import { userSignUpImpl } from "../models/user_signup.js";
import { SignUpSuccessResponse } from "../interface/response.js";
import { DeviceInterface } from "../interface/device_info.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { RedisError, SignUpError } from "../../utils/errors.js";
import { client } from "../../config/redis.js";
import { RedisEmailKeySerialisation } from "../../utils/interface.js";

interface UserSignUpRepository {
    checkIfUserExists(userInfo: UserSignUpInterface) : Promise<SignUpSuccessResponse>;
    createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface) : Promise<SignUpSuccessResponse>;
}

class UserSignUpRepositoryImpl implements UserSignUpRepository {
    async checkIfUserExists(userInfo: UserSignUpInterface) : Promise<SignUpSuccessResponse> {
        let response: SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.SERVICE_UNAVAILABLE,
        };

        const userInfoForRedisKey : RedisEmailKeySerialisation = {
            email: userInfo.email,
        };

        try {
            const redisKey: string = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );
            const isKeyInRedis = await client.get(redisKey);

            if(helper.isEitherNullOrUndefined(isKeyInRedis)) { 
                const userInfoForCheckingExistingUser = {
                    email: helper.passStringNullParams(userInfo.email),
                    primary_country_code: helper.passStringNullParams(userInfo.primary_country_code),
                    phone_number: helper.passStringNullParams(userInfo.phone_number),
                };
                const columns = helper.createQueryColumn(userInfoForCheckingExistingUser);

                try {
                    const userResponse = await userSignUpImpl.checkIfUserExists(columns, userInfoForCheckingExistingUser, userInfo);
                    response = userResponse;
                }
                catch(error) {
                    throw new SignUpError(error);
                }
            }
        }
        catch(error) {
            throw new RedisError(error);
        }

        return response;
    }

    async createUser(userInfo: UserSignUpInterface, deviceInfo: DeviceInterface) : Promise<SignUpSuccessResponse> {
        let response: SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };

        const userInfoForRedisKey : RedisEmailKeySerialisation = {
            email: userInfo.email,
        };

        try {
            const columns = helper.createQueryColumn(userInfo);
            const values = helper.createQueryValues(userInfo);

            const redisKey = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfoForRedisKey)
            );

            const userResponse = await userSignUpImpl.createUser(columns, values, userInfo, redisKey);
            response = userResponse;
        }
        catch (error) {
            throw new SignUpError(error);
        }

        return response;
    }
}

export const userSignUp = new UserSignUpRepositoryImpl();


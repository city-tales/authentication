import { Users } from "../interface/user_signup.js";
import { user } from "../models/user_signup.js";
import { SignUpSuccess } from "../interface/response.js";
import { Device } from "../interface/device_info.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { RedisError, SignUpError } from "../../utils/errors.js";
import { client } from "../../config/redis.js";

interface UserSignUp {
    checkIfUserExists(userInfo: Users) : Promise<SignUpSuccess>;
    createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpSuccess>;
}

class UserSignUpImpl implements UserSignUp {
    async checkIfUserExists(userInfo: Users) : Promise<SignUpSuccess> {
        let response: SignUpSuccess = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };

        try {
            const redisKey = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfo)
            );
            const isKeyInRedis = await client.get(redisKey);

            if(!helper.parseBooleanString(isKeyInRedis)) {
                const userInfoForCheckingExistingUser = {
                    email: helper.passStringNullParams(userInfo.email),
                    primary_country_code: helper.passStringNullParams(userInfo.primary_country_code),
                    phone_number: helper.passStringNullParams(userInfo.phone_number),
                };
                const columns = helper.createQueryColumn(userInfoForCheckingExistingUser);

                try {
                    const userResponse = await user.checkIfUserExists(columns, userInfoForCheckingExistingUser, userInfo);
                    response = userResponse;
                }
                catch(error) {
                    throw new SignUpError(error);
                }
            }
            else {
                const deSerialisedObject = helper.parseRedisValueToObject(helper.convertToType<string>(isKeyInRedis));

                response.token = helper.generateAuthToken(deSerialisedObject._id, deSerialisedObject.username);
                response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                response.statusCode = Constants.STATUS_CODES.OK;
            }
        }
        catch(error) {
            throw new RedisError(error);
        }

        return response;
    }

    async createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpSuccess> {
        let response: SignUpSuccess = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };

        try {
            const columns = helper.createQueryColumn(userInfo);
            const values = helper.createQueryValues(userInfo);

            const redisKey = helper.serialiseRedisKeyValues(
                helper.prepareUserRedisKeyValues(Constants.SERIALISATION_KEYS.USER, userInfo)
            );

            const userResponse = await user.createUser(columns, values, userInfo, redisKey);
            await helper.generateAuthToken(userInfo._id, userInfo.username);
            response = userResponse;
        }
        catch (error) {
            throw new SignUpError(error);
        }

        return response;
    }
}

export const userSignUp = new UserSignUpImpl();


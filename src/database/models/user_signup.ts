import { SignUpSuccessResponse } from "../interface/response.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { SignUpError } from "../../utils/errors.js";
import { UserSignUpInterface } from "../interface/user_signup.js";

interface UserSignUp {
    checkIfUserExists(columns, values, userInfo: UserSignUpInterface) : Promise<SignUpSuccessResponse>;
    createUser(columns, values, userInfo: UserSignUpInterface, redisKey: string) : Promise<SignUpSuccessResponse>;
}

class UserSignUpImpl implements UserSignUp {
    async checkIfUserExists(columns, values, userInfo: UserSignUpInterface) : Promise<SignUpSuccessResponse> {
        const tableName = Constants.USER_TABLE;
        const query = `SELECT (${columns}) FROM ${tableName} WHERE 
            (email = '${values.email}' OR '${values.email}' IS NULL) AND
            (primary_country_code = '${values.primary_country_code}' OR '${values.primary_country_code}' IS NULL) AND
            (phone_number = '${values.phone_number}' OR '${values.phone_number}' IS NULL) 
        `;

        const response : SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.SERVICE_UNAVAILABLE,
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(query, Constants.DB_ERRORS.READ_FAILURE);

            if(helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.fields.length)) {
                if(!queryResponse.rowCount) response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                else response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                
                response.statusCode = Constants.STATUS_CODES.OK;
            }
        }
        catch(error) {
            response.message = !helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.READ_FAILURE;
            response.statusCode = Constants.STATUS_CODES.BAD_GATEWAY;

            throw new SignUpError(helper.convertToClassType(response, SignUpError));
        }

        return response;
    }

    async createUser(columns, values, userInfo: UserSignUpInterface, redisKey: string) : Promise<SignUpSuccessResponse> {
        const tableName = Constants.USER_TABLE;
        const query = `INSERT INTO ${tableName}(${columns}) VALUES (${values})`;

        const response : SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(query, Constants.DB_ERRORS.INSERTION_FAILED);
            
            if(helper.isInsertQuerySuccessful(queryResponse.command, queryResponse.rowCount)) {
                response.token = helper.generateAuthToken(userInfo._id, userInfo.username);
                response.message = Constants.SIGNUP_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;
            }
        }
        catch(error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.INSERTION_FAILED;
            response.statusCode = Constants.STATUS_CODES.METHOD_NOT_ALLOWED;
        }

        try {
            if(response.message === Constants.SIGNUP_MESSAGE.CREATED) {
                const redisEmailValue : Object = {
                    _id: userInfo._id,
                    username: userInfo.username
                };

                await helper.setRedis(redisKey, helper.serialiseRedisKeyValues(redisEmailValue));
            }
        }
        catch (error) {
            if(response.message === Constants.SIGNUP_MESSAGE.CREATED) 
                response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;

            throw new SignUpError(helper.convertToClassType({...response}, SignUpError));
        }

        return response;
    }
}

export const userSignUpImpl = new UserSignUpImpl();
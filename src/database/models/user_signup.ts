import { SignUpSuccess } from "../interface/response.js";
import { helper } from "../../utils/helper.js";
import { Constants } from "../../utils/constants.js";
import { SignUpError } from "../../utils/errors.js";
import { Users } from "../interface/user_signup.js";

interface User {
    checkIfUserExists(columns, values, userInfo: Users) : Promise<SignUpSuccess>;
    createUser(columns, values, userInfo: Users, redisKey: string) : Promise<SignUpSuccess>;
}

class UserImpl implements User {
    async checkIfUserExists(columns, values, userInfo: Users) : Promise<SignUpSuccess> {
        const tableName = Constants.USER_TABLE;
        const query = `SELECT (${columns}) FROM ${tableName} WHERE 
            (email = '${values.email}' OR '${values.email}' IS NULL) AND
            (primary_country_code = '${values.primary_country_code}' OR '${values.primary_country_code}' IS NULL) AND
            (phone_number = '${values.phone_number}' OR '${values.phone_number}' IS NULL) 
        `;

        const response : SignUpSuccess = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(query, Constants.DB_ERRORS.READ_FAILURE);

            if(helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.fields.length)) {
                if(!queryResponse.rowCount) response.message = Constants.SIGNUP_MESSAGE.NO_CONTENT;
                else response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                
                response.statusCode = Constants.STATUS_CODES.ACCEPTED;
            }
        }
        catch(error) {
            response.message = !helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.DB_ERRORS.READ_FAILURE;
            response.statusCode = Constants.STATUS_CODES.BAD_GATEWAY;

            throw new SignUpError(helper.convertToClassType(response, SignUpError));
        }

        return response;
    }

    async createUser(columns, values, userInfo: Users, redisKey: string) : Promise<SignUpSuccess> {
        const tableName = Constants.USER_TABLE;
        const query = `INSERT INTO ${tableName}(${columns}) VALUES (${values})`;

        const response : SignUpSuccess = {
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
            if(response.message === Constants.SIGNUP_MESSAGE.CREATED) 
                await helper.setRedis(redisKey, Constants.BOOLEAN_VALUES.TRUE);
        }
        catch (error) {
            if(response.message === Constants.SIGNUP_MESSAGE.CREATED) 
                response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.REDIS_MESSAGE.FAILED;

            throw new SignUpError(helper.convertToClassType({...response}, SignUpError));
        }

        return response;
    }
}

export const user = new UserImpl();
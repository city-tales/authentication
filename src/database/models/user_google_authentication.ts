import { uuidv4 } from "../../config/imports.js";
import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { MultipleQueryObject } from "../../utils/custom_types.js";
import { helper } from "../../utils/helper.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, GoogleAuthenticationLabelInterface } from "../interface/logger.js";
import { GoogleAuthenticationResponse } from "../interface/response.js";
import { GoogleAuthenticationInterface } from "../interface/user_google_authentication.js";

interface UserGoogleAuthentication {
    checkIfUserExists(email: string, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse>;
    authenticateUser(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse>
}

class UserGoogleAuthenticationImpl implements UserGoogleAuthentication {
    async checkIfUserExists(email: string, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        const userDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;
        const deviceTableName = Constants.TABLES.DEVICE_TABLE;

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            email: email,
        };

        const query = `SELECT _user.user_id as _id, _user.username as username, google_email as email FROM ${authTableName} as auth
        LEFT JOIN ${userDataTableName} as _user ON auth.user_id = _user.user_id WHERE auth.google_email = $1 LIMIT 1`;
        const valuesArray = [ email ];

        const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;

        try {
            const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];

                deviceInfo.user_id = data._id;
                const deviceValuesArray = Object.values(deviceInfo);

                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_DB, {
                    query: deviceDataQuery,
                    valuesArray: deviceValuesArray,
                    errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
                });

                response.statusCode = Constants.STATUS_CODES.OK;
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.EXISTING_USER;
                response.token = helper.generateUserAuthToken(data._id, data.username, data.email, labels.operation);
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUser(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        const _id = uuidv4();
        deviceInfo.user_id = _id;

        const userTableName = Constants.TABLES.USER_TABLE;
        const userDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const deviceTableName = Constants.TABLES.DEVICE_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const userQuery = `INSERT INTO ${userTableName} VALUES ($1)`;
        const usersValuesArray = [ _id ];

        const userDataQuery = `INSERT INTO ${userDataTableName} (_id, email, name, username, profile_picture, user_id) VALUES ($1, $2, $3, $4, $5, $6)`;
        const userDeviceValuesArray = [...Object.values(userInfo), _id];

        const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`;
        const deviceValuesArray = Object.values(deviceInfo);
        
        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
        const authValuesArray = Object.values(helper.createAuthSchema(_id, userInfo.email));

        const usersAuthDataQuery: MultipleQueryObject = [
            {
                query: userQuery,
                valuesArray: usersValuesArray
            },
            {
                query: userDataQuery,
                valuesArray: userDeviceValuesArray
            },
            {
                query: authDataQuery,
                valuesArray: authValuesArray
            }
        ];

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            ...usersAuthDataQuery,
        };

        try {
            const queryResponse = await helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);

            if (queryResponse.length === usersAuthDataQuery.length) {
                response.token = helper.generateUserAuthToken(_id, userInfo.username, userInfo.email, labels.operation);
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;
            
                await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_DB, {
                    query: deviceDataQuery,
                    valuesArray: deviceValuesArray,
                    errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
                });
            }
            else {
                response.statusCode = Constants.STATUS_CODES.CONFLICT;
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.FAILED;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const userAuthenticationImpl = new UserGoogleAuthenticationImpl();
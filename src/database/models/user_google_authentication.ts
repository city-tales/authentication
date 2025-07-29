import { uuidv4 } from "../../config/imports.js";
import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { MultipleQueryObject } from "../../utils/types.js";
import { utils } from "../../utils/utils.js";
import { queueEmployee } from "../../utils/workers.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, GoogleAuthenticationLabelType } from "../types/logger.js";
import { GoogleAuthenticationResponse } from "../types/response.js";
import { GoogleAuthenticationAuthType, GoogleAuthenticationDataType, GoogleAuthenticationType } from "../types/user_google_authentication.js";

interface UserGoogleAuthentication {
    checkIfUserExists(email: string, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse>;
    authenticateUser(userInfo: GoogleAuthenticationType, userDataInfo: GoogleAuthenticationDataType, authenticationInfo: GoogleAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse>
}

class UserGoogleAuthenticationImpl implements UserGoogleAuthentication {
    async checkIfUserExists(email: string, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        const userDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            email: email,
        };

        const query = `SELECT auth._id as row_id, _user.user_id as _id, _user.username as username, _user.email as email, auth.is_google_verified FROM ${authTableName} as auth
            LEFT JOIN ${userDataTableName} as _user ON auth.user_id = _user.user_id WHERE _user.email = $1 LIMIT 1`;
        const valuesArray = [ email ];

        try {
            const queryResponse = await Helper.executeQueryAsyncWithoutLock(context, query, valuesArray, Constants.DB_ERRORS.READ_FAILURE, labels);

            if (Helper.isSelectQuerySuccessful(queryResponse.command, queryResponse.rows.length)) {
                const data = queryResponse.rows[0];
                deviceInfo.user_id = data._id;

                await utils.logUserDevice(deviceInfo, context, labels);

                if(!data.is_google_verified) {
                    const query = `UPDATE ${authTableName} SET is_google_verified = true, updated_at = ${Helper.formatDateTimeString()} WHERE _id = $1`;
                    const valuesArray = [data.row_id];

                    await queueEmployee.addJobToQueue(context, labels, Constants.DB.UPDATE_IN_DB, {
                        query: query,
                        valuesArray: valuesArray,
                        errorMessage: Constants.DB_ERRORS.UPDATE_FAILED,
                    }, Constants.QUEUE_DB.LOW_ATTEMPT
                )};

                response.statusCode = Constants.STATUS_CODES.OK;
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.EXISTING_USER;
                response.token = Helper.generateUserAuthToken(data._id, data.username, data.email, labels.operation, true);
            }
            else {
                response.statusCode = Constants.STATUS_CODES.OK;
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.NO_CONTENT;
            }
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUser(userInfo: GoogleAuthenticationType, userDataInfo: GoogleAuthenticationDataType, authenticationInfo: GoogleAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();

        const userTableName = Constants.TABLES.USER_TABLE;
        const userDataTableName = Constants.TABLES.USER_DATA_TABLE;
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const userQuery = `INSERT INTO ${userTableName} VALUES ($1)`;
        const usersValuesArray = Object.values(userInfo);

        const userDataQuery = `INSERT INTO ${userDataTableName} (_id, email, name, username, profile_picture, user_id) VALUES ($1, $2, $3, $4, $5, $6)`;
        const userDeviceValuesArray = Object.values(userDataInfo);
        
        const authDataQuery = `INSERT INTO ${authTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`;
        const authValuesArray = Object.values(authenticationInfo);

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
            const queryResponse = await Helper.executeMultipleQueryAsyncWithoutLock(context, usersAuthDataQuery, Constants.DB_ERRORS.INSERTION_FAILED, labels);

            if (queryResponse.length === usersAuthDataQuery.length) {
                response.token = Helper.generateUserAuthToken(userInfo._id, userDataInfo.username, userDataInfo.email, labels.operation, true);
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.CREATED;
                response.statusCode = Constants.STATUS_CODES.CREATED;

                await utils.logUserDevice(deviceInfo, context, labels);
            }
            else {
                response.statusCode = Constants.STATUS_CODES.CONFLICT;
                response.message = Constants.GOOGLE_AUTHENTICATION_MESSAGE.FAILED;
            }
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const userAuthenticationImpl = new UserGoogleAuthenticationImpl();
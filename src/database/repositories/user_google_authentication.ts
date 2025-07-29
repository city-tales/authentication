import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";
import { DeviceType } from "../types/device_info.js";
import { ContextType, GoogleAuthenticationLabelType } from "../types/logger.js";
import { GoogleAuthenticationResponse } from "../types/response.js";
import { GoogleAuthenticationAuthType, GoogleAuthenticationDataType, GoogleAuthenticationType } from "../types/user_google_authentication.js";
import { userAuthenticationImpl } from "../models/user_google_authentication.js";

interface UserGoogleAuthenticationRepositories {
    checkIfUserExists(userInfo: GoogleAuthenticationDataType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse>;
    authenticateUser(userInfo: GoogleAuthenticationType, userDataInfo: GoogleAuthenticationDataType, authenticationInfo: GoogleAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse>;
}

class UserGoogleAuthenticationRepositoriesImpl implements UserGoogleAuthenticationRepositories {
    async checkIfUserExists(userInfo: GoogleAuthenticationDataType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
            },
        };

        const email = userInfo.email;
        try {
            const userResponse: GoogleAuthenticationResponse = await userAuthenticationImpl.checkIfUserExists(email, deviceInfo, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUser(userInfo: GoogleAuthenticationType, userDataInfo: GoogleAuthenticationDataType, authenticationInfo: GoogleAuthenticationAuthType, deviceInfo: DeviceType, context: ContextType, labels: GoogleAuthenticationLabelType): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userDataInfo,
                deviceInfo,
            },
        };
        
        try {
            const checkIfUserExists: GoogleAuthenticationResponse = await this.checkIfUserExists(userDataInfo, deviceInfo, context, labels);
            if(checkIfUserExists.message === Constants.GOOGLE_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                response = checkIfUserExists;
            }   
            else {
                const userResponse: GoogleAuthenticationResponse = await userAuthenticationImpl.authenticateUser(userInfo, userDataInfo, authenticationInfo, deviceInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const userGoogleAuthenticationRepositories = new UserGoogleAuthenticationRepositoriesImpl();
import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { DeviceInterface } from "../interface/device_info.js";
import { ContextInterface, GoogleAuthenticationLabelInterface } from "../interface/logger.js";
import { GoogleAuthenticationResponse } from "../interface/response.js";
import { GoogleAuthenticationInterface } from "../interface/user_google_authentication.js";
import { userAuthenticationImpl } from "../models/user_google_authentication.js";

interface UserGoogleAuthenticationRepositories {
    checkIfUserExists(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse>;
    authenticateUser(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse>
}

class UserGoogleAuthenticationRepositoriesImpl implements UserGoogleAuthenticationRepositories {
    async checkIfUserExists(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse> {
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
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }

    async authenticateUser(userInfo: GoogleAuthenticationInterface, deviceInfo: DeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse> {
        let response = new GoogleAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceInfo,
            },
        };
        
        try {
            const checkIfUserExists: GoogleAuthenticationResponse = await this.checkIfUserExists(userInfo, deviceInfo, context, labels);
            if(checkIfUserExists.message === Constants.GOOGLE_AUTHENTICATION_MESSAGE.EXISTING_USER) {
                response = checkIfUserExists;
            }   
            else {
                const userResponse: GoogleAuthenticationResponse = await userAuthenticationImpl.authenticateUser(userInfo, deviceInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const userGoogleAuthenticationRepositories = new UserGoogleAuthenticationRepositoriesImpl();
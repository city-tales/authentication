import { uuidv4 } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import {
    ContextType,
    GoogleAuthenticationLabelType,
} from "../database/types/logger.js";
import { GoogleAuthenticationResponse } from "../database/types/response.js";
import {
    GoogleAuthenticationAuthType,
    GoogleAuthenticationDataType,
    GoogleAuthenticationType,
    GPRCGoogleAuthenticationAuthSchemaType,
} from "../database/types/user_google_authentication.js";
import { userGoogleAuthenticationRepositories } from "../database/repositories/user_google_authentication.js";
import { Constants } from "../utils/constants.js";
import { Helper } from "../utils/helper.js";

interface GoogleAuthenticationController {
    mapGoogleUserAuthenticationSchema(): GoogleAuthenticationType;
    mapGoogleUserDataAuthenticationSchema(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        userId: string,
    ): GoogleAuthenticationDataType;
    mapGoogleUserAuthDataAuthenticationSchema(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        userId: string,
    ): GoogleAuthenticationAuthType;
    authenticateUser(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: GoogleAuthenticationLabelType,
    ): Promise<GoogleAuthenticationResponse>;
}

class GoogleAuthenticationControllerImpl
    implements GoogleAuthenticationController
{
    mapGoogleUserAuthenticationSchema(): GoogleAuthenticationType {
        return {
            _id: uuidv4(),
        };
    }

    mapGoogleUserDataAuthenticationSchema(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        userId: string,
    ): GoogleAuthenticationDataType {
        return {
            _id: uuidv4(),
            email: userInfo.email,
            name: userInfo.name,
            username: Helper.generateUniqueUserName(userInfo),
            profile_picture: userInfo.profilePicture,
            user_id: userId,
        };
    }

    mapGoogleUserAuthDataAuthenticationSchema(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        userId: string,
    ): GoogleAuthenticationAuthType {
        return {
            _id: uuidv4(),
            is_email_verified: true,
            is_google_verified: true,
            is_passwordless: false,
            is_mfa_enabled: false,
            password: null,
            salt: null,
            user_id: userId,
        };
    }

    async authenticateUser(
        userInfo: GPRCGoogleAuthenticationAuthSchemaType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: GoogleAuthenticationLabelType,
    ): Promise<GoogleAuthenticationResponse> {
        const userAuthenticationSchemaInfo: GoogleAuthenticationType =
            this.mapGoogleUserAuthenticationSchema();
        const userDataAuthenticationSchemaInfo: GoogleAuthenticationDataType =
            this.mapGoogleUserDataAuthenticationSchema(
                userInfo,
                userAuthenticationSchemaInfo._id,
            );
        const userAuthAuthenticationSchemaInfo: GoogleAuthenticationAuthType =
            this.mapGoogleUserAuthDataAuthenticationSchema(
                userInfo,
                userAuthenticationSchemaInfo._id,
            );
        const deviceLoginSchemaInfo: DeviceType = Helper.mapDeviceSchema(
            deviceInfo,
            userAuthenticationSchemaInfo._id,
        );

        let response = new GoogleAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userDataAuthenticationSchemaInfo,
                deviceLoginSchemaInfo,
            },
        };

        try {
            const userResponse =
                await userGoogleAuthenticationRepositories.authenticateUser(
                    userAuthenticationSchemaInfo,
                    userDataAuthenticationSchemaInfo,
                    userAuthAuthenticationSchemaInfo,
                    deviceLoginSchemaInfo,
                    context,
                    labels,
                );
            response = userResponse;
        } catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(
                context.tracerId,
                Constants.LOKI_LOGGER_LABELS.CONTROLLER,
            );
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const googleAuthenticationController =
    new GoogleAuthenticationControllerImpl();

import { uuidv4 } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface, GoogleAuthenticationLabelInterface } from "../database/interface/logger.js";
import { GoogleAuthenticationResponse } from "../database/interface/response.js";
import { GoogleAuthenticationInterface, GPRCGoogleAuthenticationInterface } from "../database/interface/user_google_authentication.js";
import { userGoogleAuthenticationRepositories } from "../database/repositories/user_google_authentication.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";

interface GoogleAuthenticationController {
    mapUserAuthenticationSchema(userInfo: GPRCGoogleAuthenticationInterface): GoogleAuthenticationInterface;
    authenticateUser(userInfo: GPRCGoogleAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse>
}

class GoogleAuthenticationControllerImpl implements GoogleAuthenticationController {
    mapUserAuthenticationSchema(userInfo: GPRCGoogleAuthenticationInterface): GoogleAuthenticationInterface {
        return {
            _id: uuidv4(),
            email: userInfo.email,
            name: userInfo.name,
            username: helper.generateUniqueUserName(userInfo),
            profile_picture: userInfo.profilePicture,
        }
    }

    async authenticateUser(userInfo: GPRCGoogleAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: GoogleAuthenticationLabelInterface): Promise<GoogleAuthenticationResponse> {
        const userAuthenticationSchemaInfo: GoogleAuthenticationInterface = this.mapUserAuthenticationSchema(userInfo);
        const deviceLoginSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo);

        let response = new GoogleAuthenticationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userAuthenticationSchemaInfo,
                deviceLoginSchemaInfo,
            },
        };

        try {
            const userResponse = await userGoogleAuthenticationRepositories.authenticateUser(userAuthenticationSchemaInfo, deviceLoginSchemaInfo, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new GoogleAuthenticationResponse(error);
        }

        return response;
    }
}

export const googleAuthenticationController = new GoogleAuthenticationControllerImpl();


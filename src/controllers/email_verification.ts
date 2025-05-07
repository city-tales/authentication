import { logger } from "../config/loki.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface, EmailVerificationLabelInterface } from "../database/interface/logger.js";
import { EmailVerificationResponse } from "../database/interface/response.js";
import { PasswordlessAuthenticationInterface } from "../database/interface/user_passwordless_authentication.js";
import { userEmailVerificationRepositoriesImpl } from "../database/repositories/user_email_verification.js";
import { userPasswordlessAuthenticationRepositories } from "../database/repositories/user_passwordless_authentication.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";
import { DecryptedAuthTokenInterface } from "../utils/interface.js";
import { Utils } from "../utils/utils.js";

interface UserEmailVerificationController {
    verifyEmail(token: string, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse>
}

class UserEmailVerificationControllerImpl implements UserEmailVerificationController {
    async verifyEmail(token: string, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            token: token,
        };

        try {
            const decryptedAuthToken: DecryptedAuthTokenInterface = helper.decryptAuthToken(token);

            if(decryptedAuthToken.source === Constants.LOKI_LOGGER_LABELS.SIGNUP_REQUEST) {
                const userResponse: EmailVerificationResponse = await userEmailVerificationRepositoriesImpl.verifyEmail(decryptedAuthToken, context, labels);
                response = userResponse;
            }
            else if(decryptedAuthToken.source === Constants.LOKI_LOGGER_LABELS.PASSWORDLESS) {
                const rawDeviceSchemaInfo: GPRCDeviceInterface = {
                    deviceType: decryptedAuthToken.deviceType,
                    browserInfo: decryptedAuthToken.browserInfo,
                    ipAddress: decryptedAuthToken.ipAddress,
                    deviceId: decryptedAuthToken.deviceId,
                    platform: decryptedAuthToken.platform,
                    deviceName: decryptedAuthToken.deviceName,
                    loginTime: new Date(decryptedAuthToken.loginTime || Utils.CURRENT_TIME),
                };
                const userSchemaInfo: PasswordlessAuthenticationInterface = {
                    _id: decryptedAuthToken._id,
                    username: decryptedAuthToken.username,
                    email: decryptedAuthToken.email,
                };  
                const deviceSchemaInfo: DeviceInterface = helper.mapDeviceSchema(rawDeviceSchemaInfo, decryptedAuthToken._id);
                
                const dbResponse: EmailVerificationResponse = await userPasswordlessAuthenticationRepositories.createUser(userSchemaInfo, deviceSchemaInfo, context, labels);
                response = dbResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userEmailVerificationControllerImpl = new UserEmailVerificationControllerImpl();
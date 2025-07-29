import { logger } from "../config/loki.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import { ContextType, EmailVerificationLabelType } from "../database/types/logger.js";
import { EmailVerificationResponse } from "../database/types/response.js";
import { GPRCPasswordlessAuthenticationType, PasswordlessAuthenticationAuthType, PasswordlessAuthenticationDataType, PasswordlessAuthenticationType } from "../database/types/user_passwordless_authentication.js";
import { userEmailVerificationRepositoriesImpl } from "../database/repositories/user_email_verification.js";
import { userPasswordlessAuthenticationRepositories } from "../database/repositories/user_passwordless_authentication.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";
import { DecryptedAuthTokenType } from "../utils/types.js";
import { utils } from "../utils/utils.js";
import { passwordlessAuthenticationController } from "./passwordless_authentication.js";

interface UserEmailVerificationController {
    verifyEmail(token: string, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse>
}

class UserEmailVerificationControllerImpl implements UserEmailVerificationController {
    async verifyEmail(token: string, context: ContextType, labels: EmailVerificationLabelType): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            token: token,
        };

        try {
            const decryptedAuthToken: DecryptedAuthTokenType = helper.decryptAuthToken(token);

            if(decryptedAuthToken.source === Constants.LOKI_LOGGER_LABELS.SIGNUP_REQUEST) {
                const userResponse: EmailVerificationResponse = await userEmailVerificationRepositoriesImpl.verifyEmail(decryptedAuthToken, context, labels);
                response = userResponse;
            }
            else if(decryptedAuthToken.source === Constants.LOKI_LOGGER_LABELS.PASSWORDLESS) {
                const rawDeviceSchemaInfo: GPRCDeviceType = {
                    deviceType: decryptedAuthToken.deviceType,
                    browserInfo: decryptedAuthToken.browserInfo,
                    ipAddress: decryptedAuthToken.ipAddress,
                    platform: decryptedAuthToken.platform,
                    deviceName: decryptedAuthToken.deviceName,
                    loginTime: new Date(decryptedAuthToken.loginTime || utils.CURRENT_TIME())
                };

                const userInfo: GPRCPasswordlessAuthenticationType = {
                    email: decryptedAuthToken.email
                };

                const userSchemaInfo: PasswordlessAuthenticationType = {
                    _id: helper.isNeitherNullNorUndefinedNorEmpty(decryptedAuthToken._id) ? decryptedAuthToken._id : passwordlessAuthenticationController.mapUserPasswordlessAuthenticationSchema()._id,
                    created_at: helper.formatDateTimeString(),
                };
                const userDataSchemaInfo: PasswordlessAuthenticationDataType = passwordlessAuthenticationController.mapUserDataPasswordlessAuthenticationSchema(userInfo, userSchemaInfo._id);
                const authDataSchemaInfo: PasswordlessAuthenticationAuthType = passwordlessAuthenticationController.mapUserAuthPasswordlessAuthenticationSchema(userInfo, userSchemaInfo._id);
                const deviceSchemaInfo: DeviceType = helper.mapDeviceSchema(rawDeviceSchemaInfo, userSchemaInfo._id);
                
                const userResponse: EmailVerificationResponse = await userPasswordlessAuthenticationRepositories.createUser(userSchemaInfo, userDataSchemaInfo, authDataSchemaInfo, deviceSchemaInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER, context.source);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userEmailVerificationControllerImpl = new UserEmailVerificationControllerImpl();
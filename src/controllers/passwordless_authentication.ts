import { uuidv4 } from "../config/imports.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import {
    ContextType,
    PasswordlessAuthenticationLabelType,
} from "../database/types/logger.js";
import { PasswordlessAuthenticationResponse } from "../database/types/response.js";
import {
    GPRCPasswordlessAuthenticationType,
    PasswordlessAuthenticationAuthType,
    PasswordlessAuthenticationDataType,
    PasswordlessAuthenticationType,
} from "../database/types/user_passwordless_authentication.js";
import { userPasswordlessAuthenticationRepositories } from "../database/repositories/user_passwordless_authentication.js";
import { Helper } from "../utils/helper.js";

interface PasswordlessAuthenticationController {
    mapUserPasswordlessAuthenticationSchema(): PasswordlessAuthenticationType;
    mapUserDataPasswordlessAuthenticationSchema(
        userInfo: GPRCPasswordlessAuthenticationType,
        userId: string,
    ): PasswordlessAuthenticationDataType;
    mapUserAuthPasswordlessAuthenticationSchema(
        userInfo: GPRCPasswordlessAuthenticationType,
        userId: string,
    ): PasswordlessAuthenticationAuthType;
    generateUserPasswordlessTokenDetails(
        userInfo: GPRCPasswordlessAuthenticationType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: PasswordlessAuthenticationLabelType,
    ): Promise<PasswordlessAuthenticationResponse>;
}

class PasswordlessAuthenticationControllerImpl
    implements PasswordlessAuthenticationController
{
    mapUserPasswordlessAuthenticationSchema(): PasswordlessAuthenticationType {
        return {
            _id: uuidv4(),
            created_at: Helper.formatDateTimeString(),
        };
    }

    mapUserDataPasswordlessAuthenticationSchema(
        userInfo: GPRCPasswordlessAuthenticationType,
        userId: string,
    ): PasswordlessAuthenticationDataType {
        return {
            _id: uuidv4(),
            email: userInfo.email,
            username: Helper.generateUniqueUserName(userInfo),
            user_id: userId,
            updated_at: Helper.formatDateTimeString(),
        };
    }

    mapUserAuthPasswordlessAuthenticationSchema(
        userInfo: GPRCPasswordlessAuthenticationType,
        userId: string,
    ): PasswordlessAuthenticationAuthType {
        return {
            _id: uuidv4(),
            is_email_verified: false,
            is_google_verified: false,
            is_passwordless: false,
            is_mfa_enabled: false,
            password: null,
            salt: null,
            user_id: userId,
        };
    }

    async generateUserPasswordlessTokenDetails(
        userInfo: GPRCPasswordlessAuthenticationType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: PasswordlessAuthenticationLabelType,
    ): Promise<PasswordlessAuthenticationResponse> {
        const userSchemaInfo: PasswordlessAuthenticationType =
            this.mapUserPasswordlessAuthenticationSchema();
        const userDataSchemaInfo: PasswordlessAuthenticationDataType =
            this.mapUserDataPasswordlessAuthenticationSchema(
                userInfo,
                userSchemaInfo._id,
            );
        const deviceSchemaInfo: DeviceType = Helper.mapDeviceSchema(deviceInfo);

        return userPasswordlessAuthenticationRepositories.generateUserPasswordlessTokenDetails(
            userSchemaInfo,
            userDataSchemaInfo,
            deviceSchemaInfo,
            context,
            labels,
        );
    }
}

export const passwordlessAuthenticationController =
    new PasswordlessAuthenticationControllerImpl();

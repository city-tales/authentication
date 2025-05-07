import { uuidv4 } from "../config/imports.js";
import { GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface, PasswordlessAuthenticationLabelInterface } from "../database/interface/logger.js";
import { PasswordlessAuthenticationResponse } from "../database/interface/response.js";
import { GPRCPasswordlessAuthenticationInterface, PasswordlessAuthenticationInterface } from "../database/interface/user_passwordless_authentication.js";
import { userPasswordlessAuthenticationRepositories } from "../database/repositories/user_passwordless_authentication.js";
import { helper } from "../utils/helper.js";

interface PasswordlessAuthenticationController {
    generateUserPasswordlessTokenDetails(userInfo: GPRCPasswordlessAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse>;
    mapUserPasswordlessAuthenticationSchema(userInfo: GPRCPasswordlessAuthenticationInterface): PasswordlessAuthenticationInterface;
}

class PasswordlessAuthenticationControllerImpl implements PasswordlessAuthenticationController {
    mapUserPasswordlessAuthenticationSchema(userInfo: GPRCPasswordlessAuthenticationInterface): PasswordlessAuthenticationInterface {
        return {
            _id: uuidv4(),
            name: userInfo.name,
            username: helper.generateUniqueUserName(userInfo),
            email: userInfo.email,
        };
    };

    async generateUserPasswordlessTokenDetails(userInfo: GPRCPasswordlessAuthenticationInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: PasswordlessAuthenticationLabelInterface): Promise<PasswordlessAuthenticationResponse> {
        const userSchemaInfo: PasswordlessAuthenticationInterface = this.mapUserPasswordlessAuthenticationSchema(userInfo);
        return userPasswordlessAuthenticationRepositories.generateUserPasswordlessTokenDetails(userSchemaInfo, deviceInfo, context, labels);
    }
}

export const passwordlessAuthenticationController = new PasswordlessAuthenticationControllerImpl();


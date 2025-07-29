import { uuidv4 } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import { ContextType, EmailSignUpLabelType } from "../database/types/logger.js";
import { SignUpResponse } from "../database/types/response.js";
import { AuthDataSignUpType, GPRCUserSignUpType, UserDataSignUpType, UserSignUpType } from "../database/types/user_signup.js";
import { userSignUp } from "../database/repositories/user_signup.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";
import { utils } from "../utils/utils.js";

interface UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpType): UserSignUpType;
    mapUserDataSchema(userInfo: GPRCUserSignUpType, userId: string): UserDataSignUpType;
    mapAuthDataSchema(userInfo: GPRCUserSignUpType, userId: string): AuthDataSignUpType;
    createUser(userInfo: GPRCUserSignUpType, deviceInfo: GPRCDeviceType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse>;
}

class UserSignUpControllerImpl implements UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpType): UserSignUpType {
        const sanitisedUserInfo: GPRCUserSignUpType = helper.convertToType<GPRCUserSignUpType>(
            helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        return {
            _id: uuidv4(),
            created_at: helper.formatDateTimeString(),
        };
    }

    mapUserDataSchema(userInfo: GPRCUserSignUpType, userId: string): UserDataSignUpType {
        const sanitisedUserInfo: GPRCUserSignUpType = helper.convertToType<GPRCUserSignUpType>(
            helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        return {
            _id: uuidv4(),
            email: sanitisedUserInfo.email,
            name: sanitisedUserInfo.name,
            username: helper.generateUniqueUserName(sanitisedUserInfo),
            primary_country_code: sanitisedUserInfo.primaryCountryCode,
            phone_number: sanitisedUserInfo.phoneNumber,
            secondary_country_code: sanitisedUserInfo.secondaryCountryCode,
            alternate_phone: sanitisedUserInfo.alternatePhone,
            profile_picture: null,
            updated_at: helper.formatDateTimeString(),
            user_id: userId,
        };
    }

    mapAuthDataSchema(userInfo: GPRCUserSignUpType, userId: string): AuthDataSignUpType {
        const sanitisedUserInfo: GPRCUserSignUpType = helper.convertToType<GPRCUserSignUpType>(
            helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );
        const { salt, hashedPassword } = helper.generateHashPassword(sanitisedUserInfo.password);

        return {
            _id: uuidv4(),
            is_email_verified: false,
            is_google_verified: false,
            is_passwordless: false,
            is_mfa_enabled: false,
            password: hashedPassword,
            salt: salt,
            user_id: userId,
            updated_at: helper.formatDateTimeString(),
        };
    }

    async createUser(userInfo: GPRCUserSignUpType, deviceInfo: GPRCDeviceType, context: ContextType, labels: EmailSignUpLabelType): Promise<SignUpResponse> {
        const userSchemaInfo: UserSignUpType = this.mapUserSchema(userInfo);
        const userDataSchemaInfo: UserDataSignUpType = this.mapUserDataSchema(userInfo, userSchemaInfo._id);
        const authDataSchemaInfo: AuthDataSignUpType = this.mapAuthDataSchema(userInfo, userSchemaInfo._id)
        const deviceSchemaInfo: DeviceType = helper.mapDeviceSchema(deviceInfo, userSchemaInfo._id);

        let response = new SignUpResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userSchemaInfo,
                deviceSchemaInfo,
            },
        };

        try {
            const isExistingUser: SignUpResponse = await userSignUp.checkIfUserExists(userDataSchemaInfo, context, labels);
            if (isExistingUser.message === Constants.SIGNUP_MESSAGE.EXISTING_USER) {
                response.token = isExistingUser.token;
                response.message = isExistingUser.message;
                response.statusCode = isExistingUser.statusCode;
                response.verified = isExistingUser.verified;
            }
            else if(isExistingUser.message === Constants.SIGNUP_MESSAGE.NOT_VERIFIED) {
                response = isExistingUser;
            }
            else {
                const userResponse: SignUpResponse = await userSignUp.createUser(userSchemaInfo, userDataSchemaInfo, authDataSchemaInfo, deviceSchemaInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new SignUpResponse(error);
        }

        return response;
    }
}

export const userSignUpControllerImpl = new UserSignUpControllerImpl();
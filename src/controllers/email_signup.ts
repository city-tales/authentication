import { uuidv4 } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface, EmailSignUpLabelInterface } from "../database/interface/logger.js";
import { SignUpResponse } from "../database/interface/response.js";
import { GPRCUserSignUpInterface, UserSignUpInterface } from "../database/interface/user_signup.js";
import { userSignUp } from "../database/repositories/user_signup.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";

interface UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpInterface): UserSignUpInterface;
    createUser(userInfo: GPRCUserSignUpInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse>;
}

class UserSignUpControllerImpl implements UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpInterface): UserSignUpInterface {
        const sanitisedUserInfo: GPRCUserSignUpInterface = helper.convertToType<GPRCUserSignUpInterface>(
            helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        return {
            _id: uuidv4(),
            email: sanitisedUserInfo.email,
            password: sanitisedUserInfo.password,
            name: sanitisedUserInfo.name,
            username: helper.generateUniqueUserName(sanitisedUserInfo),
            primary_country_code: sanitisedUserInfo.primaryCountryCode,
            phone_number: sanitisedUserInfo.phoneNumber,
            secondary_country_code: sanitisedUserInfo.secondaryCountryCode,
            alternate_phone: sanitisedUserInfo.alternatePhone,
        };
    }

    async createUser(userInfo: GPRCUserSignUpInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: EmailSignUpLabelInterface): Promise<SignUpResponse> {
        const userSchemaInfo: UserSignUpInterface = this.mapUserSchema(userInfo);
        const deviceSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo, userSchemaInfo._id);

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
            const isExistingUser: SignUpResponse = await userSignUp.checkIfUserExists(userSchemaInfo, context, labels);
            if (isExistingUser.message === Constants.SIGNUP_MESSAGE.EXISTING_USER) {
                response.token = isExistingUser.token;
                response.message = isExistingUser.message;
                response.statusCode = isExistingUser.statusCode;
                response.verified = isExistingUser.verified;
            }
            else {
                const userResponse: SignUpResponse = await userSignUp.createUser(userSchemaInfo, deviceSchemaInfo, context, labels);
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
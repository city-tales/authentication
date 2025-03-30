import { Device, GPRCDevice } from "../database/interface/device_info.js";
import { SignUpSuccess } from "../database/interface/response.js";
import { GPRCUsers, Users } from "../database/interface/user_signup.js";
import { v4 as uuidv4 } from 'uuid';
import { userSignUp } from "../database/repositories/user_signup.js";
import { Constants } from "../utils/constants.js";
import { SignUpError } from "../utils/errors.js";
import { helper } from "../utils/helper.js";

interface UserSignUpController {
    createUser(userInfo: GPRCUsers, deviceInfo: GPRCDevice) : Promise<SignUpSuccess>;
}

class UserSignUpControllerImpl implements UserSignUpController {
    mapUserSchema(userInfo: GPRCUsers) : Users {
        const sanitisedUserInfo : GPRCUsers = helper.convertToType<GPRCUsers>(
            helper.sanitiseObject(userInfo), 
        );

        return {
            _id: uuidv4(),
            email: sanitisedUserInfo.email,
            password: sanitisedUserInfo.password,
            username: helper.generateUniqueUserName(sanitisedUserInfo),
            name: sanitisedUserInfo.name,
            primary_country_code: sanitisedUserInfo.primaryCountryCode,
            phone_number: sanitisedUserInfo.phoneNumber,
            secondary_country_code: sanitisedUserInfo.secondaryCountryCode,
            alternate_phone: sanitisedUserInfo.alternatePhone,
        };
    }

    mapDeviceSchema(deviceInfo: GPRCDevice) : Device {
        const sanitisedDeviceInfo : GPRCDevice = helper.convertToType<GPRCDevice>(
            helper.sanitiseObject(deviceInfo), 
        );

        return {
            _id: uuidv4(),
            device_type: sanitisedDeviceInfo.deviceType,
            browser_info: sanitisedDeviceInfo.browserInfo,
            ip_address: sanitisedDeviceInfo.ipAddress,
            device_id: sanitisedDeviceInfo.deviceId,
            platform: sanitisedDeviceInfo.platform,
            device_name: sanitisedDeviceInfo.deviceName,
            login_time: sanitisedDeviceInfo.loginTime || Constants.CURRENT_TIME,
        };
    }

    async createUser(userInfo: GPRCUsers, deviceInfo: GPRCDevice) : Promise<SignUpSuccess> {
        const userSchemaInfo = this.mapUserSchema(userInfo);
        const deviceSchemaInfo = this.mapDeviceSchema(deviceInfo);

        let response : SignUpSuccess = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };
        
        try {
            const isExistingUser = await userSignUp.checkIfUserExists(userSchemaInfo);
            if(isExistingUser.message === Constants.SIGNUP_MESSAGE.EXISTING_USER) {
                response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                response.statusCode = Constants.STATUS_CODES.ACCEPTED;
            }
            else {
                try {
                    const userResponse = await userSignUp.createUser(userSchemaInfo, deviceSchemaInfo);
                    response = userResponse;
                }
                catch(error) {
                    throw new SignUpError(error);
                }
            }
        }
        catch (error) {
            throw new SignUpError(error);
        }

        return response;
    }
}

export const userSignUpControllerImpl = new UserSignUpControllerImpl();
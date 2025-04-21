import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { SignUpSuccessResponse } from "../database/interface/response.js";
import { GPRCUserSignUpInterface, UserSignUpInterface } from "../database/interface/user_signup.js";
import { v4 as uuidv4 } from 'uuid';
import { userSignUp } from "../database/repositories/user_signup.js";
import { Constants } from "../utils/constants.js";
import { SignUpError } from "../utils/errors.js";
import { helper } from "../utils/helper.js";

interface UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpInterface) : UserSignUpInterface;
    createUser(userInfo: GPRCUserSignUpInterface, deviceInfo: GPRCDeviceInterface) : Promise<SignUpSuccessResponse>;
}

class UserSignUpControllerImpl implements UserSignUpController {
    mapUserSchema(userInfo: GPRCUserSignUpInterface) : UserSignUpInterface {
        const sanitisedUserInfo : GPRCUserSignUpInterface = helper.convertToType<GPRCUserSignUpInterface>(
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

    async createUser(userInfo: GPRCUserSignUpInterface, deviceInfo: GPRCDeviceInterface) : Promise<SignUpSuccessResponse> {
        const userSchemaInfo: UserSignUpInterface = this.mapUserSchema(userInfo);
        const deviceSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo, userSchemaInfo._id);

        let response : SignUpSuccessResponse = {
            token: Constants.SIGNUP_MESSAGE.EMPTY_TOKEN,
            message: Constants.SIGNUP_MESSAGE.PROCESSING,
            statusCode: Constants.STATUS_CODES.PROCESSING,
        };
        
        try {
            const isExistingUser = await userSignUp.checkIfUserExists(userSchemaInfo);
            if(isExistingUser.message === Constants.SIGNUP_MESSAGE.EXISTING_USER) {
                response.message = Constants.SIGNUP_MESSAGE.EXISTING_USER;
                response.statusCode = Constants.STATUS_CODES.OK;
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
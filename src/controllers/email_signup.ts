import { Device } from "../database/interface/device_info.js";
import { SignUpResponse } from "../database/interface/signup_response.js";
import { Users } from "../database/interface/user_signup.js";
import { v4 as uuidv4 } from 'uuid';
import { userSignUp } from "../database/repositories/user_signup.js";

interface UserSignUpController {
    createUser(userInfo: any, deviceInfo: any) : Promise<SignUpResponse>;
}

class UserSignUpControllerImpl implements UserSignUpController {
    mapUserSchema(userInfo: any): Users {
        return {
            _id: uuidv4(),
            email: userInfo.email,
            password: userInfo.password,
            username: userInfo.username,
            name: userInfo.name,
            primary_country_code: userInfo.primary_country_code,
            phone_number: userInfo.phoneNumber,
            secondary_country_code: userInfo.secondary_country_code,
            alternate_phone: userInfo.alternatePhone
        };
    }

    mapDeviceSchema(deviceInfo: any): Device {
        return {
            _id: uuidv4(),
            device_type: deviceInfo.deviceType,
            browser_info: deviceInfo.browserInfo,
            ip_address: deviceInfo.ipAddress,
            device_id: deviceInfo.deviceId,
            platform: deviceInfo.platform,
            device_name: deviceInfo.deviceName,
            login_time: deviceInfo.loginTime,
        };
    }

    async createUser(userInfo: any, deviceInfo: any): Promise<SignUpResponse> {
        const userSchemaInfo = this.mapUserSchema(userInfo);
        const deviceSchemaInfo = this.mapDeviceSchema(deviceInfo);
        
        try {
            const userResponse = await userSignUp.createUser(userSchemaInfo, deviceSchemaInfo);

            return userResponse;
        }
        catch (error) {
            console.log(error);
            throw error(error);
        }

        return {
            message: "Hello controller",
            status_code: 201
        };
    }
}

export const userSignUpControllerImpl = new UserSignUpControllerImpl();
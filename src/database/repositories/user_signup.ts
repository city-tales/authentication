import { Users } from "../interface/user_signup.js";
import { user } from "../models/user_signup.js";
import { SignUpResponse } from "../interface/signup_response.js";
import { Device } from "../interface/device_info.js";

interface UserSignUp {
    createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpResponse>,
}

class UserSignUpImpl implements UserSignUp {
    async createUser(userInfo: Users, deviceInfo: Device) : Promise<SignUpResponse> {
        try {
            const response = await user.createUser(userInfo, deviceInfo);

            return response;
        }
        catch (error) {
            console.log(error);
            throw error;
        }
    }
}

export const userSignUp = new UserSignUpImpl();


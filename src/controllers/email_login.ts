import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { LoginSuccessResponse } from "../database/interface/response.js";
import { GRPCUserLoginInterface, UserLoginInterface } from "../database/interface/user_login.js";
import { userLoginRepositoryImpl } from "../database/repositories/user_login.js";
import { Constants } from "../utils/constants.js";
import { LoginError } from "../utils/errors.js";
import { helper } from "../utils/helper.js";

interface UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface) : UserLoginInterface;
    loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface) : Promise<LoginSuccessResponse>;
}

class UserLoginControllerImpl implements UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface) : UserLoginInterface {
        const sanitisedUserLoginInfo: GRPCUserLoginInterface = helper.convertToType<GRPCUserLoginInterface>(
            helper.sanitiseObject(userInfo)
        );

        return {
            email: sanitisedUserLoginInfo.email,
            password: sanitisedUserLoginInfo.password,
        }
    }

    async loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface) : Promise<LoginSuccessResponse> {
        const userLoginSchemaInfo: UserLoginInterface = this.mapUserLoginSchema(userInfo);
        const deviceLoginSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo); // fix

        let response : LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };

        try {
            const isKeyInRedis = await userLoginRepositoryImpl.checkUserInRedis(userInfo.email);
            if(isKeyInRedis.token !== Constants.LOGIN_MESSAGE.EMPTY_TOKEN && isKeyInRedis.message !== Constants.LOGIN_MESSAGE.PROCESSING) { 
                response = isKeyInRedis;
            }
            else {
                const userResponse = await userLoginRepositoryImpl.loginUser(userLoginSchemaInfo, deviceLoginSchemaInfo);
                response = userResponse;
            }
        }
        catch(error) {
            throw new LoginError(error);
        }

        return response;
    }
}

export const userLoginControllerImpl = new UserLoginControllerImpl();
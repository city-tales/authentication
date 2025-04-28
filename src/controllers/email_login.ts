import { logger } from "../config/loki.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface, EmailLoginLabelInterface } from "../database/interface/logger.js";
import { LoginResponse } from "../database/interface/response.js";
import { GRPCUserLoginInterface, UserLoginInterface } from "../database/interface/user_login.js";
import { userLoginRepositoryImpl } from "../database/repositories/user_login.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";

interface UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface): UserLoginInterface;
    loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse>;
}

class UserLoginControllerImpl implements UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface): UserLoginInterface {
        const sanitisedUserLoginInfo: GRPCUserLoginInterface = helper.convertToType<GRPCUserLoginInterface>(
            helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        return {
            email: sanitisedUserLoginInfo.email,
            password: sanitisedUserLoginInfo.password,
        }
    }

    async loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface, labels: EmailLoginLabelInterface): Promise<LoginResponse> {
        const userLoginSchemaInfo: UserLoginInterface = this.mapUserLoginSchema(userInfo);
        const deviceLoginSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo);

        let response = new LoginResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userLoginSchemaInfo,
                deviceLoginSchemaInfo,
            },
        };

        try {
            const isKeyInRedis: LoginResponse = await userLoginRepositoryImpl.checkUserInRedis(userInfo.email, context, labels);
            if (isKeyInRedis.token !== Constants.LOGIN_MESSAGE.EMPTY_TOKEN && isKeyInRedis.message !== Constants.LOGIN_MESSAGE.PROCESSING) {
                response = isKeyInRedis;
            }
            else {
                const userResponse: LoginResponse = await userLoginRepositoryImpl.loginUser(userLoginSchemaInfo, deviceLoginSchemaInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(error);
        }

        return response;
    }
}

export const userLoginControllerImpl = new UserLoginControllerImpl();
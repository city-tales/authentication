import { logger } from "../config/loki.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import { ContextType, EmailLoginLabelType } from "../database/types/logger.js";
import { LoginResponse } from "../database/types/response.js";
import { GRPCUserLoginType, UserLoginType } from "../database/types/user_login.js";
import { userLoginRepositoryImpl } from "../database/repositories/user_login.js";
import { Constants } from "../utils/constants.js";
import { Helper } from "../utils/helper.js";

interface UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginType): UserLoginType;
    loginUser(userInfo: GRPCUserLoginType, deviceInfo: GPRCDeviceType, context: ContextType, labels: EmailLoginLabelType): Promise<LoginResponse>;
}

class UserLoginControllerImpl implements UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginType): UserLoginType {
        const sanitisedUserLoginInfo: GRPCUserLoginType = Helper.convertToType<GRPCUserLoginType>(
            Helper.sanitiseObject(userInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        return {
            email: sanitisedUserLoginInfo.email,
            password: sanitisedUserLoginInfo.password,
        }
    }

    async loginUser(userInfo: GRPCUserLoginType, deviceInfo: GPRCDeviceType, context: ContextType, labels: EmailLoginLabelType): Promise<LoginResponse> {
        const userLoginSchemaInfo: UserLoginType = this.mapUserLoginSchema(userInfo);
        const deviceLoginSchemaInfo: DeviceType = Helper.mapDeviceSchema(deviceInfo);

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
            const isKeyInRedis: LoginResponse = await userLoginRepositoryImpl.checkUserInRedis(userLoginSchemaInfo, context, labels);
            if(Helper.isNeitherNullNorUndefinedNorEmpty(isKeyInRedis.token) && isKeyInRedis.statusCode === Constants.STATUS_CODES.OK) {
                response = isKeyInRedis;
            }
            else if(isKeyInRedis.message === Constants.LOGIN_MESSAGE.PASSWORD_DO_NOT_MATCH) {
                response = isKeyInRedis;
            }
            else {
                const userResponse: LoginResponse = await userLoginRepositoryImpl.loginUser(userLoginSchemaInfo, deviceLoginSchemaInfo, context, labels);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new LoginResponse(error);
        }

        return response;
    }
}

export const userLoginControllerImpl = new UserLoginControllerImpl();
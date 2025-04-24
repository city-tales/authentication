import { logger } from "../config/loki.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { ContextInterface } from "../database/interface/helper.js";
import { LoginSuccessResponse } from "../database/interface/response.js";
import { GRPCUserLoginInterface, UserLoginInterface } from "../database/interface/user_login.js";
import { userLoginRepositoryImpl } from "../database/repositories/user_login.js";
import { Constants } from "../utils/constants.js";
import { LoginError } from "../utils/errors.js";
import { helper } from "../utils/helper.js";

interface UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface): UserLoginInterface;
    loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse>;
}

class UserLoginControllerImpl implements UserLoginController {
    mapUserLoginSchema(userInfo: GRPCUserLoginInterface): UserLoginInterface {
        const sanitisedUserLoginInfo: GRPCUserLoginInterface = helper.convertToType<GRPCUserLoginInterface>(
            helper.sanitiseObject(userInfo)
        );

        return {
            email: sanitisedUserLoginInfo.email,
            password: sanitisedUserLoginInfo.password,
        }
    }

    async loginUser(userInfo: GRPCUserLoginInterface, deviceInfo: GPRCDeviceInterface, context: ContextInterface): Promise<LoginSuccessResponse> {
        const userLoginSchemaInfo: UserLoginInterface = this.mapUserLoginSchema(userInfo);
        const deviceLoginSchemaInfo: DeviceInterface = helper.mapDeviceSchema(deviceInfo);

        let response: LoginSuccessResponse = {
            token: Constants.LOGIN_MESSAGE.EMPTY_TOKEN,
            message: Constants.LOGIN_MESSAGE.PROCESSING,
            verified: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
            statusCode: Constants.STATUS_CODES.INTERNAL_SERVER_ERROR,
            retryVerification: helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE),
        };
        let loggerDefaultParams = {};

        try {
            const isKeyInRedis = await userLoginRepositoryImpl.checkUserInRedis(userInfo.email, context);
            if (isKeyInRedis.token !== Constants.LOGIN_MESSAGE.EMPTY_TOKEN && isKeyInRedis.message !== Constants.LOGIN_MESSAGE.PROCESSING) {
                response = isKeyInRedis;
            }
            else {
                const userResponse = await userLoginRepositoryImpl.loginUser(userLoginSchemaInfo, deviceLoginSchemaInfo, context);
                response = userResponse;
            }
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logger.error(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
                labels: {
                    operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                    type: Constants.LOKI_LOGGER_LABELS.EMAIL,
                },
                loggerDefaultParams,
                request: {
                    userLoginSchemaInfo,
                    deviceLoginSchemaInfo, 
                },
                error,
            });

            throw new LoginError(error);
        }

        return response;
    }
}

export const userLoginControllerImpl = new UserLoginControllerImpl();
import { logger } from "../config/loki.js";
import { userForgotPasswordRepositoryImpl } from "../database/repositories/user_forgot_password.js";
import { DeviceType, GPRCDeviceType } from "../database/types/device_info.js";
import {
    ContextType,
    EmailForgotPasswordLabelType,
} from "../database/types/logger.js";
import { EmailForgotPasswordResponse } from "../database/types/response.js";
import { Constants } from "../utils/constants.js";
import { Helper } from "../utils/helper.js";
import { GRPCUserForgotPasswordType } from "./../database/types/user_forgot_password.js";

interface UserForgotPasswordController {
    forgotPassword(
        userInfo: GRPCUserForgotPasswordType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: EmailForgotPasswordLabelType,
    ): Promise<EmailForgotPasswordResponse>;
}

class UserForgotPasswordControllerImpl implements UserForgotPasswordController {
    async forgotPassword(
        userInfo: GRPCUserForgotPasswordType,
        deviceInfo: GPRCDeviceType,
        context: ContextType,
        labels: EmailForgotPasswordLabelType,
    ): Promise<EmailForgotPasswordResponse> {
        const deviceLoginSchemaInfo: DeviceType =
            Helper.mapDeviceSchema(deviceInfo);

        let response = new EmailForgotPasswordResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                userInfo,
                deviceLoginSchemaInfo,
            },
        };

        try {
            const userResponse: EmailForgotPasswordResponse =
                await userForgotPasswordRepositoryImpl.forgotPassword(
                    userInfo.email,
                    deviceLoginSchemaInfo,
                    context,
                    labels,
                );
            response = userResponse;
        } catch (error) {
            loggerDefaultParams = Helper.generateDefaultFailureParams(
                context.tracerId,
                Constants.LOKI_LOGGER_LABELS.CONTROLLER,
            );
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = Helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailForgotPasswordResponse(error);
        }

        return response;
    }
}

export const userEmailForgotPasswordControllerImpl =
    new UserForgotPasswordControllerImpl();

import { logger } from "../../config/loki.js";
import { userEmailForgotPasswordControllerImpl } from "../../controllers/email_forgot_password.js";
import { EmailForgotPasswordLabelType } from "../../database/types/logger.js";
import { EmailForgotPasswordResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

const emailForgotPassword = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get("tracerid")?.[0],
    };
    const labels: EmailForgotPasswordLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.FORGOT_PASSWORD,
        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
    };

    let toRet: EmailForgotPasswordResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: EmailForgotPasswordResponse =
            await userEmailForgotPasswordControllerImpl.forgotPassword(
                request.userEmailForgotPasswordRequest,
                request.userDeviceInformation,
                context,
                labels,
            );
        toRet = response;

        loggerDefaultParams = Helper.generateDefaultSuccessParams(
            context.tracerId,
            Constants.LOKI_LOGGER_LABELS.HANDLER,
        );
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = Helper.logResponse(logPayload, response);
        logger.info({ ...logPayload });
    } catch (error) {
        toRet = error;

        loggerDefaultParams = Helper.generateDefaultFailureParams(
            context.tracerId,
            Constants.LOKI_LOGGER_LABELS.HANDLER,
        );
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = Helper.logErrorStack(logPayload, error);
        logger.error({ ...logPayload });

        callback(error, null);
    }

    callback(null, toRet);
};

export { emailForgotPassword };

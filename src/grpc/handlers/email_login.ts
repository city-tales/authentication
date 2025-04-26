import { logger } from "../../config/loki.js";
import { userLoginControllerImpl } from "../../controllers/email_login.js";
import { EmailLoginLabelInterface } from "../../database/interface/logger.js";
import { LoginSuccessResponse } from "../../database/interface/response.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const emailLogin = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    const labels: EmailLoginLabelInterface = {
        operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
    }
    
    let toRet;
    let loggerDefaultParams = {};

    try {
        const response: LoginSuccessResponse = await userLoginControllerImpl.loginUser(request.userEmailLoginRequest, request.userDeviceInformation, context, labels);
        toRet = response;

        loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logger.info({
            labels,
            ...loggerDefaultParams,
            request,
            toRet,
        });
    }
    catch (error) {
        toRet = error;

        loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logger.error({
            labels,
            ...loggerDefaultParams,
            request,
            toRet,
        });
    }

    callback(null, toRet);
};

export {
    emailLogin,
}
import { logger } from "../../config/loki.js";
import { userLoginControllerImpl } from "../../controllers/email_login.js";
import { EmailLoginLabelInterface } from "../../database/interface/logger.js";
import { LoginResponse } from "../../database/interface/response.js";
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
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: LoginResponse = await userLoginControllerImpl.loginUser(request.userEmailLoginRequest, request.userDeviceInformation, context, labels);
        toRet = response;
        
        loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = helper.logResponse(logPayload, response);
        logger.info({ ...logPayload });
    }
    catch (error) {
        toRet = error;

        loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = helper.logErrorStack(logPayload, error);
        logger.error({ ...logPayload });

        callback(error, null);
    }
    
    callback(null, toRet);
};

export {
    emailLogin,
}
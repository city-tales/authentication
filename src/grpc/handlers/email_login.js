import { logger } from "../../config/loki.js";
import { userLoginControllerImpl } from "../../controllers/email_login.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const emailLogin = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    
    let toRet;
    let loggerDefaultParams = {};

    try {
        const response = await userLoginControllerImpl.loginUser(request.userEmailLoginRequest, request.userDeviceInformation, context);
        toRet = response;

        loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logger.info(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
            labels: {
                operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                type: Constants.LOKI_LOGGER_LABELS.EMAIL,
            },
            loggerDefaultParams,
            request,
            toRet,
        });
    }
    catch (error) {
        toRet = error;

        loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logger.error(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
            labels: {
                operation: Constants.LOKI_LOGGER_LABELS.LOGIN_REQUEST,
                type: Constants.LOKI_LOGGER_LABELS.EMAIL,
            },
            loggerDefaultParams,
            request,
            toRet,
        });
    }

    callback(null, toRet);
};

export {
    emailLogin,
}
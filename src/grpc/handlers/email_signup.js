import { logger } from "../../config/loki.js";
import { userSignUpControllerImpl } from "../../controllers/email_signup.js";
import { Constants } from "../../utils/constants.js";
import { SignUpError } from "../../utils/errors.js";
import { helper } from "../../utils/helper.js";

export const emailSignUp = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };

    let toRet;
    let loggerDefaultParams = {};

    try {
        const response = await userSignUpControllerImpl.createUser(request.userEmailSignUpRequest, request.userDeviceInformation, context);
        toRet = response;

        loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER);
        logger.info(Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE, {
            labels: {
                operation: Constants.LOKI_LOGGER_LABELS.SIGNUP_REQUEST,
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
                operation: Constants.LOKI_LOGGER_LABELS.SIGNUP_REQUEST,
                type: Constants.LOKI_LOGGER_LABELS.EMAIL,
            },
            loggerDefaultParams,
            request,
            toRet,
        });
    }

    callback(null, toRet);
};

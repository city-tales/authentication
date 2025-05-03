import { logger } from "../../config/loki.js";
import { userSignUpControllerImpl } from "../../controllers/email_signup.js";
import { EmailSignUpLabelInterface } from "../../database/interface/logger.js";
import { SignUpResponse } from "../../database/interface/response.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const emailSignUp = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    const labels: EmailSignUpLabelInterface = {
        operation: Constants.LOKI_LOGGER_LABELS.SIGNUP_REQUEST,
        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
    };

    let toRet: SignUpResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: SignUpResponse = await userSignUpControllerImpl.createUser(request.userEmailSignUpRequest, request.userDeviceInformation, context, labels);
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
    emailSignUp
};
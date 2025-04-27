import { logger } from "../../config/loki.js";
import { userEmailVerificationControllerImpl } from "../../controllers/email_verification.js";
import { EmailVerificationLabelInterface } from "../../database/interface/logger.js";
import { EmailVerificationResponse } from "../../database/interface/response.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const emailVerification = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    const labels: EmailVerificationLabelInterface = {
        operation: Constants.LOKI_LOGGER_LABELS.EMAIL_VERIFICATION,
        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
    };

    let toRet: EmailVerificationResponse;
    let loggerDefaultParams = {};

    try {
        const response: EmailVerificationResponse = await userEmailVerificationControllerImpl.verifyEmail(request.token, context, labels);
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
    emailVerification
};
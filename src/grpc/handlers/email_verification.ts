import { logger } from "../../config/loki.js";
import { userEmailVerificationControllerImpl } from "../../controllers/email_verification.js";
import { EmailVerificationLabelType } from "../../database/types/logger.js";
import { EmailVerificationResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

const emailVerification = async (call, callback) => {
    const request = call.request;
    const rawSource = Helper.decryptAuthToken(request.token)?.source;
    const source = Helper.isNeitherNullNorUndefinedNorEmpty(rawSource) ? rawSource : Constants.LOKI_LOGGER_LABELS.EMAIL_VERIFICATION;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
        source: source,
    };
    const labels: EmailVerificationLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.EMAIL_VERIFICATION,
        type: Constants.LOKI_LOGGER_LABELS.EMAIL,
        source: context.source,
    };

    let toRet: EmailVerificationResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: EmailVerificationResponse = await userEmailVerificationControllerImpl.verifyEmail(request.token, context, labels);
        toRet = response;

        loggerDefaultParams = Helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER, context.source);
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = Helper.logResponse(logPayload, response);
        logger.info({ ...logPayload });
    }
    catch (error) {
        toRet = error;

        loggerDefaultParams = Helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.HANDLER, context.source);
        logPayload = { ...logPayload, ...loggerDefaultParams };
        logPayload = Helper.logErrorStack(logPayload, error);
        logger.error({ ...logPayload });

        callback(error, null);
    }

    callback(null, toRet);
};

export {
    emailVerification
};
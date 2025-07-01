import { logger } from "../../config/loki.js";
import { updateEmailForPasswordControllerImpl } from "../../controllers/update_email_for_password.js";
import { UpdateEmailForPasswordLabelType } from "../../database/types/logger.js";
import { UpdateEmailForPasswordResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const updateEmailForPassword = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    const labels: UpdateEmailForPasswordLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.UPDATE_PASSWORD_FOR_EMAIL,
        type: Constants.LOKI_LOGGER_LABELS.FORGOT_PASSWORD,
    };

    let toRet: UpdateEmailForPasswordResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response = await updateEmailForPasswordControllerImpl.updatePassword(request.id, request.password, context, labels);
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
    updateEmailForPassword
};
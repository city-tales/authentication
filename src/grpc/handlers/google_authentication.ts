import { logger } from "../../config/loki.js";
import { googleAuthenticationController } from "../../controllers/google_authentication.js";
import { GoogleAuthenticationLabelType } from "../../database/types/logger.js";
import { GoogleAuthenticationResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";

const googleAuthentication = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get('tracerid')?.[0],
    };
    const labels: GoogleAuthenticationLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.GOOGLE,
        type: Constants.LOKI_LOGGER_LABELS.GOOGLE_AUTHENTICATION,
    };

    let toRet: GoogleAuthenticationResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: GoogleAuthenticationResponse = await googleAuthenticationController.authenticateUser(request.userGoogleAuthenticationRequest, request.userDeviceInformation, context, labels);
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
    googleAuthentication
};
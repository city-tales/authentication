import { logger } from "../../config/loki.js";
import { googleAuthenticationController } from "../../controllers/google_authentication.js";
import { GoogleAuthenticationLabelType } from "../../database/types/logger.js";
import { GoogleAuthenticationResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

const googleAuthentication = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get("tracerid")?.[0],
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
        const response: GoogleAuthenticationResponse =
            await googleAuthenticationController.authenticateUser(
                request.userGoogleAuthenticationRequest,
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

export { googleAuthentication };

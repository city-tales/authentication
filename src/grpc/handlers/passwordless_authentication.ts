import { logger } from "../../config/loki.js";
import { passwordlessAuthenticationController } from "../../controllers/passwordless_authentication.js";
import { PasswordlessAuthenticationLabelType } from "../../database/types/logger.js";
import { PasswordlessAuthenticationResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

const passwordlessAuthentication = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get("tracerid")?.[0],
    };
    const labels: PasswordlessAuthenticationLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.PASSWORDLESS,
        type: Constants.LOKI_LOGGER_LABELS.MAGIC_LINK,
    };

    let toRet: PasswordlessAuthenticationResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        const response: PasswordlessAuthenticationResponse =
            await passwordlessAuthenticationController.generateUserPasswordlessTokenDetails(
                request.userPasswordlessAuthenticationRequest,
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

export { passwordlessAuthentication };

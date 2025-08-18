import { logger } from "../../config/loki.js";
import { HealthCheckLabelType } from "../../database/types/logger.js";
import { HealthCheckResponse } from "../../database/types/response.js";
import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

const healthCheck = async (call, callback) => {
    const request = call.request;
    const context = {
        tracerId: call.metadata.internalRepr.get("tracerid")?.[0],
    };
    const labels: HealthCheckLabelType = {
        operation: Constants.LOKI_LOGGER_LABELS.HEALTH_CHECK,
        type: Constants.LOKI_LOGGER_LABELS.HEALTH_CHECK,
    };

    let toRet: HealthCheckResponse;
    let loggerDefaultParams = {};
    let logPayload = {
        labels,
        request,
    };

    try {
        let response: HealthCheckResponse = {
            statusCode: Constants.STATUS_CODES.OK,
            message: request.message,
            service: Constants.HEALTH_CHECK.SERVICE,
        };
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

export { healthCheck };

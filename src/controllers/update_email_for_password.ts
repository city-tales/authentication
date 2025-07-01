import { logger } from "../config/loki.js";
import { updateEmailForPasswordRepositoryImpl } from "../database/repositories/update_email_for_password.js";
import { ContextType, UpdateEmailForPasswordLabelType } from "../database/types/logger.js";
import { UpdateEmailForPasswordResponse } from "../database/types/response.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";

interface UpdateEmailForPasswordController {
    updatePassword(id: string, password: string, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse>;
}

class UpdateEmailForPasswordControllerImpl implements UpdateEmailForPasswordController {
    async updatePassword(id: string, password: string, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse> {
        let response = new UpdateEmailForPasswordResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                id: id,
            },
        };

        try {
            const userResponse = await updateEmailForPasswordRepositoryImpl.updatePassword(id, password, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new UpdateEmailForPasswordResponse(error);
        }

        return response;
    }
}

export const updateEmailForPasswordControllerImpl = new UpdateEmailForPasswordControllerImpl();
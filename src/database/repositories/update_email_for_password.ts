import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { HashedPasswordWithIdForUpdateType } from "../../utils/types.js";
import { userUpdateEmailForPasswordImpl } from "../models/user_update_email_for_password.js";
import { ContextType, UpdateEmailForPasswordLabelType } from "../types/logger.js";
import { UpdateEmailForPasswordResponse } from "../types/response.js";


interface UpdateEmailForPasswordRepository {
    updatePassword(id: string, password: string, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse>;
}

class UpdateEmailForPasswordRepositoryImpl implements UpdateEmailForPasswordRepository {
    async updatePassword(id: string, password: string, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse> {
        let response = new UpdateEmailForPasswordResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                id: id,
            },
        };
        const { salt, hashedPassword } = helper.generateHashPassword(password);
        const userData: HashedPasswordWithIdForUpdateType = [ salt, hashedPassword, helper.formatDateTimeString(), id ];

        try {
            const userResponse = await userUpdateEmailForPasswordImpl.updatePassword(userData, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REPOSITORIES);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new UpdateEmailForPasswordResponse(error);
        }

        return response;
    }
}

export const updateEmailForPasswordRepositoryImpl = new UpdateEmailForPasswordRepositoryImpl();
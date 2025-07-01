import { logger } from "../../config/loki.js";
import { Constants } from "../../utils/constants.js";
import { helper } from "../../utils/helper.js";
import { HashedPasswordWithIdForUpdateType } from "../../utils/types.js";
import { ContextType, UpdateEmailForPasswordLabelType } from "../types/logger.js";
import { UpdateEmailForPasswordResponse } from "../types/response.js";

interface UserUpdateEmailForPassword {
    updatePassword(userData: HashedPasswordWithIdForUpdateType, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse>;
}

class UserUpdateEmailForPasswordImpl implements UserUpdateEmailForPassword {
    async updatePassword(userData: HashedPasswordWithIdForUpdateType, context: ContextType, labels: UpdateEmailForPasswordLabelType): Promise<UpdateEmailForPasswordResponse> {
        let response = new UpdateEmailForPasswordResponse();   
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                id: userData["_id"],
                salt: userData["salt"],
                password: userData["password"],
            },
        }; 
        const authTableName = Constants.TABLES.AUTH_TABLE;

        const query = `UPDATE ${authTableName} SET password = $1, salt = $2, updated_at = $3 where user_id = $4`;
        
        try {
            const updateQueryResponse = await helper.executeQueryAsyncWithoutLock(context, query, userData, Constants.DB_ERRORS.READ_FAILURE, labels);
            if(helper.isUpdateQuerySuccessful(updateQueryResponse.command, updateQueryResponse.rowCount)) {
                response = updateQueryResponse;
            }
            else {
                throw new Error(Constants.UPDATE_PASSWORD_FOR_EMAIL_MESSAGE.NO_RECORD);
            }
        }
        catch (error) {
            response.message = helper.isNeitherNullNorUndefinedNorEmpty(error.message) ? error.message : Constants.UPDATE_PASSWORD_FOR_EMAIL_MESSAGE.FAILED;

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new UpdateEmailForPasswordResponse(response);
        }

        return response;
    }
}

export const userUpdateEmailForPasswordImpl = new UserUpdateEmailForPasswordImpl();
import { logger } from "../config/loki.js";
import { ContextInterface, EmailVerificationLabelInterface } from "../database/interface/logger.js";
import { EmailVerificationResponse } from "../database/interface/response.js";
import { userEmailVerificationRepositoriesImpl } from "../database/repositories/user_email_verification.js";
import { Constants } from "../utils/constants.js";
import { helper } from "../utils/helper.js";
import { DecryptedAuthTokenInterface } from "../utils/interface.js";

interface UserEmailVerificationController {
    verifyEmail(token: string, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse>
}

class UserEmailVerificationControllerImpl implements UserEmailVerificationController {
    async verifyEmail(token: string, context: ContextInterface, labels: EmailVerificationLabelInterface): Promise<EmailVerificationResponse> {
        let response = new EmailVerificationResponse();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            token: token,
        };

        try {
            const decryptedAuthToken: DecryptedAuthTokenInterface = helper.decryptAuthToken(token);

            const userResponse: EmailVerificationResponse = await userEmailVerificationRepositoriesImpl.verifyEmail(decryptedAuthToken, context, labels);
            response = userResponse;
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CONTROLLER);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new EmailVerificationResponse(error);
        }

        return response;
    }
}

export const userEmailVerificationControllerImpl = new UserEmailVerificationControllerImpl();
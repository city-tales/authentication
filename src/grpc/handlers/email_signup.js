import { userSignUpControllerImpl } from "../../controllers/email_signup.js";
import { SignUpError } from "../../utils/errors.js";

export const emailSignUp = async (call, callback) => {
    const requestBody = call.request;
    let toRet;

    try {
        const response = await userSignUpControllerImpl.createUser(requestBody.userEmailSignUpRequest, requestBody.userDeviceInformation);

        toRet = response;
    }
    catch (error) {
        toRet = error;
    }

    callback(null, toRet);
};

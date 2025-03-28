import { userSignUpControllerImpl } from "../../controllers/email_signup.js";

export const emailSignUp = async (call, callback) => {
    const requestBody = call.request;
    let toRet;

    try {
        const response = await userSignUpControllerImpl.createUser(requestBody.userEmailSignUpRequest, requestBody.userDeviceInformation);

        toRet = response;
    }
    catch (error) {
        console.log(error);
    }

    callback(null, toRet);
};

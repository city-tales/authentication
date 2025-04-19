import { userLoginControllerImpl } from "../../controllers/email_login.js";

const emailLogin = async (call, callback) => {
    const request = call.request;
    let toRet;

    try {
        const response = await userLoginControllerImpl.loginUser(request.userEmailLoginRequest, request.userDeviceInformation);
        toRet = response;
    }
    catch (error) {
        toRet = error;
    }

    callback(null, toRet);
};

export {
    emailLogin,
}
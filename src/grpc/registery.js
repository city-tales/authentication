import { rpcRequestProto } from "../config/imports.js";
import { emailLogin } from "./handlers/email_login.js";
import { emailSignUp } from "./handlers/email_signup.js";
import { emailVerification } from "./handlers/email_verification.js";
import { passwordlessAuthentication } from "./handlers/passwordless_authentication.js";
import { googleAuthentication } from "./handlers/google_authentication.js";
import { emailForgotPassword } from "./handlers/email_forgot_password.js";
import { updateEmailForPassword } from "./handlers/update_email_for_password.js";

const rpcServiceMap = {
    EmailLogin: emailLogin,
    EmailSignUp: emailSignUp,
    EmailVerification: emailVerification,
    PasswordlessAuthentication: passwordlessAuthentication,
    GoogleAuthentication: googleAuthentication,
    EmailForgotPassword: emailForgotPassword,
    UpdatePasswordForEmail: updateEmailForPassword,
};

const registerService = (server) => {
    server.addService(rpcRequestProto.service.RpcRequestService.service, rpcServiceMap);
};

export {
    registerService,
};



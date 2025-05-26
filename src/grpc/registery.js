import { rpcRequestProto } from "../config/imports.js";
import { emailLogin } from "./handlers/email_login.js";
import { emailSignUp } from "./handlers/email_signup.js";
import { emailVerification } from "./handlers/email_verification.js";
import { passwordlessAuthentication } from "./handlers/passwordless_authentication.js";

const rpcServiceMap = {
    EmailLogin: emailLogin,
    EmailSignUp: emailSignUp,
    EmailVerification: emailVerification,
    PasswordlessAuthentication: passwordlessAuthentication,
};

const registerService = (server) => {
    server.addService(rpcRequestProto.service.RpcRequestService.service, rpcServiceMap);
};

export {
    registerService,
};



import { rpcRequestProto } from "../config/imports.js";
import { emailLogin } from "./handlers/email_login.js";
import { emailSignUp } from "./handlers/email_signup.js";
import { emailVerification } from "./handlers/email_verification.js";
import { passwordlessAuthentication } from "./handlers/passwordless_authentication.js";
import { googleAuthentication } from "./handlers/google_authentication.js";
import { emailForgotPassword } from "./handlers/email_forgot_password.js";

const rpcServiceMap = {
    EmailLogin: emailLogin,
    EmailSignUp: emailSignUp,
    EmailVerification: emailVerification,
    PasswordlessAuthentication: passwordlessAuthentication,
    GoogleAuthentication: googleAuthentication,
    EmailForgotPassword: emailForgotPassword,
    HealthCheck: healthCheck,
};

const registerService = (server) => {
    server.addService(
        rpcRequestProto.service.RpcRequestService.service,
        rpcServiceMap,
    );

    // grpc-js stores handlers in a Map at server.handlers (internal). Object.keys() on a Map returns [].
    // This logs the registered method paths if available, otherwise falls back to the map keys we provided.
    const registered =
        server && server.handlers && typeof server.handlers.keys === "function"
            ? Array.from(server.handlers.keys())
            : Object.keys(rpcServiceMap);
    console.log(
        "Registered gRPC handlers:",
        `(${registered.length})`,
        registered,
    );
};

export { registerService };

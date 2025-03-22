const { rpcRequestProto } = require("./imports.js");
const { emailLogin } = require("../auth/login/email.js");
const { emailSignUp } = require("../auth/signup/email.js");

const rpcServiceMap = {
    EmailLogin: emailLogin,
    EmailSignUp: emailSignUp,
}

const registerService = (server) => {
    server.addService(rpcRequestProto.service.RpcRequestService.service, rpcServiceMap);
};

module.exports = {
    registerService,
};



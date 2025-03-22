require('dotenv').config();
const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const PROTO_PATH = "../shared-proto/authentication/service/rpc_request.proto";

const port = process.env.PORT;
const serverUrl = process.env.BASE_URL || `127.0.0.1:${port}`;

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const rpcRequestProto = grpc.loadPackageDefinition(packageDefinition);

module.exports = {
    grpc,
    rpcRequestProto,
    serverUrl,
    port,
};

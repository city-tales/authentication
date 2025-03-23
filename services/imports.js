const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");
const express = require("express");
const { Pool } = require("pg");
const { createClient } = require("redis");

const PROTO_PATH = "../shared-proto/authentication/service/rpc_request.proto";

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
    createClient,
    grpc,
    rpcRequestProto,
    express,
    Pool,
};

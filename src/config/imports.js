import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import express from "express";
import postgres from "pg"; const { Pool } = postgres;
import redis from "redis"; const { createClient } = redis;

const PROTO_PATH = "../shared-proto/authentication/rpc_request.proto";

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const rpcRequestProto = grpc.loadPackageDefinition(packageDefinition);

export {
    createClient,
    grpc,
    rpcRequestProto,
    express,
    Pool,
};

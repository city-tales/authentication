import grpc from "@grpc/grpc-js";
import protoLoader from "@grpc/proto-loader";
import jwt from "jsonwebtoken";
import lodash from "lodash";
import _ from "lodash";
import * as crypto from "crypto";
import { faker } from "@faker-js/faker";
import postgres from "pg";
const { Pool } = postgres;
import redis from "redis";
const { createClient } = redis;
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    uniqueUsernameGenerator,
    adjectives,
    nouns,
} from "unique-username-generator";
import { Worker, Job, Queue } from "bullmq";
import { createLogger, transports, format } from "winston";
import winston from "winston";
import LokiTransport from "winston-loki";
import { v4 as uuidv4 } from "uuid";

// Resolve absolute path to rpc_request.proto across environments (src, dist, Docker)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const protoCandidates = [
    // When running from src (ts-node or node with ES modules)
    path.resolve(__dirname, "../shared-proto/authentication/rpc_request.proto"),

    // When running from dist after build
    path.resolve(
        __dirname,
        "../../shared-proto/authentication/rpc_request.proto",
    ),

    // From project root current working directory
    path.resolve(
        process.cwd(),
        "shared-proto/authentication/rpc_request.proto",
    ),

    // Dockerfile copies shared-proto to /home/shared-proto
    "/home/shared-proto/authentication/rpc_request.proto",
];

const PROTO_PATH = (() => {
    for (const p of protoCandidates) {
        try {
            if (fs.existsSync(p)) return p;
        } catch (_) {
            // ignore and continue
        }
    }
    throw new Error(
        `rpc_request.proto not found. Tried: \n${protoCandidates.join("\n")}`,
    );
})();

const options = {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,

    // Ensure relative imports like "./device.proto" resolve from the same folder
    includeDirs: [path.dirname(PROTO_PATH)],
};

const packageDefinition = protoLoader.loadSync(PROTO_PATH, options);
const rpcRequestProto = grpc.loadPackageDefinition(packageDefinition);

export {
    createClient,
    grpc,
    rpcRequestProto,
    jwt,
    lodash,
    _,
    crypto,
    faker,
    Pool,
    uniqueUsernameGenerator,
    adjectives,
    nouns,
    Worker,
    Job,
    Queue,
    createLogger,
    transports,
    format,
    winston,
    LokiTransport,
    uuidv4,
};

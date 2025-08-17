import "dotenv/config";
import { Constants } from "../utils/constants.js";

// Service role selection: 'http' or 'grpc'. Defaults to 'http'.
const role = (process.env.ROLE || "http").toLowerCase();

// Cloud Run provides PORT for the externally exposed listener
const cloudRunPort = parseInt(process.env.PORT || "2221", 10);

// Optional explicit side-port envs; otherwise use sane defaults
const sideHttpPort = parseInt(
    process.env.HTTP_PORT || process.env.HTTP_SIDE_PORT || "2222",
    10,
);
const sideGrpcPort = parseInt(
    process.env.GRPC_PORT || process.env.GRPC_SIDE_PORT || "5051",
    10,
);

// Decide which server takes the Cloud Run PORT based on ROLE
const httpPort = role === "http" ? cloudRunPort : sideHttpPort;
const grpcPort = role === "grpc" ? cloudRunPort : sideGrpcPort;

// Always bind on 0.0.0.0 to be reachable inside the container
const httpServerUrl = `0.0.0.0:${httpPort}`;
const grpcServerUrl = `0.0.0.0:${grpcPort}`;

const dbUsername = process.env.DB_USERNAME;
const dbName = process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = process.env.DB_PORT;
const cacheDBRedisUsername = process.env.CACHE_DB_REDIS_USERNAME;
const cacheDBRedisPassword = process.env.CACHE_DB_REDIS_PASSWORD;
const cacheDBRedisHost = process.env.CACHE_DB_REDIS_HOST;
const cacheDBRedisPort = process.env.CACHE_DB_REDIS_PORT;
const queueDBRedisUsername = process.env.QUEUE_DB_REDIS_USERNAME;
const queueDBRedisPassword = process.env.QUEUE_DB_REDIS_PASSWORD;
const queueDBRedisHost = process.env.QUEUE_DB_REDIS_HOST;
const queueDBRedisPort = parseInt(process.env.QUEUE_DB_REDIS_PORT);
const queueDBRedisUrl = process.env.QUEUE_DB_REDIS_URL;
const lokiLoggerName = process.env.LOKI_LOGGER_NAME;
const lokiLoggerUrl = process.env.LOKI_LOGGER_URL;
const lokiLoggerUser = process.env.LOKI_LOGGER_USER;
const lokiLoggerToken = process.env.LOKI_LOGGER_TOKEN;
const privateKey = process.env.JWT_PRIVATE_KEY;
const jwtPublicKey = process.env.JWT_PUBLIC_KEY;

export {
    // role/ports
    grpcPort,
    grpcServerUrl,
    httpPort,
    httpServerUrl,
    dbUsername,
    dbName,
    dbHost,
    dbPassword,
    dbPort,
    cacheDBRedisUsername,
    cacheDBRedisPassword,
    cacheDBRedisHost,
    cacheDBRedisPort,
    queueDBRedisUsername,
    queueDBRedisPassword,
    queueDBRedisHost,
    queueDBRedisPort,
    queueDBRedisUrl,
    lokiLoggerName,
    lokiLoggerUrl,
    lokiLoggerUser,
    lokiLoggerToken,
    privateKey,
    jwtPublicKey,
};

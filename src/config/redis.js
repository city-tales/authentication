import { createClient } from "./imports.js";
import {
    cacheDBRedisUsername,
    cacheDBRedisPassword,
    cacheDBRedisHost,
    cacheDBRedisPort,
    queueDBRedisUsername,
    queueDBRedisPassword,
    queueDBRedisHost,
    queueDBRedisPort,
    queueDBRedisUrl,
} from "./config.js";
import { Constants } from "../utils/constants.js";
import { NetworkHelper } from "../utils/network.js";

const cacheDB = createClient({
    username: cacheDBRedisUsername,
    password: cacheDBRedisPassword,
    socket: {
        host: cacheDBRedisHost,
        port: Number(cacheDBRedisPort),
        tls: {
            rejectUnauthorized: NetworkHelper.isProdEnv(),
        },
    },
});

/* Url must comply TLS */
const queueDB = createClient({
    url: queueDBRedisUrl,
});

const bullMQConnectionObject = {
    connection: {
        host: queueDBRedisHost,
        port: queueDBRedisPort,
        password: queueDBRedisPassword,
        tls: {
            rejectUnauthorized: NetworkHelper.isProdEnv(),
        },
        maxRetriesPerRequest: NetworkHelper.isProdEnv()
            ? Constants.DB_TIMEOUTS.PROD_REDIS_MAX_CONNECTIONS
            : Constants.DB_TIMEOUTS.DEMO_REDIS_MAX_CONNECTIONS,
    },
};

var settings = {
    stalledInterval: Constants.QUEUE_DB.STALLED_TIMEOUT_INTERVAL,
    guardInterval: Constants.QUEUE_DB.GUARD_TIMEOUT_INTERVAL,
    drainDelay: Constants.QUEUE_DB.DRAIN_DELAY_TIMEOUT,
};

const defaultQueueSettings = {
    attempts: Constants.QUEUE_DB.MAX_ATTEMPTS,
    backoff: {
        type: Constants.QUEUE_DB.BACKOFF_EXPONENTIAL,
        delay: Constants.QUEUE_DB.BACKOFF_DELAY,
    },
};

/* -- Without IO Redis
const queueDB = createClient({
    url: queueDBRedisUrl
});
*/

/* --------- IO Redis
const queueDB = new IORedis({
    host: queueDBRedisHost,
    port: Number(queueDBRedisPort),
    username: queueDBRedisUsername,
    password: queueDBRedisPassword,
    tls: {
        rejectUnauthorized: false, // Only for dev/test
    },
});
*/

/* 
const queueDB = createClient({
    username: queueDBRedisUsername,
    password: queueDBRedisPassword,
    socket: {
        host: queueDBRedisHost,
        port: Number(queueDBRedisPort),
        connectTimeout: Constants.DB_TIMEOUTS.QUEUE_DB_REDIS_TIMEOUT,
    },
    tls: {
        rejectUnauthorized: false, // only for testing
        // rejectUnauthorized: true, // true for production
    },
});
*/

export { cacheDB, queueDB, defaultQueueSettings, bullMQConnectionObject };

import 'dotenv/config';
import { Constants } from '../utils/constants.js';

const port = process.env.PORT;
const serverUrl = process.env.BASE_URL || Constants.SERVER_URL;
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
const privateKey = process.env.JWT_PRIVATE_KEY;

export {
    port, 
    serverUrl,
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
    privateKey,
};
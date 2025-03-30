import 'dotenv/config';
import { Constants } from '../utils/constants.js';

const port = process.env.PORT;
const serverUrl = process.env.BASE_URL || Constants.SERVER_URL;
const dbUsername = process.env.DB_USERNAME;
const dbName = process.env.DB_DATABASE;
const dbHost = process.env.DB_HOST;
const dbPassword = process.env.DB_PASSWORD;
const dbPort = process.env.DB_PORT;
const redisUsername = process.env.REDIS_USERNAME;
const redisPassword = process.env.REDIS_PASSWORD;
const redisHost = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const privateKey = process.env.JWT_PRIVATE_KEY;

export {
    port, 
    serverUrl,
    dbUsername,
    dbName,
    dbHost,
    dbPassword,
    dbPort,
    redisUsername,
    redisPassword,
    redisHost,
    redisPort,
    privateKey,
};
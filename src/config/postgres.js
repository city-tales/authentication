import { Pool } from "./imports.js";
import { dbUsername, dbHost, dbName, dbPassword, dbPort } from "./config.js";
import { Constants } from "../utils/constants.js";
import { NetworkHelper } from "../utils/network.js";

const pool = new Pool({
    user: dbUsername,
    host: dbHost,
    database: dbName,
    password: dbPassword,
    port: Number(dbPort) || Constants.DB_PORT,
    ssl: NetworkHelper.isProdEnv()
        ? { rejectUnauthorized: true }
        : { rejectUnauthorized: false },
    connectionTimeoutMillis: Constants.DB_TIMEOUTS.CONNECTION_TIMEOUT,
    idleTimeoutMillis: Constants.DB_TIMEOUTS.IDLE_TIMEOUT,
    query_timeout: Constants.DB_TIMEOUTS.QUERY_TIMEOUT,
    lock_timeout: Constants.DB_TIMEOUTS.LOCK_TIMEOUT,
});

export { pool };

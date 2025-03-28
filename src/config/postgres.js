import { Pool } from "./imports.js";
import { dbUsername, dbHost, dbName, dbPassword, dbPort } from "./config.js";

const pool = new Pool({
    user: dbUsername,
    host: dbHost,
    database: dbName,
    password: dbPassword,
    port: Number(dbPort) || 5432,
    ssl: {
        rejectUnauthorized: false, // only for testing
        // rejectUnauthorized: true, /* true for production */
    }
});

export { pool };
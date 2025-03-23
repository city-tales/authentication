const { Pool } = require("../services/imports.js");
const { dbUsername, dbHost, dbName, dbPassword, dbPort } = require("../services/config.js");

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

module.exports = {
    pool,
}
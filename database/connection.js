const { Pool, createClient } = require("../services/imports.js");
const { dbUsername, dbHost, dbName, dbPassword, dbPort, redisUsername, redisPassword, redisHost, redisPort } = require("../services/config.js");

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

const client = createClient({
    username: redisUsername,
    password: redisPassword,
    socket: {
        host: redisHost,
        port: Number(redisPort),
    }
});
client.on('error', err => console.log('Redis Client Error', err));

module.exports = {
    pool,
    client,
}
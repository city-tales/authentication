import "./postgres.js";
import { client } from "./redis.js";
import { redisPort } from "./config.js";

async function redisConnection() {
    try {
        await client.connect();
        console.log(`Redis running on PORT ${redisPort}`);
    }
    catch (error) {
        console.log(`Redis connection failed ${error}`);
    }
};
redisConnection();
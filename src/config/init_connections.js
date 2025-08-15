import "../utils/queue.js";
import "./postgres.js";
import "./loki.js";
import { cacheDB, queueDB } from "./redis.js";
import { cacheDBRedisPort, queueDBRedisPort } from "./config.js";
import { queueEmployee } from "../utils/workers.js";

async function cacheDBredisConnection() {
    try {
        cacheDB.on("error", (err) => {
            console.error("Cache DB Redis client error:", err);
        });

        cacheDB.on("end", () => {
            console.log("Cache DB Redis client connection closed");
        });

        await cacheDB.connect();
        console.log(`Cache Redis running on PORT ${cacheDBRedisPort}`);
    } catch (error) {
        console.log(`Redis connection failed ${error}`);
    }
}

async function queueDBredisConnection() {
    try {
        queueDB.on("end", () => {
            console.log("Queue DB Redis client connection closed");
        });

        queueDB.on("error", (err) => {
            console.error("Queue DB Redis client error:", err);
        });

        await queueDB.connect();
        console.log(`Queue Redis running on PORT ${queueDBRedisPort}`);
    } catch (error) {
        console.log(`Redis connection failed ${error}`);
    }
}

cacheDBredisConnection();
queueDBredisConnection();
queueEmployee.startWorkers();

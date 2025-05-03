import { Constants } from "./constants.js"
import { Queue } from "../config/imports.js";
import { bullMQConnectionObject } from "../config/redis.js";

export const saveInRedisQueueEmployee = new Queue(Constants.DB.SAVE_IN_REDIS, {
    connection: bullMQConnectionObject.connection
});

export const saveInDBQueueEmployee = new Queue(Constants.DB.SAVE_IN_DB, {
    connection: bullMQConnectionObject.connection
});
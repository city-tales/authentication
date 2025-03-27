import { createClient } from "./imports.js";
import { redisUsername, redisPassword, redisHost, redisPort } from "./config.js";

const client = createClient({
    username: redisUsername,
    password: redisPassword,
    socket: {
        host: redisHost,
        port: Number(redisPort),
    }
});

export {
    client,
}

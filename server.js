const { grpc, express } = require("./services/imports.js");
const { serverUrl, port, dbPort, redisPort } = require("./services/config.js");
const { registerService } = require("./services/registery.js");
const { client } = require("./database/connection.js");

const server = new grpc.Server();
const app = express();

registerService(server);
server.bindAsync(
    serverUrl, 
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if(error) {
            console.log(`GPRC Server not setup ${error}`);
            return;
        }
        console.log(`GPRC Server running on PORT ${port}`);
    }
);

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

app.listen(port, () => {
    console.log(`App running on PORT ${dbPort}`);
});
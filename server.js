const { grpc, express } = require("./services/imports.js");
const { serverUrl, port, dbPort } = require("./services/config.js");
const { registerService } = require("./services/registery.js");

const server = new grpc.Server();
const app = express();

registerService(server);
server.bindAsync(
    serverUrl, 
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if(error) {
            console.log(`Server not setup ${error}`);
            return;
        }
        console.log(`Server running on PORT ${port}`);
    }
);

app.listen(port, () => {
    console.log(`App running on PORT ${dbPort}`);
})
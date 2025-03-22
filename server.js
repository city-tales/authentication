const { grpc, serverUrl, port } = require("./services/imports.js");
const { registerService } = require("./services/registery.js");

const server = new grpc.Server();
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
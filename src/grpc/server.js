import { grpc } from "../config/imports.js";
import { serverUrl } from "../config/config.js";
import { registerService } from "./registery.js";

const server = new grpc.Server();

registerService(server);
server.bindAsync(
    serverUrl,
    grpc.ServerCredentials.createInsecure(),
    (error, port) => {
        if (error) {
            console.log(`GPRC Server not setup ${error}`);
            return;
        }
        console.log(`GPRC Server running on PORT ${port}`);
    },
);

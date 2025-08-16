import { grpc } from "../config/imports.js";
import { grpcServerUrl, grpcPort } from "../config/config.js";
import { registerService } from "./registery.js";

const server = new grpc.Server();

registerService(server);
server.bindAsync(
    grpcServerUrl,
    grpc.ServerCredentials.createInsecure(),
    (error, grpcPort) => {
        if (error) {
            console.log(`GPRC Server not setup ${error}`);
            process.exit(1);
        }
        console.log(`GPRC Server running on PORT ${grpcPort}`);
    },
);

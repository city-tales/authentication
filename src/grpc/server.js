import { grpc } from "../config/imports.js";
import { grpcServerUrl, grpcPort } from "../config/config.js";
import { registerService } from "./registery.js";

const server = new grpc.Server();

registerService(server);
server.bindAsync(
    grpcServerUrl,
    grpc.ServerCredentials.createInsecure(),
    (error, boundPort) => {
        if (error) {
            console.log(`gRPC server failed to bind: ${error}`);
            process.exit(1);
        }
        server.start();
        console.log(
            `gRPC server running on ${grpcServerUrl} (bound PORT ${boundPort})`,
        );
    },
);

import "dotenv/config";
import "./config/init_connections.js";
import "./grpc/server.js";

import { express } from "./config/imports.js";
import { port } from "./config/config.js";

const app = express();

app.listen(port, () => {
    console.log(`App running on PORT ${port}`);
});

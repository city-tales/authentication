import "dotenv/config";
import "./config/init_connections.js";
import "./grpc/server.js";

import { express } from "./config/imports.js";
import { httpPort } from "./config/config.js";
import { Constants } from "./utils/constants.js";

const app = express();

app.get("/", (req, res) => {
    res.status(200).json({
        status: Constants.STATUS_CODES.OK,
        message: `Server is running on PORT ${httpPort}`,
    });
});

app.listen(httpPort, () => {
    console.log(`App running on PORT ${httpPort}`);
});

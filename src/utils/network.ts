import { nodeEnv } from "../config/config.js";
import { Constants } from "./constants.js";

export class NetworkHelper {
    static isProdEnv() {
        return nodeEnv?.toLowerCase() ===
            Constants.DEV_CONTROLLER.PRODUCTION.toLowerCase()
            ? true
            : false;
    }
}

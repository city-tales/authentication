import { Constants } from "../utils/constants.js";
import { lokiLoggerToken, lokiLoggerUrl, lokiLoggerUser } from "./config.js";
import { winston, createLogger, LokiTransport } from "./imports.js";

const options = {
    transports: [
        new LokiTransport({
            host: lokiLoggerUrl!,
            labels: { 
                app: Constants.LOKI_LOGGER.APPLICATION,
                env: Constants.LOKI_LOGGER.DEMOENV, // For local environment
                // env: Constants.LOKI_LOGGER.PRODENV, // For prod environment
            }, // default labels
            // json: Helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.TRUE),
            basicAuth: `${lokiLoggerUser}:${lokiLoggerToken}`,
            format: winston.format.json(),
            // replaceTimestamp: true,
            onConnectionError: (error) => console.error(error),
        }),
    ]
};

export const logger = createLogger(options);

/* -------- Pino Loki ----------
const transport = pino.transport<LokiOptions>({
    target: 'pino-loki',
    options: {
        labels: {
            application: Constants.LOKI_LOGGER.APPLICATION,
            env: Constants.LOKI_LOGGER.DEMOENV, //  For local testing 
            // env: Constants.LOKI_LOGGER.DEMOENV, // Prod environment 
        },
        labelKeys: ['module', 'context', 'userId'], 
        levelMap: {
            10: LokiLogLevel.Info,
            20: LokiLogLevel.Warning,
            30: LokiLogLevel.Debug,
            40: LokiLogLevel.Critical,
            50: LokiLogLevel.Error
        },
        host: lokiLoggerUrl!,
        basicAuth: {
            username: lokiLoggerUser!,
            password: lokiLoggerToken!,
        },
    },
});
*/
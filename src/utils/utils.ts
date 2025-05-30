import { uuidv4 } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { DeviceType } from "../database/types/device_info.js";
import { ContextType, GenericLabelType } from "../database/types/logger.js";
import { PasswordlessAuthenticationType } from "../database/types/user_passwordless_authentication.js";
import { Constants } from "./constants.js";
import { helper } from "./helper.js";
import { queueEmployee } from "./workers.js";

interface Utils {
	CURRENT_TIME(): string;
	logUserDevice(deviceInfo: DeviceType, context: ContextType, labels: GenericLabelType): Promise<void>;
}

class UtilsImpl implements Utils {
	CURRENT_TIME(): string {
		return new Date().toISOString();
	}

	async logUserDevice(deviceInfo: DeviceType, context: ContextType, labels: GenericLabelType): Promise<void> {
		const deviceTableName = Constants.TABLES.DEVICE_TABLE;
		const deviceDataQuery = `INSERT INTO ${deviceTableName} VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`;
		const deviceValuesArray = Object.values(deviceInfo);

		let loggerDefaultParams = {};
		let logPayload = {
			labels,
			query: deviceDataQuery,
			values: deviceValuesArray,
		};

		try {
			await queueEmployee.addJobToQueue(context, labels, Constants.DB.SAVE_IN_DB, {
				query: deviceDataQuery,
				valuesArray: deviceValuesArray,
				errorMessage: Constants.DB_ERRORS.INSERTION_FAILED,
			});
		}
		catch (error) {
			loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.MODELS, context.source);
			logPayload = { ...logPayload, ...loggerDefaultParams };
			logPayload = helper.logErrorStack(logPayload, error);
			logger.error({ ...logPayload });
		}
	}
}

export const utils = new UtilsImpl();
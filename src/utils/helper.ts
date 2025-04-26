import { privateKey } from "../config/config.js";
import { crypto, adjectives, nouns, uniqueUsernameGenerator, faker, jwt, uuidv4 } from "../config/imports.js";
import { pool } from "../config/postgres.js";
import { cacheDB } from "../config/redis.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { GPRCUserSignUpInterface, UserSignUpInterface } from "../database/interface/user_signup.js";
import { Constants } from "./constants.js";
import { RedisError } from "./errors.js";
import { RedisEmailKeySerialisation } from "./interface.js";
import { MultipleQueryObject } from "./custom_types.js";
import { ContextInterface } from "../database/interface/logger.js";
import { logger } from "../config/loki.js";

interface Helper {
    createQueryColumn(columns: unknown): unknown;
    formatQueryValue(value: unknown): string;
    createQueryValues(values: unknown): unknown;
    executeQueryAsyncWithoutLock(context: ContextInterface, query: unknown, valuesArray?, errorMessage?: string, labels?, queryTimeout?: number);
    executeMultipleQueryAsyncWithoutLock(queries: MultipleQueryObject[], errorMessage?: string, queryTimeout?: number);
    isInsertQuerySuccessful(queryCommand: string, rowCount: number): boolean;
    isSelectQuerySuccessful(queryCommand: string, fieldCount: number): boolean;
    generateAuthToken(_id: string, username: string): string;
    convertToClassType<T>(unknownValue: unknown, type: unknown): T;
    convertToType<T>(unknownValue: unknown): T;
    prepareUserRedisKeyValues(key: string, userInfo: RedisEmailKeySerialisation): Object;
    serialiseRedisKeyValues(keyValuePairs: Object): string;
    parseRedisValueToObject(value: string);
    setRedis(context: ContextInterface, labels, key: string, value: string): Promise<void>;
    mapDeviceSchema(deviceInfo: GPRCDeviceInterface, userId: string): DeviceInterface;
    parseBooleanString(truthValue: string | null | undefined): boolean;
    isEitherNullOrUndefined(value: number | string | null | undefined): boolean;
    isEitherNullOrUndefinedOrEmpty(value: number | string | null | undefined): boolean;
    isNeitherNullNorUndefined(value: number | string | null | undefined): boolean;
    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined): boolean;
    passStringNullParams(value: string | null | undefined): string | null;
    passNumberNullParams(value: number | null | undefined): number | null;
    generateUniqueUserName(userInfo: GPRCUserSignUpInterface): string;
    trimStringValue(value: string): string;
    sanitiseStringValue(value: string | null | undefined): string | null;
    sanitiseNumericValue(value: number | null | undefined): number | null;
    sanitiseObject(object: Object): Object;
    generateContext();
    generateDefaultSuccessParams(tracerId: string, codeIdentifier?: string, source?: string | undefined);
    generateDefaultFailureParams(tracerId: string, codeIdentifier?: string, source?: string | undefined);
};

export class HelperImpl implements Helper {
    createQueryColumn(columns: any): any {
        const column = Object.keys(columns).join(', ');
        return column;
    }

    formatQueryValue(value: unknown): string {
        if (typeof value === 'number') return `'${value}'`;
        if (value instanceof Date) return `'${value.toISOString()}'`;
        return `'${value as string}'`;
    }

    createQueryValues(values: any): any {
        const value = Object.values(values).map(this.formatQueryValue).join(', ');
        return value;
    }

    async executeQueryAsyncWithoutLock(context: ContextInterface, query: any, valuesArray?, errorMessage?: string, labels?, queryTimeout?: number) {
        const dB = await pool.connect();
        let loggerDefaultParams = {};

        try {
            await dB.query(Constants.DB_COMMANDS.BEGIN)

            const queryConfig = {
                text: query,
                queryTimeout: queryTimeout ?? Constants.DB_TIMEOUTS.QUERY_TIMEOUT
            };
            const response = await dB.query(queryConfig, valuesArray);

            await dB.query(Constants.DB_COMMANDS.COMMIT);

            loggerDefaultParams = this.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logger.info({
                labels,
                ...loggerDefaultParams,
                queryConfig,
            });

            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);
            loggerDefaultParams = this.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logger.info({
                labels,
                ...loggerDefaultParams,
                error,
            });

            throw new Error(error.message);
        }
        finally {
            dB.release();
        }
    }

    async executeMultipleQueryAsyncWithoutLock(queries: MultipleQueryObject[], errorMessage?: string, queryTimeout?: number) {
        const dB = await pool.connect();
        const response: string[] = [];
        try {
            await dB.query(Constants.DB_COMMANDS.BEGIN);

            for (const { query, valuesArray } of queries) {
                const queryConfig = {
                    text: query,
                    queryTimeout: queryTimeout || Constants.DB_TIMEOUTS.QUERY_TIMEOUT
                };
                const queryResponse = await dB.query(queryConfig, valuesArray);

                if (this.isInsertQuerySuccessful(queryResponse.command, queryResponse.rowCount))
                    response.push(JSON.stringify(queryResponse));
                else
                    throw new Error(Constants.DB_ERRORS.DEFAULT_ERROR);
            }

            await dB.query(Constants.DB_COMMANDS.COMMIT);
            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);
            if (helper.isNeitherNullNorUndefinedNorEmpty(error.message))
                throw new Error(error.message);

            throw new Error(Constants.DB_ERRORS.DEFAULT_ERROR);
        }
        finally {
            dB.release();
        }
    }

    isInsertQuerySuccessful(queryCommand: string, rowCount: number): boolean {
        if (queryCommand === Constants.DB_COMMANDS.INSERT && rowCount) return true;
        return false;
    }

    isSelectQuerySuccessful(queryCommand: string, fieldCount: number): boolean {
        if (queryCommand === Constants.DB_COMMANDS.SELECT && fieldCount) return true;
        return false;
    }

    generateAuthToken(_id: string, username: string): string {
        const payload = {
            _id: _id,
            username: username,
        };

        const token: string = jwt.sign(payload, privateKey, {
            algorithm: Constants.JWT_CONFIG.ALGORITHM,
            expiresIn: Constants.JWT_CONFIG.EXPIRY
        });

        return token;
    }

    convertToClassType<T>(response: unknown, classType: new (...args: any[]) => T): T {
        return response as T;
    }

    convertToType<T>(response: unknown): T {
        return response as T;
    }

    prepareUserRedisKeyValues(key: string, userInfo: RedisEmailKeySerialisation): Object {
        return {
            key: key,
            email: this.isEitherNullOrUndefined(userInfo.email) ? Constants.SERIALISATION_KEYS.EMAIL : userInfo.email,
        }
    };

    serialiseRedisKeyValues(keyValuePairs: Object): string {
        const rawString = JSON.stringify(keyValuePairs);
        const serialisedString = rawString.replace(/"/g, "'");

        return serialisedString;
    }

    parseRedisValueToObject(value: string) {
        const serialisedString = value.replace(/'/g, '"');
        const deSerialisedObject = JSON.parse(serialisedString);

        return deSerialisedObject;
    }

    async setRedis(context: ContextInterface, labels, key: string, value: string): Promise<void> {
        const switchOffForDev: boolean = this.convertToType<boolean>(Constants.DEV_CONTROLLER.SWTICH_OFF_REDIS);
        if (switchOffForDev) return;

        let loggerDefaultParams = {};

        try {
            await cacheDB.set(key, value, {
                EX: Constants.DB_TIMEOUTS.CACHE_DB_REDIS_TIMEOUT
            });

            loggerDefaultParams = this.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CACHE_DB, Constants.DB.SAVE_IN_REDIS);
            logger.info({
                labels,
                ...loggerDefaultParams,
                request: {
                    key: key,
                    value: value,
                }
            });
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CACHE_DB);
            logger.error({
                labels,
                ...loggerDefaultParams,
                request: {
                    key: key,
                    value: value,
                },
                error,
            });

            throw new RedisError(error.message);
        }
    }

    mapDeviceSchema(deviceInfo: GPRCDeviceInterface, userId?: string): DeviceInterface {
        const sanitisedDeviceInfo: GPRCDeviceInterface = helper.convertToType<GPRCDeviceInterface>(
            helper.sanitiseObject(deviceInfo),
        );

        return {
            _id: uuidv4(),
            device_type: sanitisedDeviceInfo.deviceType,
            browser_info: sanitisedDeviceInfo.browserInfo,
            ip_address: sanitisedDeviceInfo.ipAddress,
            device_id: sanitisedDeviceInfo.deviceId,
            platform: sanitisedDeviceInfo.platform,
            device_name: sanitisedDeviceInfo.deviceName,
            login_time: sanitisedDeviceInfo.loginTime || Constants.CURRENT_TIME,
            user_id: userId ?? null,
        };
    }

    parseBooleanString(truthValue: string | null | undefined): boolean {
        if (this.isNeitherNullNorUndefined(truthValue))
            return truthValue === Constants.BOOLEAN_VALUES.TRUE ? true : false;
        return false;
    }

    isEitherNullOrUndefined(value: number | string | null | undefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isEitherNullOrUndefinedOrEmpty(value: number | string | null | undefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isNeitherNullNorUndefined(value: number | string | null | undefined): boolean {
        return (value !== null && value !== undefined) ? true : false;
    }

    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined): boolean {
        if (this.isNeitherNullNorUndefined(value)) {
            return this.trimStringValue(value as string) !== "" ? true : false;
        }
        return false;
    }

    passStringNullParams(value: string | null | undefined): string | null {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<string>(value);
    }

    passNumberNullParams(value: number | null | undefined): number | null {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<number>(value);
    }

    generateUniqueUserName(userInfo: GPRCUserSignUpInterface): string {
        const config = {
            dictionaries: [adjectives, nouns],
            separator: '-',
            length: 4,
        };

        const randomWord = uniqueUsernameGenerator(config);
        const randomSuffix = crypto.randomBytes(2).toString('hex');
        let emailPrefix: unknown, phonePrefix: unknown, baseUsername = '';

        if (this.isNeitherNullNorUndefinedNorEmpty(userInfo.email)) {
            emailPrefix = userInfo.email.split('@')[0];
            baseUsername += `${emailPrefix}-`;
        }
        else if (this.isNeitherNullNorUndefinedNorEmpty(userInfo.name)) {
            baseUsername += `${userInfo.name}-`;
        }

        if (!this.isNeitherNullNorUndefinedNorEmpty(userInfo.name))
            baseUsername += `${faker.person.lastName()}-`;
        baseUsername += `${randomWord}-`;

        if (this.isNeitherNullNorUndefinedNorEmpty(userInfo.phoneNumber)) {
            phonePrefix = userInfo.phoneNumber!.split('-')[1];
            baseUsername += (this.isNeitherNullNorUndefinedNorEmpty(
                helper.convertToType<string>(phonePrefix)) ? `${phonePrefix}-` : `${faker.number.int(
                    { min: 100, max: 999 })
                }-`)
        }
        baseUsername += `${randomSuffix}`;

        return baseUsername;
    }

    trimStringValue(value: string): string {
        value = value?.trimStart();
        value = value?.trimEnd();
        return value;
    }

    sanitiseStringValue(value: string | null | undefined): string | null {
        return this.isNeitherNullNorUndefinedNorEmpty(value) ? this.convertToType<string>(value) : null;
    }

    sanitiseNumericValue(value: number | null | undefined): number | null {
        return this.isNeitherNullNorUndefined(value) ? this.convertToType<number>(value) : null;
    }

    sanitiseObject(object: Object): Object {
        return Object.fromEntries(
            Object.entries(object).map(([key, value]) => {
                if (typeof value === 'number') return [key, this.sanitiseNumericValue(value)];
                else if (typeof value === 'string') return [key, this.sanitiseStringValue(value)];
                return [key, value];
            }),
        );
    }

    generateContext() {
        const tracerId = uuidv4();
        return {
            tracerId: tracerId,
        };
    }

    generateDefaultSuccessParams(tracerId: unknown, codeIdentifier?: string, source?: string | undefined) {
        const timestamp = Date.now();

        return {
            success: true,
            distributedTraceId: tracerId,
            timestamp: timestamp,
            requestType: Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE,
            ...(this.isNeitherNullNorUndefinedNorEmpty(codeIdentifier) && { codeIdentifier }),
            ...(this.isNeitherNullNorUndefinedNorEmpty(source) && { source })
        };
    }

    generateDefaultFailureParams(tracerId: unknown, codeIdentifier?: string, source?: string | undefined) {
        const timestamp = Date.now();

        return {
            success: false,
            distributedTraceId: tracerId,
            timestamp: timestamp,
            requestType: Constants.LOKI_LOGGER_LABELS.REQUEST_TYPE,
            ...(this.isNeitherNullNorUndefinedNorEmpty(codeIdentifier) && { codeIdentifier }),
            ...(this.isNeitherNullNorUndefinedNorEmpty(source) && { source })
        };
    }
}

export const helper = new HelperImpl(); 
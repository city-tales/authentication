import { jwtPublicKey, privateKey } from "../config/config.js";
import { crypto, adjectives, nouns, uniqueUsernameGenerator, faker, jwt, uuidv4 } from "../config/imports.js";
import { pool } from "../config/postgres.js";
import { cacheDB } from "../config/redis.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { GPRCUserSignUpInterface, UserSignUpInterface } from "../database/interface/user_signup.js";
import { Constants } from "./constants.js";
import { DecryptedAuthTokenInterface, RedisEmailKeySerialisation } from "./interface.js";
import { MultipleQueryObject } from "./custom_types.js";
import { ContextInterface } from "../database/interface/logger.js";
import { logger } from "../config/loki.js";
import { AuthVerificationInterface } from "../database/interface/auth_verification.js";
import { RedisResponse } from "../database/interface/response.js";

interface Helper {
    createQueryColumn(columns: unknown): unknown;
    formatQueryValue(value: unknown): string;
    createQueryValues(values: unknown): unknown;
    createAuthSchema(userId: string): AuthVerificationInterface;
    executeQueryAsyncWithoutLock(context: ContextInterface, query: unknown, valuesArray?, errorMessage?: string, labels?, queryTimeout?: number);
    executeMultipleQueryAsyncWithoutLock(context: ContextInterface, queries: MultipleQueryObject, errorMessage?: string, labels?, queryTimeout?: number);
    isInsertQuerySuccessful(queryCommand: string, rowCount: number): boolean;
    isSelectQuerySuccessful(queryCommand: string, fieldCount: number): boolean;
    isUpdateQuerySuccessful(queryCommand: string, rowCount: number): boolean;
    generateAuthToken(_id: string, username: string, email: string): string;
    decryptAuthToken(token: string): DecryptedAuthTokenInterface;
    convertToClassType<T>(unknownValue: unknown, type: unknown): T;
    convertToType<T>(unknownValue: unknown, type: 'boolean' | 'number' | 'string' | 'object' | 'Object' | 'interface'): T;
    prepareUserRedisKeyValues(key: string, userInfo: RedisEmailKeySerialisation): Object;
    prepareVerificationUserRedisKeyValues(key: string, userInfo): Object;
    serialiseRedisKeyValues(keyValuePairs: Object): string;
    parseRedisValueToObject(value: string);
    setRedis(context: ContextInterface, labels, key: string, value: string, timeout?: number): Promise<void>;
    mapDeviceSchema(deviceInfo: GPRCDeviceInterface, userId: string): DeviceInterface;
    parseBooleanString(truthValue: string | null | undefined): boolean;
    isNotEmpty(value: string): boolean;
    isValidNumeric(value: number): boolean;
    isValidBoolean(value: boolean): boolean;
    isEitherNullOrUndefined(value: string | null | undefined): boolean;
    isEitherNullOrUndefinedOrEmpty(value: string | null | undefined): boolean;
    isGenericEitherNullOrUndefined(value: boolean | number | string | null | undefined): boolean;
    isNeitherNullNorUndefined(value: string | null | undefined): boolean;
    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined): boolean;
    isGenericNeitherNullNorUndefined(value: boolean | number | string | null | undefined): boolean;
    isGenericNeitherNullNorUndefinedNorInvalid(value: boolean | number | string | null | undefined): boolean;
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
    logErrorStack(logPayload: any, error: any);
    logResponse(logPayload: any, response);
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

    createAuthSchema(userId: string): AuthVerificationInterface {
        return {
            _id: uuidv4(),
            is_email_verified: false,
            is_google_verified: false,
            is_apple_verified: false,
            is_passwordless: false,
            is_mfa_enabled: false,
            user_id: userId,
        };
    }

    async executeQueryAsyncWithoutLock(context: ContextInterface, query: any, valuesArray?, errorMessage?: string, labels?, queryTimeout?: number) {
        const dB = await pool.connect();
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };

        try {
            await dB.query(Constants.DB_COMMANDS.BEGIN)

            const queryConfig = {
                text: query,
                queryTimeout: queryTimeout ?? Constants.DB_TIMEOUTS.QUERY_TIMEOUT
            };
            const response = await dB.query(queryConfig, valuesArray);

            await dB.query(Constants.DB_COMMANDS.COMMIT);

            loggerDefaultParams = this.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...queryConfig };
            logPayload = helper.logResponse(logPayload, response);
            logger.info({ ...logPayload });

            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);

            loggerDefaultParams = this.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new Error(error.message);
        }
        finally {
            dB.release();
        }
    }

    async executeMultipleQueryAsyncWithoutLock(context: ContextInterface, queries: MultipleQueryObject, errorMessage?: string, labels?, queryTimeout?: number) {
        const dB = await pool.connect();
        const response: string[] = [];
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
        };

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

            loggerDefaultParams = this.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...queries };
            logPayload = helper.logResponse(logPayload, response);
            logger.info({ ...logPayload });

            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);

            loggerDefaultParams = this.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new Error(error.message);
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

    isUpdateQuerySuccessful(queryCommand: string, rowCount: number): boolean {
        if (queryCommand === Constants.DB_COMMANDS.UPDATE && rowCount) return true;
        return false;
    }

    generateAuthToken(_id: string, username: string, email: string): string {
        const payload = {
            _id: _id,
            username: username,
            email: email,
        };

        const token: string = jwt.sign(payload, privateKey, {
            algorithm: Constants.JWT_CONFIG.ALGORITHM,
            expiresIn: Constants.JWT_CONFIG.EXPIRY
        });

        return token;
    }

    decryptAuthToken(token: string): DecryptedAuthTokenInterface {
        try {
            const payload = jwt.verify(token, jwtPublicKey, {
                algorithms: Constants.JWT_CONFIG.ALGORITHM
            });
            return payload;
        }
        catch (error) {
            throw error;
        }
    }

    convertToClassType<T>(response: unknown, classType: new (...args: any[]) => T): T {
        return response as T;
    }

    convertToType<T>(response: any, type: 'boolean' | 'number' | 'string' | 'object' | 'Object' | 'interface'): T {
        if (type === 'boolean') {
            return (response === 'true' || response === true) as unknown as T;
        }
        if (type === 'number') {
            return Number(response) as unknown as T;
        }
        if (type === 'string') {
            return String(response) as unknown as T;
        }
        if (type === 'object' || type === 'Object') {
            if (typeof response === 'string') {
                return JSON.parse(response) as T;
            }
        }
        return response as T;
    }

    prepareUserRedisKeyValues(key: string, userInfo: RedisEmailKeySerialisation): Object {
        return {
            key: key,
            email: this.isEitherNullOrUndefined(userInfo.email) ? Constants.SERIALISATION_KEYS.EMAIL : userInfo.email,
        }
    };

    prepareVerificationUserRedisKeyValues(key: string, userInfo): Object {
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
        let serialisedString = value
            .replace(/'/g, '"')
            .replace(/([{,]\s*)("?)([a-zA-Z0-9_]+)\2(?=\s*:)/g, '$1"$3"');

        if (serialisedString.startsWith('"') && serialisedString.endsWith('"')) {
            serialisedString = serialisedString.slice(1, -1);
        }
        const deSerialisedObject = JSON.parse(serialisedString);

        return deSerialisedObject;
    }

    async setRedis(context: ContextInterface, labels, key: string, value: string, timeout?: number): Promise<void> {
        const switchOffForDev: boolean = this.convertToType<boolean>(Constants.DEV_CONTROLLER.SWTICH_OFF_REDIS, Constants.TYPE_SWITCH.BOOLEAN);
        if (switchOffForDev) return;

        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            request: {
                key: key,
                value: value,
            },
        };

        try {
            await cacheDB.set(key, value, {
                EX: timeout ?? Constants.DB_TIMEOUTS.CACHE_DB_REDIS_TIMEOUT
            });

            loggerDefaultParams = this.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CACHE_DB, Constants.DB.SAVE_IN_REDIS);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logger.info({ ...logPayload });
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.CACHE_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new RedisResponse(error);
        }
    }

    mapDeviceSchema(deviceInfo: GPRCDeviceInterface, userId?: string): DeviceInterface {
        const sanitisedDeviceInfo: GPRCDeviceInterface = helper.convertToType<GPRCDeviceInterface>(
            helper.sanitiseObject(deviceInfo), Constants.TYPE_SWITCH.INTERFACE
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

    isNotEmpty(value: string): boolean {
        return value === '' ? true : false;
    }

    isValidNumeric(value: number | null | undefined): boolean {
        return this.isGenericNeitherNullNorUndefined(value) && typeof value === 'number' ? true : false;
    }

    isValidBoolean(value: boolean | null | undefined): boolean {
        return this.isGenericNeitherNullNorUndefined(value) && typeof value === 'boolean' ? true : false;
    }
 
    isEitherNullOrUndefined(value: string | null | undefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isEitherNullOrUndefinedOrEmpty(value: string | null | undefined): boolean {
        if(this.isEitherNullOrUndefined(value)) return true;
        return this.trimStringValue(value as string) === "" ? true : false;
    }

    isGenericEitherNullOrUndefined(value: boolean | string | number | null | undefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isNeitherNullNorUndefined(value: string | null | undefined): boolean {
        return (value !== null && value !== undefined) ? true : false;
    }

    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined): boolean {
        if (this.isNeitherNullNorUndefined(value)) {
            return this.trimStringValue(value as string) !== "" ? true : false;
        }
        return false;
    }

    isGenericNeitherNullNorUndefined(value: boolean | number | string | null | undefined): boolean {
        return (value !== null && value !== undefined) ? true : false;
    }

    isGenericNeitherNullNorUndefinedNorInvalid(value: boolean | number | string | null | undefined): boolean {
        if(this.isGenericNeitherNullNorUndefined(value)) {
            if(typeof value === 'string') return this.isNotEmpty(value);
            if(typeof value === 'number') return this.isValidNumeric(value) && this.isValidNumeric(value);
            if(typeof value === 'boolean') return this.isValidBoolean(value) && this.isValidBoolean(value);
        }
        return false;
    }

    passStringNullParams(value: string | null | undefined): string | null {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<string>(value, Constants.TYPE_SWITCH.STRING);
    }

    passNumberNullParams(value: number | null | undefined): number | null {
        return this.isGenericEitherNullOrUndefined(value) ? null : this.convertToType<number>(value, Constants.TYPE_SWITCH.NUMBER);
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
                helper.convertToType<string>(phonePrefix, Constants.TYPE_SWITCH.STRING)) ? `${phonePrefix}-` : `${faker.number.int(
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
        return this.isNeitherNullNorUndefinedNorEmpty(value) ? this.convertToType<string>(value, Constants.TYPE_SWITCH.STRING) : null;
    }

    sanitiseNumericValue(value: number | null | undefined): number | null {
        return this.isGenericNeitherNullNorUndefined(value) && this.isValidNumeric(value!) ? this.convertToType<number>(value, Constants.TYPE_SWITCH.NUMBER) : null;
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

    logErrorStack(logPayload: any, error: any, customMessage?: string) {
        const cloneLogPayload = {
            ...logPayload,
            error: { ...(logPayload.error || {}) }
        };

        ['message', 'details', 'code', 'statusCode', 'stack', 'name', 'token', 'retryVerification', 'success', 'verified'].forEach((key) => {
            if (this.isGenericNeitherNullNorUndefinedNorInvalid(error[key])) {
                cloneLogPayload.error[key] = error[key];
            }
        });
        if (this.isNeitherNullNorUndefinedNorEmpty(customMessage)) cloneLogPayload.error['message'] = customMessage;

        return cloneLogPayload;
    }

    logResponse(logPayload: any, response: any) {
        const cloneLogPayload = {
            ...logPayload,
            response: { ...(logPayload.response || {}), ...response },
        };

        return cloneLogPayload;
    }
}

export const helper = new HelperImpl(); 
import { pool } from "../config/postgres.js";
import { cacheDB } from "../config/redis.js";
import { DeviceInterface, GPRCDeviceInterface } from "../database/interface/device_info.js";
import { Constants } from "./constants.js";
import { DecryptedAuthTokenInterface, HashedPasswordInterface, PasswordlessAuthenticationTokenInterface, RedisEmailKeySerialisation } from "./interface.js";
import { BooleanOrNullOrUndefined, MultipleQueryObject, NumberOrNull, NumberOrNullOrUndefined, StringOrNull, StringOrNullOrUndefined, StringOrUndefined } from "./custom_types.js";
import { ContextInterface } from "../database/interface/logger.js";
import { logger } from "../config/loki.js";
import { AuthVerificationInterface } from "../database/interface/auth_verification.js";
import { RedisResponse } from "../database/interface/response.js";
import { Utils } from "./utils.js";
import { crypto, adjectives, faker, jwt, nouns, uniqueUsernameGenerator, uuidv4 } from "../config/imports.js";
import { jwtPublicKey, privateKey } from "../config/config.js";

interface Helper {
    createQueryColumn(columns: unknown): unknown;
    formatQueryValue(value: unknown): string;
    createQueryValues(values: unknown): unknown;
    createAuthSchema(userId: string, googleEmail?: StringOrNullOrUndefined, generatedSalt?: StringOrNullOrUndefined, isEmailVerified?: BooleanOrNullOrUndefined, isPasswordless?: BooleanOrNullOrUndefined): AuthVerificationInterface;
    executeQueryAsyncWithoutLock(context: ContextInterface, query: unknown, valuesArray?, errorMessage?: string, labels?, queryTimeout?: number);
    executeMultipleQueryAsyncWithoutLock(context: ContextInterface, queries: MultipleQueryObject, errorMessage?: string, labels?, queryTimeout?: number);
    isInsertQuerySuccessful(queryCommand: string, rowCount: number): boolean;
    isSelectQuerySuccessful(queryCommand: string, fieldCount: number): boolean;
    isUpdateQuerySuccessful(queryCommand: string, rowCount: number): boolean;
    generateHashPassword(password: string): HashedPasswordInterface;
    verifyPassword(inputPassword: string, storedHash: string, storedSalt: string): boolean;
    generateUserAuthToken(_id: string, username: string, email: string, label: string): string;
    generatePasswordlessAuthenticationAuthToken(userInfo: PasswordlessAuthenticationTokenInterface, deviceInfo: GPRCDeviceInterface, label: string): string;
    decryptAuthToken(token: string): DecryptedAuthTokenInterface;
    convertToClassType<T>(unknownValue: unknown, type: unknown): T;
    convertToType<T>(unknownValue: unknown, type: 'boolean' | 'number' | 'string' | 'object' | 'Object' | 'interface'): T;
    prepareUserRedisKeyValues(key: string, userInfo: RedisEmailKeySerialisation): Object;
    serialiseRedisKeyValues(keyValuePairs: Object): string;
    parseRedisValueToObject(value: string);
    setRedis(context: ContextInterface, labels, key: string, value: string, timeout?: number): Promise<void>;
    mapDeviceSchema(deviceInfo: GPRCDeviceInterface, userId: string): DeviceInterface;
    parseBooleanString(truthValue: StringOrNullOrUndefined): boolean;
    isNotEmpty(value: string): boolean;
    isValidNumeric(value: number): boolean;
    isValidBoolean(value: boolean): boolean;
    isEitherNullOrUndefined(value: StringOrNullOrUndefined): boolean;
    isEitherNullOrUndefinedOrEmpty(value: StringOrNullOrUndefined): boolean;
    isGenericEitherNullOrUndefined(value: boolean | number | StringOrNullOrUndefined): boolean;
    isNeitherNullNorUndefined(value: StringOrNullOrUndefined): boolean;
    isNeitherNullNorUndefinedNorEmpty(value: StringOrNullOrUndefined): boolean;
    isGenericNeitherNullNorUndefined(value: boolean | number | StringOrNullOrUndefined): boolean;
    isGenericNeitherNullNorUndefinedNorInvalid(value: boolean | number | StringOrNullOrUndefined): boolean;
    passStringNullParams(value: StringOrNullOrUndefined): StringOrNull;
    passNumberNullParams(value: NumberOrNullOrUndefined): NumberOrNull;
    generateUniqueUserName(userInfo): string;
    trimStringValue(value: string): string;
    sanitiseStringValue(value: StringOrNullOrUndefined): StringOrNull;
    sanitiseNumericValue(value: NumberOrNullOrUndefined): NumberOrNull;
    sanitiseObject(object: Object): Object;
    generateContext();
    generateDefaultSuccessParams(tracerId: string, codeIdentifier?: string, source?: StringOrNullOrUndefined);
    generateDefaultFailureParams(tracerId: string, codeIdentifier?: string, source?: StringOrNullOrUndefined);
    serializeError(error);
    serializeErrorStrict(error, options);
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

    createAuthSchema(userId: string, googleEmail?: StringOrNullOrUndefined, generatedSalt?: StringOrNullOrUndefined, isEmailVerified?: BooleanOrNullOrUndefined, isPasswordless?: BooleanOrNullOrUndefined): AuthVerificationInterface {
        return {
            _id: uuidv4(),
            google_email: googleEmail ?? null,
            is_email_verified: this.convertToType<boolean>(this.isGenericNeitherNullNorUndefined(isEmailVerified) ? isEmailVerified : false, Constants.TYPE_SWITCH.BOOLEAN),
            is_google_verified: this.convertToType<boolean>(this.isGenericNeitherNullNorUndefined(googleEmail) ? true : false, Constants.TYPE_SWITCH.BOOLEAN),
            is_passwordless: this.convertToType<boolean>(this.isGenericNeitherNullNorUndefined(isPasswordless) ? true : false, Constants.TYPE_SWITCH.BOOLEAN),
            is_mfa_enabled: false,
            salt: this.isEitherNullOrUndefinedOrEmpty(generatedSalt) ? null : generatedSalt,
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
            logPayload = this.logResponse(logPayload, response);
            logger.info({ ...logPayload });

            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);

            loggerDefaultParams = this.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = this.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new Error(error.message);
        }
        finally {
            dB.release();
        }
    }

    async executeMultipleQueryAsyncWithoutLock(context: ContextType, queries: MultipleQueryObject, errorMessage?: string, labels?, queryTimeout?: number) {
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
            logPayload = this.logResponse(logPayload, response);
            logger.info({ ...logPayload });

            return response;
        }
        catch (error) {
            await dB.query(Constants.DB_COMMANDS.ROLLBACK);

            loggerDefaultParams = this.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.POSTGRESQL_DB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = this.logErrorStack(logPayload, error);
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

    generateHashPassword(password: string): HashedPasswordType {
        const salt = crypto.randomBytes(Constants.CRYPTO_CONFIG.BYTES_16).toString(Constants.CRYPTO_CONFIG.HEX);
        const hashedPassword = crypto.scryptSync(password, salt, Constants.CRYPTO_CONFIG.BYTES_64).toString(Constants.CRYPTO_CONFIG.HEX);
        return { 
            salt, 
            hashedPassword,
        };
    }

    verifyPassword(inputPassword: string, storedHash: string, storedSalt: string): boolean {
        const hashToCompare = crypto.scryptSync(inputPassword, storedSalt, Constants.CRYPTO_CONFIG.BYTES_64).toString(Constants.CRYPTO_CONFIG.HEX);
        return hashToCompare === storedHash;
    }

    generateUserAuthToken(_id: string, username: string, email: string, label: string): string {
        const payload = {
            _id: _id,
            username: username,
            email: email,
            source: label
        };

        const token: string = jwt.sign(payload, privateKey, {
            algorithm: Constants.JWT_CONFIG.ALGORITHM,
            expiresIn: Constants.JWT_CONFIG.EXPIRY
        });

        return token;
    }

    generatePasswordlessAuthenticationAuthToken(userInfo: PasswordlessAuthenticationTokenType, deviceInfo: DeviceType, label: string): string {
        const sanitisedDeviceInfo: GPRCDeviceType = helper.convertToType<GPRCDeviceType>(
            helper.sanitiseObject(deviceInfo), Constants.TYPE_SWITCH.INTERFACE
        );

        const payload = {
            _id: userInfo._id,
            username: userInfo.username,
            email: userInfo.email,
            deviceType: sanitisedDeviceInfo.deviceType,
            browserInfo: sanitisedDeviceInfo.browserInfo,
            ipAddress: sanitisedDeviceInfo.ipAddress,
            deviceId: sanitisedDeviceInfo.deviceId,
            platform: sanitisedDeviceInfo.platform,
            deviceName: sanitisedDeviceInfo.deviceName,
            loginTime: sanitisedDeviceInfo.loginTime || Utils.CURRENT_TIME,
            userId: sanitisedDeviceInfo?.userId ?? null,
            source: label,
        };

        const token: string = jwt.sign(payload, privateKey, {
            algorithm: Constants.JWT_CONFIG.ALGORITHM,
            expiresIn: Constants.JWT_CONFIG.VERY_SHORT_LIVED
        });

        return token;
    }

    decryptAuthToken(token: string): DecryptedAuthTokenType {
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

    async setRedis(context: ContextType, labels, key: string, value: string, timeout?: number): Promise<void> {
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
            logPayload = this.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });

            throw new RedisResponse(error);
        }
    }

    mapDeviceSchema(deviceInfo: GPRCDeviceType, userId?: StringOrNull): DeviceType {
        const sanitisedDeviceInfo: GPRCDeviceType = helper.convertToType<GPRCDeviceType>(
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
            login_time: new Date(sanitisedDeviceInfo?.loginTime || Utils.CURRENT_TIME),
            user_id: userId ?? null,
        };
    }

    parseBooleanString(truthValue: StringOrNullOrUndefined): boolean {
        if (this.isNeitherNullNorUndefined(truthValue))
            return truthValue === Constants.BOOLEAN_VALUES.TRUE ? true : false;
        return false;
    }

    isNotEmpty(value: string): boolean {
        return value === '' ? true : false;
    }

    isValidNumeric(value: NumberOrNullOrUndefined): boolean {
        return this.isGenericNeitherNullNorUndefined(value) && typeof value === 'number' ? true : false;
    }

    isValidBoolean(value: BooleanOrNullOrUndefined): boolean {
        return this.isGenericNeitherNullNorUndefined(value) && typeof value === 'boolean' ? true : false;
    }
 
    isEitherNullOrUndefined(value: StringOrNullOrUndefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isEitherNullOrUndefinedOrEmpty(value: StringOrNullOrUndefined): boolean {
        if(this.isEitherNullOrUndefined(value)) return true;
        return this.trimStringValue(value as string) === "" ? true : false;
    }

    isGenericEitherNullOrUndefined(value: boolean | string | NumberOrNullOrUndefined): boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isNeitherNullNorUndefined(value: StringOrNullOrUndefined): boolean {
        return (value !== null && value !== undefined) ? true : false;
    }

    isNeitherNullNorUndefinedNorEmpty(value: StringOrNullOrUndefined): boolean {
        if (this.isNeitherNullNorUndefined(value)) {
            return this.trimStringValue(value as string) !== "" ? true : false;
        }
        return false;
    }

    isGenericNeitherNullNorUndefined(value: boolean | number | StringOrNullOrUndefined): boolean {
        return (value !== null && value !== undefined) ? true : false;
    }

    isGenericNeitherNullNorUndefinedNorInvalid(value: boolean | number | StringOrNullOrUndefined): boolean {
        if(this.isGenericNeitherNullNorUndefined(value)) {
            if(typeof value === 'string') return this.isNotEmpty(value);
            if(typeof value === 'number') return this.isValidNumeric(value) && this.isValidNumeric(value);
            if(typeof value === 'boolean') return this.isValidBoolean(value) && this.isValidBoolean(value);
        }
        return false;
    }

    passStringNullParams(value: StringOrNullOrUndefined): StringOrNull {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<string>(value, Constants.TYPE_SWITCH.STRING);
    }

    passNumberNullParams(value: NumberOrNullOrUndefined): NumberOrNull {
        return this.isGenericEitherNullOrUndefined(value) ? null : this.convertToType<number>(value, Constants.TYPE_SWITCH.NUMBER);
    }

    generateUniqueUserName(userInfo): string {
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

    sanitiseStringValue(value: StringOrNullOrUndefined): StringOrNull {
        return this.isNeitherNullNorUndefinedNorEmpty(value) ? this.convertToType<string>(value, Constants.TYPE_SWITCH.STRING) : null;
    }

    sanitiseNumericValue(value: NumberOrNullOrUndefined): NumberOrNull {
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

    generateDefaultSuccessParams(tracerId: unknown, codeIdentifier?: string, source?: StringOrNullOrUndefined) {
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

    generateDefaultFailureParams(tracerId: unknown, codeIdentifier?: string, source?: StringOrNullOrUndefined) {
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

    /**
     * Helper function to serialize error objects with only defined and non-empty properties
     * @param {Error} error - The error object to serialize
     * @returns {Object} - Serialized error object with only meaningful properties
     */
    serializeError(error) {
        if (!error) return {};
        
        const serialized = {};
        const standardProps = [
            'name', 'message', 'stack', 'code', 'statusCode', 
            'status', 'errno', 'syscall', 'path', 'cause'
        ];
        
        const isValidValue = (value) => {
            if (Array.isArray(value) && value.length === 0) return false;
            if (typeof value === 'object' && Object.keys(value).length === 0) return false;
            if (this.isGenericNeitherNullNorUndefinedNorInvalid(value)) return false;
            return true;
        };
        
        standardProps.forEach(prop => {
            if (prop in error && isValidValue(error[prop])) {
                try {
                    serialized[prop] = error[prop];
                } catch (e) {
                    // Skip properties that can't be accessed
                }
            }
        });
        
        for (const key in error) {
            if (error.hasOwnProperty(key) && 
                !(key in serialized) && 
                isValidValue(error[key])) {
                try {
                    serialized[key] = error[key];
                } catch (e) {
                    // Skip properties that can't be serialized
                }
            }
        }
        
        const nonEnumerableProps = Object.getOwnPropertyNames(error);
        nonEnumerableProps.forEach(prop => {
            if (!(prop in serialized) && 
                isValidValue(error[prop]) && 
                typeof error[prop] !== 'function') {
                try {
                    serialized[prop] = error[prop];
                } catch (e) {
                    // Skip properties that can't be accessed
                }
            }
        });
        
        return serialized;
    }

    /**
     * Alternative version with more strict filtering options
     * @param {Error} error - The error object to serialize
     * @param {Object} options - Configuration options
     * @returns {Object} - Serialized error object
     */
    serializeErrorStrict(error, options = {}) {
        if (!error) return {};
        
        const {
            includeStack = true,
            includeEmptyStrings = false,
            includeZeroValues = true,
            includeFunctions = false,
            customProps = []
        }: any = options;
        
        const serialized = {};
        
        // Standard properties to always check
        const standardProps = [
            'name', 'message', 
            ...(includeStack ? ['stack'] : []),
            'code', 'statusCode', 'status', 'errno', 
            'syscall', 'path', 'cause', ...customProps
        ];
        
        // More granular validation
        const isValidValue = (value, key) => {
            if (value === null || value === undefined) return false;
            
            if (typeof value === 'string') {
                if (!includeEmptyStrings && value.trim() === '') return false;
                return true;
            }
            
            if (typeof value === 'number') {
                if (!includeZeroValues && value === 0) return false;
                return !isNaN(value);
            }
            
            if (typeof value === 'function' && !includeFunctions) return false;
            
            if (typeof value === 'object') {
                if (Array.isArray(value)) return value.length > 0;
                return Object.keys(value).length > 0;
            }
            
            return true;
        };
        
        // Process all possible properties
        const allProps = [
            ...standardProps,
            ...Object.keys(error),
            ...Object.getOwnPropertyNames(error)
        ];
        
        // Remove duplicates
        const uniqueProps = [...new Set(allProps)];
        
        uniqueProps.forEach(prop => {
            if (prop in error && isValidValue(error[prop], prop)) {
                try {
                    serialized[prop] = error[prop];
                } catch (e) {
                    // Skip properties that can't be accessed
                }
            }
        });
        
        return serialized;
    }

    logErrorStack(logPayload: any, error: any, customMessage?: string) {
        const errorObj = this.serializeError(error);
        const cloneLogPayload = {
            ...logPayload,
            error: { ...(logPayload.error || errorObj || {}) }
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
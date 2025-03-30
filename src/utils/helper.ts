import { privateKey } from "../config/config.js";
import { crypto, adjectives, lodash, nouns, uniqueUsernameGenerator, faker, jwt } from "../config/imports.js";
import { pool } from "../config/postgres.js";
import { client } from "../config/redis.js";
import { GPRCUsers, Users } from "../database/interface/user_signup.js";
import { Constants } from "./constants.js";
import { RedisError } from "./errors.js";

interface Helper {
    createQueryColumn(columns: unknown) : unknown;
    formatQueryValue(value: unknown) : string;
    createQueryValues(values: unknown) : unknown;
    executeQueryAsyncWithoutLock(query: unknown, errorMessage?: string, queryTimeout?: number);
    isInsertQuerySuccessful(queryCommand: string, rowCount: number) : Boolean;
    isSelectQuerySuccessful(queryCommand: string, fieldCount: number) : Boolean;
    generateAuthToken(_id: string, username: string) : string;
    convertToClassType<T>(unknownValue: unknown, type: unknown) : T;
    convertToType<T>(unknownValue: unknown) : T;
    prepareUserRedisKeyValues(key: string, userInfo?: Users) : Object;
    serialiseRedisKeyValues(keyValuePairs: Object) : string;
    setRedis(key: string, value: string) : Promise<void>;
    parseBooleanString(truthValue: string | null | undefined) : Boolean;
    isEitherNullOrUndefined(value: number | string | null | undefined) : Boolean;
    isNeitherNullNorUndefined(value: number | string | null | undefined) : Boolean;
    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined) : Boolean;
    passStringNullParams(value: string | null | undefined) : string | null;
    passNumberNullParams(value: number | null | undefined) : number | null;
    generateUniqueUserName(userInfo: GPRCUsers) : string;
    trimStringValue(value: string) : string;
    sanitiseStringValue(value: string | null | undefined) : string | null;
    sanitiseNumericValue(value: number | null | undefined) : number | null;
    sanitiseObject(object: Object) : Object;
};

export class HelperImpl implements Helper {
    createQueryColumn(columns: any) : any {
        const column = Object.keys(columns).join(', ');
        return column;
    }

    formatQueryValue(value: unknown) : string {
        if (typeof value === 'number') return `'${value}'`;
        if (value instanceof Date) return `'${value.toISOString()}'`;
        return `'${value as string}'`;
    }

    createQueryValues(values: any) : any {
        const value = Object.values(values).map(this.formatQueryValue).join(', ');
        return value;
    }

    async executeQueryAsyncWithoutLock(query: any, errorMessage?: string, queryTimeout?: number) {
        const client = await pool.connect();
        try {
            await client.query(Constants.DB_COMMANDS.BEGIN)

            const queryConfig = {
                text: query,
                queryTimeout: queryTimeout || Constants.DB_TIMEOUTS.QUERY_TIMEOUT
            };
            const response = await client.query(queryConfig);

            await client.query(Constants.DB_COMMANDS.COMMIT);
            return response;
        }
        catch (error) {
            await client.query(Constants.DB_COMMANDS.ROLLBACK);
            if(helper.isNeitherNullNorUndefinedNorEmpty(error.message)) 
                throw new Error(error.message);

            throw new Error(Constants.DB_ERRORS.DEFAULT_ERROR);
        }
        finally {
            client.release();
        }
    }

    isInsertQuerySuccessful(queryCommand: string, rowCount: number) : Boolean {
        if (queryCommand === Constants.DB_COMMANDS.INSERT && rowCount) return true;
        return false;
    }

    isSelectQuerySuccessful(queryCommand: string, fieldCount: number) : Boolean {
        if(queryCommand === Constants.DB_COMMANDS.SELECT && fieldCount) return true;
        return false; 
    }

    generateAuthToken(_id: string, username: string): string {
        const payload = {
            _id: _id,
            username: username,
        };

        const token : string = jwt.sign(payload, privateKey, {
            algorithm: Constants.JWT_CONFIG.ALGORITHM,
            expiresIn: Constants.JWT_CONFIG.EXPIRY
        });

        return token;
    }

    convertToClassType<T>(response: unknown, classType: new (...args: any[]) => T) : T {
        return response as T;
    }

    convertToType<T>(response: unknown) : T {
        return response as T;
    }

    prepareUserRedisKeyValues(key: string, userInfo: Users) : Object {
        return {
            key: key,
            email: this.isEitherNullOrUndefined(userInfo.email) ? Constants.SERIALISATION_KEYS.EMAIL : userInfo.email,
            countryCode: this.isEitherNullOrUndefined(userInfo.primary_country_code) ? Constants.SERIALISATION_KEYS.COUNTRY_CODE : userInfo?.primary_country_code,
            phoneNumber: this.isEitherNullOrUndefined(userInfo.phone_number) ? Constants.SERIALISATION_KEYS.PHONE_NUMBER : userInfo?.phone_number,
        }
    };

    serialiseRedisKeyValues(keyValuePairs: Object) : string {
        const rawString = JSON.stringify(keyValuePairs);
        const serialisedString = rawString.replace(/"/g, "'");

        return serialisedString;
    }

    async setRedis(key: string, value: string) : Promise<void> {
        try {
            await client.set(key, value, { 
                EX: Constants.DB_TIMEOUTS.REDIS_TIMEOUT 
            });
        }
        catch (error) {
            throw new RedisError(error.message);
        }
    }

    parseBooleanString(truthValue: string | null | undefined) : Boolean {
        if (this.isNeitherNullNorUndefined(truthValue))
            return truthValue === Constants.BOOLEAN_VALUES.TRUE ? true : false;
        return false;
    }

    isEitherNullOrUndefined(value: number | string | null | undefined) : Boolean {
        return (value === null || value === undefined) ? true : false;
    }

    isNeitherNullNorUndefined(value: number | string | null | undefined) : Boolean {
        return (value !== null || value !== undefined) ? true : false;
    }

    isNeitherNullNorUndefinedNorEmpty(value: string | null | undefined) : Boolean {
        if (this.isNeitherNullNorUndefined(value)) {
            return this.trimStringValue(value as string) !== "" ? true : false;
        }
        return false;
    }

    passStringNullParams(value: string | null | undefined) : string | null {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<string>(value);
    }

    passNumberNullParams(value: number | null | undefined) : number | null {
        return this.isEitherNullOrUndefined(value) ? null : this.convertToType<number>(value);
    }

    generateUniqueUserName(userInfo: GPRCUsers): string {
        const config = {
            dictionaries: [adjectives, nouns],
            separator: '-',
            length: 4,
        };

        const randomWord = uniqueUsernameGenerator(config);
        const randomSuffix = crypto.randomBytes(2).toString('hex');
        let emailPrefix, name, phonePrefix, baseUsername = '';

        if(this.isNeitherNullNorUndefinedNorEmpty(userInfo.email)) {
            emailPrefix = userInfo.email.split('@')[0];
            baseUsername += `${emailPrefix}-`;
        }

        if(!this.isNeitherNullNorUndefinedNorEmpty(userInfo.name)) 
            baseUsername += `${faker.person.lastName()}-`;
        else 
            baseUsername += `${name}-`;
        baseUsername += `${randomWord}`;

        if(this.isNeitherNullNorUndefinedNorEmpty(userInfo.phoneNumber)) {
            phonePrefix = userInfo.phoneNumber!.split('-')[1];
            baseUsername += `${phonePrefix}-`;
        }
        baseUsername += `${randomSuffix}`;

        return baseUsername;
    }

    trimStringValue(value: string) : string {
        value = value?.trimStart();
        value = value?.trimEnd();
        return value;
    }

    sanitiseStringValue(value: string | null | undefined) : string | null {
        return this.isNeitherNullNorUndefinedNorEmpty(value) ? this.convertToType<string>(value) : null;
    }

    sanitiseNumericValue(value: number | null | undefined) : number | null {
        return this.isNeitherNullNorUndefined(value) ? this.convertToType<number>(value) : null;
    }

    sanitiseObject(object: Object) : Object {
        return Object.fromEntries(
            Object.entries(object).map(([key, value]) => {
                if (typeof value === 'number') return [key, this.sanitiseNumericValue(value)];
                else if (typeof value === 'string') return [key, this.sanitiseStringValue(value)];
                return [key, value];
            }),
        );
    }
}

export const helper = new HelperImpl();
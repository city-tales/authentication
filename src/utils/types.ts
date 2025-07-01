import {  StringOrNull, StringOrNullOrUndefined } from "./custom_types.js";

export type MultipleQueryObject = {
    query: string;
    valuesArray: any[];
}[];

export type RedisEmailKeySerialisation = { 
    email: StringOrNullOrUndefined,
};
 
export type DecryptedAuthTokenType = { 
    _id: string,
    username: string,
    email: string,
    deviceType?: StringOrNull,
    browserInfo?: StringOrNull,
    ipAddress?: StringOrNull,
    deviceId?: StringOrNull,
    platform?: StringOrNull,
    deviceName?: StringOrNull,
    loginTime?: StringOrNull,
    userId?: StringOrNull,
    source?: StringOrNull,
};

export type HashedPasswordType = { 
    salt: string,
    hashedPassword: string,
};

export type PasswordlessAuthenticationTokenType = { 
    _id: string,
    username: string,
    email: string,
};

export type HashedPasswordWithIdForUpdateType = [
    salt: string,
    password: string, 
    _id: string,
    updated_at: string,
];
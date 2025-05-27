import { StringOrNull, StringOrNullOrUndefined } from "./custom_types.js";

export interface RedisEmailKeySerialisation {
    email: StringOrNullOrUndefined,
};
 
export interface DecryptedAuthTokenInterface {
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

export interface HashedPasswordInterface {
    salt: string,
    hashedPassword: string,
};

export interface PasswordlessAuthenticationTokenInterface {
    _id: string,
    username: string,
    email: string,
};
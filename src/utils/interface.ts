export interface RedisEmailKeySerialisation {
    email: string | null | undefined,
};
 
export interface DecryptedAuthTokenInterface {
    _id: string,
    username: string,
    email: string,
    deviceType?: string,
    browserInfo?: string,
    ipAddress?: string,
    deviceId?: string,
    platform?: string,
    deviceName?: string,
    loginTime?: string,
    source?: string,
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
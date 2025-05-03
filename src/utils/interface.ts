export interface RedisEmailKeySerialisation {
    email: string | null | undefined,
};
 
export interface DecryptedAuthTokenInterface {
    _id: string,
    username: string,
    email: string,
};

export interface HashedPasswordInterface {
    salt: string,
    hashedPassword: string,
};
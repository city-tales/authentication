export interface RedisEmailKeySerialisation {
    email: string | null | undefined,
    password: string | null | undefined,
};
 
export interface DecryptedAuthTokenInterface {
    _id: string,
    username: string,
    email: string,
};
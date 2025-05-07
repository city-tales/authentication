export interface PasswordlessAuthenticationInterface {
    _id: string,
    name?: string,
    username: string,
    email: string,
};

export interface GPRCPasswordlessAuthenticationInterface {
    name: string,
    email: string,
};
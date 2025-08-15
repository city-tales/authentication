import { StringOrNull } from "../../utils/custom_types.js";

export type PasswordlessAuthenticationType = {
    _id: string;
    created_at: string;
};

export type PasswordlessAuthenticationDataType = {
    _id: string;
    email: string;
    username: string;
    user_id: string;
    updated_at: string;
};

export type PasswordlessAuthenticationAuthType = {
    _id: string;
    is_email_verified: boolean;
    is_google_verified: boolean;
    is_passwordless: boolean;
    is_mfa_enabled: boolean;
    password: StringOrNull;
    salt?: StringOrNull;
    user_id: string;
};

export type GPRCPasswordlessAuthenticationType = {
    email: string;
};

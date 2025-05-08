export interface AuthVerificationInterface {
    _id: string,
    is_email_verified: boolean,
    is_google_verified: boolean,
    is_apple_verified: boolean,
    is_passwordless: boolean,
    is_mfa_enabled: boolean,
    salt?: string | null | undefined,
    user_id: string,
};
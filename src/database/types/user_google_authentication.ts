import { StringOrNull } from "../../utils/custom_types.js";

export type GoogleAuthenticationType = {
    _id: string,
};

export type GoogleAuthenticationDataType = {
    _id: string,
    email: string,
    name?: StringOrNull,
    username: string,
    profile_picture?: StringOrNull,
    user_id: string,
};

export type GoogleAuthenticationAuthType = {
    _id: string,
    is_email_verified: boolean,
    is_google_verified: boolean,
    is_passwordless: boolean,
    is_mfa_enabled: boolean,
    password: StringOrNull,
    salt?: StringOrNull,
    user_id: string,
};

export type GPRCGoogleAuthenticationAuthSchemaType = {
    email: string,
    firstName: string,
    lastName: string,
    name: string,
    profilePicture: string,
    verifiedEmail: boolean
};
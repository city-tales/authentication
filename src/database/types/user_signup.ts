import { StringOrNull } from "../../utils/custom_types.js";

export type UserSignUpType = {
    _id: string,
}

export type UserDataSignUpType = {
    _id: string,
    email: string,
    name: string,
    username: string,
    primary_country_code?: StringOrNull,
    phone_number?: StringOrNull,
    secondary_country_code?: StringOrNull,
    alternate_phone?: StringOrNull,
    profile_picture?: StringOrNull,
    created_at: string,
    updated_at: string,
    user_id: string,
};

export type AuthDataSignUpType = {
    _id: string,
    is_email_verified: boolean,
    is_google_verified: boolean,
    is_passwordless: boolean,
    is_mfa_enabled: boolean,
    password: StringOrNull,
    salt?: StringOrNull,
    user_id: string,
    created_at: string,
    updated_at: string,
};

export type GPRCUserSignUpType = {
    name: string,
    email: string,
    password: string,
    primaryCountryCode?: string,
    phoneNumber?: string,
    secondaryCountryCode?: string,
    alternatePhone?: string,
};
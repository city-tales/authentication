import { BooleanOrNull, StringOrNull } from "../../utils/custom_types.js";

export interface AuthVerificationInterface {
    _id: StringOrNull,
    google_email?: StringOrNull,
    apple_email?: StringOrNull,
    is_email_verified?: BooleanOrNull,
    is_google_verified?: BooleanOrNull,
    is_apple_verified?: BooleanOrNull,
    is_passwordless?: BooleanOrNull,
    is_mfa_enabled?: BooleanOrNull,
    salt?: StringOrNull,
    user_id: StringOrNull,
};
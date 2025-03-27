export interface AuthVerification {
    _id: String,
    isEmailVerified: Boolean,
    isGoogleVerified: Boolean,
    isAppleVerified: Boolean,
    isPasswordLess: Boolean,
    isMFAEnabled: {
        isPhoneVerified: Boolean,
        enabled: Boolean,
    },
    user_id: String,
};
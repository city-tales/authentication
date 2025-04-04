export interface AuthVerification {
    _id: string,
    isEmailVerified: Boolean,
    isGoogleVerified: Boolean,
    isAppleVerified: Boolean,
    isPasswordLess: Boolean,
    isMFAEnabled: {
        isPhoneVerified: Boolean,
        enabled: Boolean,
    },
    user_id: string,
};
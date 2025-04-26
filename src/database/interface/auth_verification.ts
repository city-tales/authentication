export interface AuthVerificationInterface {
    _id: string,
    isEmailVerified: boolean,
    isGoogleVerified: boolean,
    isAppleVerified: boolean,
    isPasswordLess: boolean,
    isMFAEnabled: {
        isPhoneVerified: boolean,
        enabled: boolean,
    },
    user_id: string,
};
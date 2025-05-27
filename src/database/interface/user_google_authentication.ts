export interface GoogleAuthenticationInterface {
    _id: string,
    email: string,
    name: string,
    username: string,
    profile_picture: string,
};

export interface GPRCGoogleAuthenticationInterface {
    email: string,
    firstName: string,
    lastName: string,
    name: string,
    profilePicture: string,
    verifiedEmail: boolean
};
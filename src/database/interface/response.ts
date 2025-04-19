export interface SignUpSuccessResponse {
    token: string,
    message: string,
    statusCode: number,
};

export interface LoginSuccessResponse {
    token: string,
    message: string,
    verified: boolean,
    statusCode: number,
    retryVerification: boolean,
};
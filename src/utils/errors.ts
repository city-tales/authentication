import { Constants } from "./constants.js";

export class SignUpError {
    protected token?: string;
    protected message?: string;
    protected statusCode?: number;

    constructor(error: SignUpError) {
        this.token = error.token || Constants.SIGNUP_MESSAGE.EMPTY_TOKEN;
        this.message = error.message || Constants.SIGNUP_MESSAGE.FAILED;
        this.statusCode = error.statusCode || Constants.STATUS_CODES.NOT_ACCEPTABLE;
    }
};

export class RedisError extends SignUpError {
    constructor(error: RedisError) {
        super(error);
        this.token = error.token || Constants.SIGNUP_MESSAGE.EMPTY_TOKEN;
        this.message = error.message || Constants.REDIS_MESSAGE.FAILED;
        this.statusCode = error.statusCode || Constants.STATUS_CODES.BAD_GATEWAY;
    }
};


import { Constants } from "./constants.js";
import { helper } from "./helper.js";

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

export class LoginError extends SignUpError {
    protected verified?: boolean;
    protected retryVerification?: boolean;

    constructor(error: LoginError) {
        super(error);
        this.token = error.token || Constants.LOGIN_MESSAGE.EMPTY_TOKEN;
        this.message = error.message || Constants.LOGIN_MESSAGE.FAILED;
        this.statusCode = error.statusCode || Constants.STATUS_CODES.SERVICE_UNAVAILABLE;
        this.verified = error.verified || helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE);
        this.retryVerification = error.retryVerification || helper.convertToType<boolean>(Constants.BOOLEAN_VALUES.FALSE);
    }
};


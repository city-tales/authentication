import { Constants } from "../../utils/constants.js";
import { Helper } from "../../utils/helper.js";

export class SignUpResponse {
    public token: string;
    public message: string;
    public statusCode: number;
    public verified: boolean;

    constructor(response?: SignUpResponse) {
        this.token = response?.token ?? Constants.SIGNUP_MESSAGE.EMPTY_TOKEN;
        this.message = response?.message ?? Constants.SIGNUP_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.NOT_ACCEPTABLE;
        this.verified =
            response?.verified ??
            Helper.convertToType<boolean>(
                Constants.BOOLEAN_VALUES.FALSE,
                Constants.TYPE_SWITCH.BOOLEAN,
            );
    }
}

export class RedisResponse extends SignUpResponse {
    constructor(response?: RedisResponse) {
        super(response);
        this.token = response?.token ?? Constants.SIGNUP_MESSAGE.EMPTY_TOKEN;
        this.message = response?.message ?? Constants.REDIS_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
    }
}

export class LoginResponse {
    public name: string;
    public token: string;
    public message: string;
    public statusCode: number;
    public retryVerification: boolean;

    constructor(response?: LoginResponse) {
        this.name = response?.name ?? Constants.LOGIN_MESSAGE.EMPTY;
        this.token = response?.token ?? Constants.LOGIN_MESSAGE.EMPTY_TOKEN;
        this.message = response?.message ?? Constants.LOGIN_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
        this.retryVerification =
            response?.retryVerification ??
            Helper.convertToType<boolean>(
                Constants.BOOLEAN_VALUES.TRUE,
                Constants.TYPE_SWITCH.BOOLEAN,
            );
    }
}

export class EmailVerificationResponse {
    public success: boolean;
    public message: string;
    public statusCode: number;

    constructor(response?: EmailVerificationResponse) {
        this.success =
            response?.success ??
            Helper.convertToType<boolean>(
                Constants.BOOLEAN_VALUES.FALSE,
                Constants.TYPE_SWITCH.BOOLEAN,
            );
        this.message = response?.message ?? Constants.LOGIN_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
    }
}

export class EmailForgotPasswordResponse {
    public token: string;
    public message: string;
    public statusCode: number;
    public name: string;

    constructor(response?: EmailForgotPasswordResponse) {
        this.token =
            response?.token ?? Constants.FORGOT_PASSWORD_MESSAGE.EMPTY_TOKEN;
        this.message =
            response?.message ?? Constants.FORGOT_PASSWORD_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
        this.name = response?.name ?? Constants.FORGOT_PASSWORD_MESSAGE.EMPTY;
    }
}

export class PasswordlessAuthenticationResponse {
    public token: string;
    public _id?: string;
    public username?: string;
    public message: string;
    public statusCode: number;

    constructor(response?: PasswordlessAuthenticationResponse) {
        this.token =
            response?.token ??
            Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EMPTY_TOKEN;
        this._id =
            response?._id ??
            Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EMPTY_TOKEN;
        this.username =
            response?.username ??
            Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.EMPTY_TOKEN;
        this.message =
            response?.message ??
            Constants.PASSWORDLESS_AUTHENTICATION_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
    }
}

export class GoogleAuthenticationResponse {
    public token: string;
    public message: string;
    public statusCode: number;

    constructor(response?: GoogleAuthenticationResponse) {
        this.token =
            response?.token ??
            Constants.GOOGLE_AUTHENTICATION_MESSAGE.EMPTY_TOKEN;
        this.message =
            response?.message ?? Constants.GOOGLE_AUTHENTICATION_MESSAGE.FAILED;
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
    }
}

export class HealthCheckResponse {
    public statusCode: number;
    public message: string;
    public service: string;

    constructor(response?: GoogleAuthenticationResponse) {
        this.statusCode =
            response?.statusCode ?? Constants.STATUS_CODES.BAD_GATEWAY;
        this.message = Constants.HEALTH_CHECK.BACKUP;
        this.service = Constants.HEALTH_CHECK.SERVICE;
    }
}

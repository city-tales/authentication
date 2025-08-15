import { StringOrNull } from "../../utils/custom_types.js";

export type ContextType = {
    tracerId: string;
    source?: StringOrNull;
};

export type EmailSignUpLabelType = {
    operation: string;
    type: string;
};

export type EmailLoginLabelType = {
    operation: string;
    type: string;
};

export type EmailForgotPasswordLabelType = {
    operation: string;
    type: string;
};

export type EmailVerificationLabelType = {
    operation: string;
    type: string;
    source?: StringOrNull;
};

export type PasswordlessAuthenticationLabelType = {
    operation: string;
    type: string;
};

export type GoogleAuthenticationLabelType = {
    operation: string;
    type: string;
};

export type AddJobToQueueLabelType = {
    operation: string;
    subOperation: string;
    type: string;
};

export type RegisterWorkerLabelType = {
    operation: string;
    subOperation: string;
    type: string;
};

export type GenericLabelType =
    | ContextType
    | EmailSignUpLabelType
    | EmailLoginLabelType
    | EmailVerificationLabelType
    | PasswordlessAuthenticationLabelType
    | GoogleAuthenticationLabelType
    | AddJobToQueueLabelType
    | RegisterWorkerLabelType;

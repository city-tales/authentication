import { StringOrNull } from "../../utils/custom_types.js";

export interface ContextInterface {
    tracerId: string,
    source?: StringOrNull,
};

export interface EmailSignUpLabelInterface {
    operation: string,
    type: string,
};

export interface EmailLoginLabelInterface {
    operation: string,
    type: string,
};

export interface EmailVerificationLabelInterface {
    operation: string,
    type: string,
    source?: StringOrNull,
};

export interface PasswordlessAuthenticationLabelInterface {
    operation: string,
    type: string,
};

export interface GoogleAuthenticationLabelInterface {
    operation: string,
    type: string
};

export interface AddJobToQueueLabelInterface {
    operation: string,
    subOperation: string,
    type: string,
};

export interface RegisterWorkerLabelInterface {
    operation: string,
    subOperation: string,
    type: string,
}
export interface ContextInterface {
    tracerId: string,
};

export interface EmailSignUpLabelInterface {
    operation: string,
    type: string,
};

export interface EmailLoginLabelInterface {
    operation: string,
    type: string,
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
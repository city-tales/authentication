import { Job, Worker, _ } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { bullMQConnectionObject } from "../config/redis.js";
import { AddJobToQueueLabelType, ContextType, RegisterWorkerLabelType } from "../database/types/logger.js";
import { Constants } from "./constants.js";
import { helper } from "./helper.js";
import { saveInDBQueueEmployee, saveInRedisQueueEmployee, updateInDBQueueEmployee } from "./queue.js";

interface QueueInterface {
    addJobToQueue(context: ContextType, labels, queueWorker: string, params: {}, maxAttempts?: number, lockDuration?: number): Promise<void>;
}

const queueMap = {
    [Constants.DB.SAVE_IN_DB]: saveInDBQueueEmployee,
    [Constants.DB.SAVE_IN_REDIS]: saveInRedisQueueEmployee,
    [Constants.DB.UPDATE_IN_DB]: updateInDBQueueEmployee,
};

class QueueImpl implements QueueInterface {
    private workers: Map<string, Worker> = new Map();

    async addJobToQueue(context: ContextType, labels, queueWorker: string, params: {}, maxAttempts?: number, jobTimeout?: number, lockDuration?: number, backOffDelay?: number): Promise<void> {
        const queue = queueMap[queueWorker];

        if (!queue) throw new Error(`Queue ${queueWorker} not found.`);

        const queueJobConfig = {
            attempts: _.defaultTo(maxAttempts, Constants.QUEUE_DB.MAX_ATTEMPTS),
            backoff: {
                type: Constants.QUEUE_DB.BACKOFF_EXPONENTIAL,
                delay: _.defaultTo(backOffDelay, Constants.QUEUE_DB.BACKOFF_DELAY)
            },
            timeout: _.defaultTo(jobTimeout, Constants.QUEUE_DB.JOB_TIMEOUT),
            lockDuration: _.defaultTo(lockDuration, Constants.QUEUE_DB.LOCK_DURATION),
        };

        const queueLabel: AddJobToQueueLabelType = {
            operation: labels.operation,
            subOperation: Constants.LOKI_LOGGER_LABELS.ADD_JOB_TO_QUEUE,
            type: labels.type,
        };
        let loggerDefaultParams = {};
        let logPayload = {
            labels,
            params,
            queueLabel,
            queueJobConfig,
        };

        try {
            await queue.add(queueWorker, {
                params,
                context,
                queueLabel,
            }, queueJobConfig);

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logPayload = { ...logPayload, ...loggerDefaultParams };
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });
            
            throw new Error(error);
        }

        logger.info({ ...logPayload });
    }

    startWorkers() {
        this.registerWorker(Constants.DB.SAVE_IN_DB, async (job: Job) => {
            const { params, context, queueLabel } = job.data;
            const { query, valuesArray, errorMessage } = params;

            const registerWorkerLabel: RegisterWorkerLabelType = {
                operation: queueLabel.operation,
                subOperation: Constants.LOKI_LOGGER_LABELS.REGISTER_JOB,
                type: queueLabel.type
            };
            let loggerDefaultParams = {};
            let logPayload = {
                registerWorkerLabel,
                params,
            };

            try {
                await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, errorMessage, queueLabel);
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.DB.SAVE_IN_DB);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logErrorStack(logPayload, error);
                logger.error({ ...logPayload });

                throw new Error(error);
            }
        });

        this.registerWorker(Constants.DB.SAVE_IN_REDIS, async (job: Job) => {
            const { params, context, queueLabel } = job.data;
            const { key, value, timeout } = params;

            const registerWorkerLabel: RegisterWorkerLabelType = {
                operation: queueLabel.operation,
                subOperation: Constants.LOKI_LOGGER_LABELS.REGISTER_JOB,
                type: queueLabel.type
            };
            let loggerDefaultParams = {};
            let logPayload = {
                registerWorkerLabel,
                params,
            };

            try {
                await helper.setRedis(context, registerWorkerLabel, key, helper.serialiseRedisKeyValues(value), timeout);
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.DB.SAVE_IN_REDIS);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logErrorStack(logPayload, error);
                logger.error({ ...logPayload });

                throw new Error(error);
            }
        });

        this.registerWorker(Constants.DB.UPDATE_IN_DB, async (job: Job) => {
            const { params, context, queueLabel } = job.data;
            const { query, valuesArray, errorMessage } = params;

            const registerWorkerLabel: RegisterWorkerLabelType = {
                operation: queueLabel.operation,
                subOperation: Constants.LOKI_LOGGER_LABELS.REGISTER_JOB,
                type: queueLabel.type
            };
            let loggerDefaultParams = {};
            let logPayload = {
                registerWorkerLabel,
                params,
            };

            try {
                const queryResponse = await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, errorMessage, queueLabel);
                if(!helper.isUpdateQuerySuccessful(queryResponse.command, queryResponse.rowCount)) throw new Error(Constants.DB_ERRORS.UPDATE_FAILED);
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.DB.SAVE_IN_DB);
                logPayload = { ...logPayload, ...loggerDefaultParams };
                logPayload = helper.logErrorStack(logPayload, error);
                logger.error({ ...logPayload });

                throw new Error(error);
            }
        });
    }

    private registerWorker(queueName: string, processor: (job: Job) => Promise<void>) {
        const worker = new Worker(queueName, processor, {
            connection: bullMQConnectionObject.connection,
            lockDuration: helper.convertToType<number>(Constants.QUEUE_DB.LOCK_DURATION, Constants.TYPE_SWITCH.NUMBER),
            concurrency: helper.convertToType<number>(Constants.QUEUE_DB.CONCURRENCY, Constants.TYPE_SWITCH.NUMBER),
        });

        this.workers.set(queueName, worker);
        let loggerDefaultParams = {};
        let logPayload = {
            queueName,
        };

        worker.on('completed', job => {
            const { context, queueLabel } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.LOKI_LOGGER_LABELS.PERFORM_JOB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...queueLabel };
            logPayload = { ...logPayload, ...job };
            logger.info({ ...logPayload });
        });

        worker.on('failed', (job, error) => {
            // DLQ Implementation
            const { context, queueLabel } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.LOKI_LOGGER_LABELS.FAILED_JOB);
            logPayload = { ...logPayload, ...loggerDefaultParams };
            logPayload = { ...logPayload, ...queueLabel };
            logPayload = { ...logPayload, ...job };
            logPayload = helper.logErrorStack(logPayload, error);
            logger.error({ ...logPayload });
        });
    }
}

export const queueEmployee = new QueueImpl();

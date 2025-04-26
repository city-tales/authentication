import { Job, Worker, _ } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { bullMQConnectionObject } from "../config/redis.js";
import { AddJobToQueueLabelInterface, ContextInterface, RegisterWorkerLabelInterface } from "../database/interface/logger.js";
import { Constants } from "./constants.js";
import { helper } from "./helper.js";

interface QueueInterface {
    addJobToQueue(context: ContextInterface, labels, queue, queueWorker: string, params: {}, maxAttempts?: number, lockDuration?: number): Promise<void>;
}

class QueueImpl implements QueueInterface {
    private workers: Map<string, Worker> = new Map();

    async addJobToQueue(context: ContextInterface, labels, queue, queueWorker: string, params: {}, maxAttempts?: number, jobTimeout?: number, lockDuration?: number, backOffDelay?: number): Promise<void> {
        const queueJobConfig = {
            attempts: _.defaultTo(maxAttempts, Constants.QUEUE_DB.MAX_ATTEMPTS),
            backoff: {
                type: Constants.QUEUE_DB.BACKOFF_EXPONENTIAL,
                delay: _.defaultTo(backOffDelay, Constants.QUEUE_DB.BACKOFF_DELAY)
            },
            timeout: _.defaultTo(jobTimeout, Constants.QUEUE_DB.JOB_TIMEOUT),
            lockDuration: _.defaultTo(lockDuration, Constants.QUEUE_DB.LOCK_DURATION),
        };
        
        const queueLabel: AddJobToQueueLabelInterface = {
            operation: labels.operation,
            subOperation: Constants.LOKI_LOGGER_LABELS.ADD_JOB_TO_QUEUE,
            type: labels.type,
        };
        let loggerDefaultParams = {};
        
        try {
            await queue.add(queueWorker, {
                params,
                context,
                queueLabel,
            }, queueJobConfig);

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logger.info({
                queueLabel,
                ...loggerDefaultParams,
                params,
                queueJobConfig,
            });
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logger.error({
                queueLabel,
                ...loggerDefaultParams,
                params,
                queueJobConfig,
                error,
            });

            throw new Error(error);
        }
    }

    startWorkers() {
        this.registerWorker(Constants.DB.SAVE_IN_DB, async (job: Job) => {
            const { params, context, queueLabel } = job.data;
            const { query, valuesArray, errorMessage } = params;

            const registerWorkerLabel: RegisterWorkerLabelInterface = {
                operation: queueLabel.operation,
                subOperation: Constants.LOKI_LOGGER_LABELS.REGISTER_JOB,
                type: queueLabel.type
            };
            let loggerDefaultParams = {};

            try {
                await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, errorMessage, queueLabel);
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.DB.SAVE_IN_DB);
                logger.error({
                    registerWorkerLabel,
                    ...loggerDefaultParams,
                    params,
                    error,
                });

                throw new Error(error);
            }
        });

        this.registerWorker(Constants.DB.SAVE_IN_REDIS, async (job: Job) => {
            const { params, context, queueLabel } = job.data;
            const { key, value } = params;

            const registerWorkerLabel: RegisterWorkerLabelInterface = {
                operation: queueLabel.operation,
                subOperation: Constants.LOKI_LOGGER_LABELS.REGISTER_JOB,
                type: queueLabel.type
            };
            let loggerDefaultParams = {};

            try {
                await helper.setRedis(context, registerWorkerLabel, key, helper.serialiseRedisKeyValues(value));
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.DB.SAVE_IN_REDIS);
                logger.error({
                    registerWorkerLabel,
                    ...loggerDefaultParams,
                    params,
                    error,
                });

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
        
        worker.on('completed', job => {
            const { context, queueLabel } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.LOKI_LOGGER_LABELS.PERFORM_JOB);
            logger.info({
                queueLabel,
                ...loggerDefaultParams,
                ...job,
                queueName,
            });
        });

        worker.on('failed', (job, error) => {
            // DLQ Implementation
            const { context, queueLabel } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER, Constants.LOKI_LOGGER_LABELS.FAILED_JOB);
            logger.error({
                queueLabel,
                ...loggerDefaultParams,
                ...job,
                queueName,
                error,
            });
        });
    }
}

export const queueEmployee = new QueueImpl();

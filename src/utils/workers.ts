import { Job, Worker, _ } from "../config/imports.js";
import { logger } from "../config/loki.js";
import { bullMQConnectionObject } from "../config/redis.js";
import { ContextInterface } from "../database/interface/helper.js";
import { Constants } from "./constants.js";
import { helper } from "./helper.js";

interface QueueInterface {
    addJobToQueue(context: ContextInterface, operation: string, type: string, queue, queueWorker: string, params: {}, maxAttempts?: number, lockDuration?: number): Promise<void>;
}

class QueueImpl implements QueueInterface {
    private workers: Map<string, Worker> = new Map();

    async addJobToQueue(context: ContextInterface, operation: string, type: string, queue, queueWorker: string, params: {}, maxAttempts?: number, jobTimeout?: number, lockDuration?: number, backOffDelay?: number): Promise<void> {
        let loggerDefaultParams = {};
        const queueJobConfig = {
            attempts: _.defaultTo(maxAttempts, Constants.QUEUE_DB.MAX_ATTEMPTS),
            backoff: {
                type: Constants.QUEUE_DB.BACKOFF_EXPONENTIAL,
                delay: _.defaultTo(backOffDelay, Constants.QUEUE_DB.BACKOFF_DELAY)
            },
            timeout: _.defaultTo(jobTimeout, Constants.QUEUE_DB.JOB_TIMEOUT),
            lockDuration: _.defaultTo(lockDuration, Constants.QUEUE_DB.LOCK_DURATION),
        };

        try {
            await queue.add(queueWorker, {
                params,
                context,
                operation,
                type,
            }, queueJobConfig);

            loggerDefaultParams = helper.generateDefaultSuccessParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logger.info(Constants.LOKI_LOGGER_LABELS.ADD_JOB_TO_QUEUE, {
                labels: {
                    operation: operation,
                    type: type,
                },
                loggerDefaultParams,
                params,
                queueJobConfig,
            });
        }
        catch (error) {
            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.QUEUE);
            logger.error(Constants.LOKI_LOGGER_LABELS.ADD_JOB_TO_QUEUE, {
                labels: {
                    operation: operation,
                    type: queueWorker,
                },
                loggerDefaultParams,
                params,
                queueJobConfig,
                error,
            });
        }
    }

    startWorkers() {
        this.registerWorker(Constants.DB.SAVE_IN_DB, async (job: Job) => {
            const { params, context, operation, type } = job.data;
            const { query, valuesArray, errorMessage } = params;
            let loggerDefaultParams = {};

            try {
                await helper.executeQueryAsyncWithoutLock(context, query, valuesArray, errorMessage, operation, type);
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REGISTER_DB_WORKER);
                logger.error(Constants.LOKI_LOGGER_LABELS.REGISTER_JOB, {
                    labels: {
                        operation: operation,
                        type: type,
                    },
                    loggerDefaultParams,
                    params,
                    error,
                });

                throw error;
            }
        });

        this.registerWorker(Constants.DB.SAVE_IN_REDIS, async (job: Job) => {
            const { params, context, operation, type } = job.data;
            const { key, value } = params;
            let loggerDefaultParams = {};

            try {
                await helper.setRedis(context, operation, type, key, helper.serialiseRedisKeyValues(value));
            }
            catch (error) {
                loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.REGISTER_REDIS_WORKER);
                logger.error(Constants.LOKI_LOGGER_LABELS.REGISTER_JOB, {
                    labels: {
                        operation: operation,
                        type: type,
                    },
                    loggerDefaultParams,
                    params,
                    error,
                });

                throw error;
            }
        });
    }

    private registerWorker(queueName: string, processor: (job: Job) => Promise<void>) {
        const worker = new Worker(queueName, processor, {
            connection: bullMQConnectionObject.connection,
            lockDuration: helper.convertToType<number>(Constants.QUEUE_DB.LOCK_DURATION),
            concurrency: helper.convertToType<number>(Constants.QUEUE_DB.CONCURRENCY),
        });

        this.workers.set(queueName, worker);
        let loggerDefaultParams = {};
        
        worker.on('completed', job => {
            const { context, operation, type } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER);
            logger.info(Constants.LOKI_LOGGER_LABELS.PERFORM_JOB, {
                labels: {
                    operation: operation,
                    type: type,
                },
                loggerDefaultParams,
                job,
                queueName,
            });
        });

        worker.on('failed', (job, error) => {
            // DLQ Implementation
            const { context, operation, type } = job?.data || {};

            loggerDefaultParams = helper.generateDefaultFailureParams(context.tracerId, Constants.LOKI_LOGGER_LABELS.WORKER);
            logger.error(Constants.LOKI_LOGGER_LABELS.FAILED_JOB, {
                labels: {
                    operation: operation,
                    type: type,
                },
                loggerDefaultParams,
                job,
                queueName,
                error,
            });
        });
    }
}

export const queueEmployee = new QueueImpl();

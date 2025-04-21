import { Job, Worker, _ } from "../config/imports.js";
import { bullMQConnectionObject } from "../config/redis.js";
import { Constants } from "./constants.js";
import { helper } from "./helper.js";

interface QueueInterface {
    addJobToQueue(queue, queueWorker: string, params: any[], maxAttempts?: number, lockDuration?: number): Promise<void>;
}

class QueueImpl implements QueueInterface {
    private workers: Map<string, Worker> = new Map();

    async addJobToQueue(queue, queueWorker: string, params: any[], maxAttempts?: number, jobTimeout?: number, lockDuration?: number, backOffDelay?: number): Promise<void> {
        await queue.add(queueWorker, { params },
            {
                attempts: _.defaultTo(maxAttempts, Constants.QUEUE_DB.MAX_ATTEMPTS),
                backoff: {
                    type: Constants.QUEUE_DB.BACKOFF_EXPONENTIAL,
                    delay: _.defaultTo(backOffDelay, Constants.QUEUE_DB.BACKOFF_DELAY)
                },
                timeout: _.defaultTo(jobTimeout, Constants.QUEUE_DB.JOB_TIMEOUT),
                lockDuration: _.defaultTo(lockDuration, Constants.QUEUE_DB.LOCK_DURATION),
            },
        );
        // add logs
    }

    startWorkers() {
        this.registerWorker(Constants.DB.SAVE_IN_DB, async (job: Job) => {
            const [query, valuesArray, errorMessage] = job.data.params;
            try {
                await helper.executeQueryAsyncWithoutLock(query, valuesArray, errorMessage);
            }
            catch (error) {
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

        worker.on('completed', job => {
            // logging will occur
            console.log(`✅ [${queueName}] Job ${job.id} completed`);
        });

        worker.on('failed', (job, err) => {
            // logging will occur
            console.error(`❌ [${queueName}] Job ${job?.id} failed`, err);
        });
    }
}

export const queueEmployee = new QueueImpl();

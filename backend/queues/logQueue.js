import { Queue } from 'bullmq';

let logQueue = null;

/**
 * Get or create the log queue
 * Queue name: "gateway-logs"
 */
export function getLogQueue() {
  if (logQueue) {
    return logQueue;
  }

  // Parse Redis URL if provided, otherwise use host/port
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  let connection;
  
  if (redisUrl.startsWith('redis://')) {
    const url = new URL(redisUrl);
    connection = {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
    };
  } else {
    connection = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    };
  }
  
  logQueue = new Queue('gateway-logs', {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
      removeOnComplete: {
        age: 3600, // Keep completed jobs for 1 hour
        count: 1000, // Keep max 1000 completed jobs
      },
      removeOnFail: {
        age: 86400, // Keep failed jobs for 24 hours
      },
    },
  });

  return logQueue;
}

/**
 * Add a log job to the queue (non-blocking)
 * @param {Object} logData - Log data to be processed
 * @returns {Promise} - Returns immediately, job is queued asynchronously
 */
export async function enqueueLog(logData) {
  try {
    const queue = getLogQueue();
    await queue.add('request-log', logData, {
      // Job options
      removeOnComplete: true, // Remove completed jobs immediately
      removeOnFail: false, // Keep failed jobs for debugging
    });
  } catch (error) {
    // Fail silently - logging errors should not affect the gateway response
    console.error('Error enqueueing log:', error.message);
  }
}
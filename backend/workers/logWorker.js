import { Worker } from 'bullmq';
import { connectDB } from '../config/db.js';
import RequestLog from '../models/RequestLog.js';
import { fileURLToPath } from 'url';
import path from 'path';

// Redis connection config
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

/**
 * Create and start the log worker
 * This worker processes log jobs from the "gateway-logs" queue
 * and saves them to MongoDB
 */
export function startLogWorker() {
  // Ensure DB connection
  connectDB().catch(err => {
    console.error('Worker: Failed to connect to MongoDB:', err);
    process.exit(1);
  });

  const worker = new Worker('gateway-logs', async (job) => {
    try {
      const logData = job.data;

      // Save log to MongoDB
      await RequestLog.create({
        method: logData.method,
        path: logData.path,
        statusCode: logData.statusCode,
        responseTime: logData.responseTime,
        apiKey: logData.apiKey || undefined,
        clientId: logData.clientId || undefined,
        routeId: logData.routeId || undefined,
        ip: logData.ip || undefined,
        userAgent: logData.userAgent || undefined,
      });

      console.log(`[Log Worker] Saved log: ${logData.method} ${logData.path} ${logData.statusCode}`);
    } catch (error) {
      console.error('[Log Worker] Error processing log job:', error);
      throw error; // Re-throw to trigger retry
    }
  }, {
    connection,
    concurrency: 5, // Process up to 5 jobs concurrently
    limiter: {
      max: 100, // Max 100 jobs
      duration: 1000, // per second
    },
  });

  // Worker event handlers
  worker.on('completed', (job) => {
    console.log(`[Log Worker] Job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[Log Worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[Log Worker] Worker error:', err);
  });

  console.log('[Log Worker] Started and ready to process jobs');
  
  return worker;
}

// If this file is run directly, start the worker
const __filename = fileURLToPath(import.meta.url);
// Check if this file is being run directly (works cross-platform)
const isMainModule = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename) ||
  process.argv[1].endsWith('logWorker.js') ||
  process.argv[1].endsWith('workers\\logWorker.js') ||
  process.argv[1].endsWith('workers/logWorker.js')
);

if (isMainModule) {
  startLogWorker();
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Log Worker] SIGTERM received, shutting down gracefully');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('[Log Worker] SIGINT received, shutting down gracefully');
    process.exit(0);
  });
}
import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { serverConfig } from './config/server.js';
import logger from './helpers/logger.js';
import { startScheduler } from './scheduler.js';
import Task from './modules/task/task.model.js';

dotenv.config();

// Backfill doneAt for DONE tasks created before the field was introduced.
// Uses updatedAt as a best-effort proxy. Runs once at startup, no-ops on subsequent boots.
const backfillDoneAt = async () => {
  try {
    const result = await Task.updateMany(
      { status: 'DONE', $or: [{ doneAt: null }, { doneAt: { $exists: false } }] },
      [{ $set: { doneAt: '$updatedAt' } }]
    );
    if (result.modifiedCount > 0) {
      logger.info(`[migration] Backfilled doneAt for ${result.modifiedCount} existing DONE task(s)`);
    }
  } catch (err) {
    logger.error(`[migration] backfillDoneAt failed: ${err.message}`);
  }
};

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // One-time backfill for tasks missing doneAt
    await backfillDoneAt();

    // Start background cron jobs (auto-archive, notifications)
    startScheduler();

    // Start server
    const server = app.listen(serverConfig.port,'0.0.0.0', () => {
      logger.info(
        `Server running in ${serverConfig.nodeEnv} mode on port ${serverConfig.port}`
      );
    });

    const gracefulShutdown = (signal) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();


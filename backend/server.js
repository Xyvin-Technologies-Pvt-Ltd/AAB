import dotenv from 'dotenv';
import app from './app.js';
import { connectDatabase } from './config/database.js';
import { serverConfig } from './config/server.js';
import logger from './helpers/logger.js';

dotenv.config();

const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

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


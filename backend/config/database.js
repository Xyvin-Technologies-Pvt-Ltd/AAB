import mongoose from 'mongoose';
import logger from '../helpers/logger.js';

// Re-ensuring every model's indexes against the server on every boot is
// unnecessary once indexes exist in production, and adds startup latency.
// Keep it in development so new/changed indexes in code take effect locally
// without a manual step.
mongoose.set('autoIndex', process.env.NODE_ENV !== 'production');

export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 20,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000,
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.on('error', (error) => {
      logger.error(`MongoDB connection error: ${error.message}`);
    });
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error(`Database connection error: ${error.message}`);
    process.exit(1);
  }
};

export const disconnectDatabase = async () => {
  await mongoose.connection.close();
};

export default connectDatabase;


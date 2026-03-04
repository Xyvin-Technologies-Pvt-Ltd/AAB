import nodemailer from 'nodemailer';
import logger from '../helpers/logger.js';
import dotenv from 'dotenv';

dotenv.config();

export const emailConfig = {
  host: process.env.EMAIL_HOST || 'mail.aaccounting.me',
  port: parseInt(process.env.EMAIL_PORT) || 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER || 'it@aaccounting.me',
    pass: process.env.EMAIL_PASS,
  },
};

export const transporter = nodemailer.createTransport({
  host: emailConfig.host,
  port: emailConfig.port,
  secure: emailConfig.secure,
  auth: {
    user: emailConfig.auth.user,
    pass: emailConfig.auth.pass,
  },
});

transporter.verify((error) => {
  if (error) {
    logger.error('Email server connection error:', error);
  } else {
    logger.info('Email server is ready to send messages');
  }
});

export default transporter;


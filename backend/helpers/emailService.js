import transporter from '../config/email.js';
import logger from './logger.js';

/**
 * Generic email sender
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - HTML email content
 * @returns {Promise<Object>} - Email send result
 */
export const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: `"AAcounting" <${process.env.EMAIL_USER || 'it@aaccounting.me'}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`Email sent successfully to ${to}`, { messageId: info.messageId });
    return info;
  } catch (error) {
    logger.error('Error sending email', { error: error.message, to, subject });
    throw error;
  }
};

/**
 * Send welcome email with auto-generated password
 * @param {string} email - Recipient email address
 * @param {string} password - Auto-generated password
 * @param {string} name - Employee name
 * @returns {Promise<Object>} - Email send result
 */
export const sendWelcomeEmail = async (email, password, name) => {
  const subject = 'Welcome to AAcounting - Your Account Credentials';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to AAcounting</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Welcome to AAcounting!</h1>
        <p>Hello ${name || 'there'},</p>
        <p>Your account has been created successfully. Below are your login credentials:</p>
        <div style="background-color: #ffffff; padding: 20px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #3498db;">
          <p style="margin: 5px 0;"><strong>Email:</strong> ${email}</p>
          <p style="margin: 5px 0;"><strong>Password:</strong> <code style="background-color: #f4f4f4; padding: 5px 10px; border-radius: 3px; font-size: 14px;">${password}</code></p>
        </div>
        <p style="color: #e74c3c; font-weight: bold;">⚠️ Important: Please change your password after your first login for security purposes.</p>
        <p>You can now log in to the system and start using AAcounting.</p>
        <p>If you have any questions or need assistance, please contact the administrator.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px; margin: 0;">This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
};

/**
 * Send password reset email
 * @param {string} email - Recipient email address
 * @param {string} resetToken - Password reset token
 * @returns {Promise<Object>} - Email send result
 */
export const sendPasswordResetEmail = async (email, resetToken) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
  
  const subject = 'Password Reset Request - AAcounting';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
        <h1 style="color: #2c3e50; margin-top: 0;">Password Reset Request</h1>
        <p>Hello,</p>
        <p>You have requested to reset your password for your AAcounting account.</p>
        <p>Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" style="background-color: #3498db; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Reset Password</a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="word-break: break-all; color: #3498db;">${resetUrl}</p>
        <p style="color: #e74c3c; font-weight: bold;">⚠️ This link will expire in 1 hour for security reasons.</p>
        <p>If you did not request this password reset, please ignore this email and your password will remain unchanged.</p>
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="color: #7f8c8d; font-size: 12px; margin: 0;">This is an automated email. Please do not reply to this message.</p>
      </div>
    </body>
    </html>
  `;

  return await sendEmail(email, subject, html);
};


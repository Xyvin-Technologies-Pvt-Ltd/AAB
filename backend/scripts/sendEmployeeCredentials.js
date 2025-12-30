import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../modules/employee/employee.model.js';
import User from '../modules/auth/auth.model.js';
import { sendWelcomeEmail } from '../helpers/emailService.js';
import { connectDatabase } from '../config/database.js';
import logger from '../helpers/logger.js';
import crypto from 'crypto';

dotenv.config();

/**
 * Generate a secure random password
 * @returns {string} - Random password
 */
const generatePassword = () => {
  // Generate 12 character password with uppercase, lowercase, numbers, and special chars
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const special = '!@#$%^&*';
  const allChars = uppercase + lowercase + numbers + special;

  let password = '';
  // Ensure at least one of each type
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < 12; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Send credentials to all employees or a specific test email
 */
const sendEmployeeCredentials = async (testEmail = null) => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    const loginUrl = process.env.LOGIN_URL || 'https://erp.aaccounting.me';
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      sent: 0,
      failed: [],
    };

    let employees;

    if (testEmail) {
      // Test mode: send to specific email
      logger.info(`TEST MODE: Sending credentials to ${testEmail}`);
      
      // Check if employee exists with this email
      let employee = await Employee.findOne({ email: testEmail });
      
      if (!employee) {
        // List available employees
        const allEmployees = await Employee.find({ isActive: true }).select('name email').limit(10);
        
        console.log(`\n❌ No employee found with email: ${testEmail}`);
        
        if (allEmployees.length > 0) {
          console.log('\n📋 Available employees with emails:');
          allEmployees.forEach((emp) => {
            if (emp.email) {
              console.log(`  - ${emp.name} (${emp.email})`);
            }
          });
        } else {
          console.log('\n⚠️  No employees found in database.');
        }
        
        // In test mode, create a test employee if it doesn't exist
        if (!employee) {
          console.log('Creating a test employee record...\n');
          
          // Create a test employee
          employee = await Employee.create({
            name: 'Test Employee',
            email: testEmail,
            monthlyCost: 0,
            monthlyWorkingHours: 160,
            isActive: true,
          });
          
          console.log(`✅ Created test employee: ${employee.name} (${employee.email})\n`);
        }
      }

      employees = [employee];
    } else {
      // Production mode: get all active employees with emails
      employees = await Employee.find({
        email: { $exists: true, $ne: null, $ne: '' },
        isActive: true,
      });
      
      logger.info(`Found ${employees.length} employees with email addresses`);
    }

    if (employees.length === 0) {
      logger.warn('No employees found with email addresses');
      console.log('\n⚠️  No employees found with email addresses.\n');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log(`\n📧 Processing ${employees.length} employee(s)...\n`);

    for (const employee of employees) {
      try {
        results.processed++;

        if (!employee.email) {
          logger.warn(`Employee ${employee.name} (${employee._id}) has no email, skipping`);
          results.skipped++;
          continue;
        }

        // Check if user already exists
        let user = await User.findOne({ email: employee.email });

        if (user) {
          // User exists, generate new password and update
          logger.info(`User exists for ${employee.email}, generating new password`);
          const newPassword = generatePassword();
          user.password = newPassword;
          
          // Link employeeId if not already linked
          if (!user.employeeId) {
            user.employeeId = employee._id;
          }
          
          await user.save();
          results.updated++;

          // Send email with new credentials
          try {
            await sendWelcomeEmailWithLoginUrl(employee.email, newPassword, employee.name, loginUrl);
            results.sent++;
            console.log(`✅ Updated & sent: ${employee.name} (${employee.email})`);
          } catch (emailError) {
            logger.error(`Failed to send email to ${employee.email}`, emailError);
            results.failed.push({ email: employee.email, error: emailError.message });
            console.log(`⚠️  Updated but email failed: ${employee.name} (${employee.email})`);
          }
        } else {
          // Create new user account
          logger.info(`Creating new user account for ${employee.email}`);
          const generatedPassword = generatePassword();

          user = await User.create({
            email: employee.email,
            password: generatedPassword,
            role: 'EMPLOYEE',
            employeeId: employee._id,
            isActive: true,
          });

          results.created++;

          // Send welcome email
          try {
            await sendWelcomeEmailWithLoginUrl(employee.email, generatedPassword, employee.name, loginUrl);
            results.sent++;
            console.log(`✅ Created & sent: ${employee.name} (${employee.email})`);
          } catch (emailError) {
            logger.error(`Failed to send email to ${employee.email}`, emailError);
            results.failed.push({ email: employee.email, error: emailError.message });
            console.log(`⚠️  Created but email failed: ${employee.name} (${employee.email})`);
          }
        }
      } catch (error) {
        logger.error(`Error processing employee ${employee.name} (${employee.email})`, error);
        results.errors.push({ employee: employee.name, email: employee.email, error: error.message });
        console.log(`❌ Error: ${employee.name} (${employee.email}) - ${error.message}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total processed: ${results.processed}`);
    console.log(`New accounts created: ${results.created}`);
    console.log(`Existing accounts updated: ${results.updated}`);
    console.log(`Skipped (no email): ${results.skipped}`);
    console.log(`Emails sent successfully: ${results.sent}`);
    console.log(`Emails failed: ${results.failed.length}`);
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors (${results.errors.length}):`);
      results.errors.forEach((err) => {
        console.log(`  - ${err.employee} (${err.email}): ${err.error}`);
      });
    }

    if (results.failed.length > 0) {
      console.log(`\n⚠️  Failed emails (${results.failed.length}):`);
      results.failed.forEach((fail) => {
        console.log(`  - ${fail.email}: ${fail.error}`);
      });
    }

    console.log('\n✅ Script completed!\n');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    logger.error('Fatal error in sendEmployeeCredentials script', error);
    console.error('\n❌ Fatal error:', error.message);
    await mongoose.connection.close();
    process.exit(1);
  }
};

/**
 * Send welcome email with login URL
 */
const sendWelcomeEmailWithLoginUrl = async (email, password, name, loginUrl) => {
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
          <p style="margin: 10px 0;"><strong>Login URL:</strong> <a href="${loginUrl}" style="color: #3498db; text-decoration: none;">${loginUrl}</a></p>
          <p style="margin: 10px 0;"><strong>Username (Email):</strong> ${email}</p>
          <p style="margin: 10px 0;"><strong>Password:</strong> <code style="background-color: #f4f4f4; padding: 8px 12px; border-radius: 3px; font-size: 16px; font-weight: bold; letter-spacing: 1px;">${password}</code></p>
        </div>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" style="background-color: #3498db; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">Login to AAcounting</a>
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

  const { sendEmail } = await import('../helpers/emailService.js');
  return await sendEmail(email, subject, html);
};

// Run the script
const testEmail = process.argv[2]; // Get test email from command line argument

if (testEmail) {
  console.log(`\n🧪 TEST MODE: Sending credentials to ${testEmail}\n`);
  sendEmployeeCredentials(testEmail);
} else {
  console.log('\n🚀 PRODUCTION MODE: Sending credentials to all employees\n');
  console.log('⚠️  To test with a specific email, run:');
  console.log('   node scripts/sendEmployeeCredentials.js <email>\n');
  sendEmployeeCredentials();
}


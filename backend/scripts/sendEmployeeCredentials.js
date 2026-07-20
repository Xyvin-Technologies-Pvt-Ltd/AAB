import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Employee from '../modules/employee/employee.model.js';
import { sendEmployeeCredentials as sendCredentialsForEmployee } from '../modules/employee/employee.service.js';
import { connectDatabase } from '../config/database.js';
import logger from '../helpers/logger.js';

dotenv.config();

/**
 * Send credentials to all employees or a specific test email
 */
const sendEmployeeCredentials = async (testEmail = null) => {
  try {
    await connectDatabase();
    logger.info('Database connected successfully');

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
      logger.info(`TEST MODE: Sending credentials to ${testEmail}`);

      let employee = await Employee.findOne({ email: testEmail });

      if (!employee) {
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

        console.log('Creating a test employee record...\n');

        employee = await Employee.create({
          name: 'Test Employee',
          email: testEmail,
          monthlyCost: 0,
          monthlyWorkingHours: 160,
          isActive: true,
        });

        console.log(`✅ Created test employee: ${employee.name} (${employee.email})\n`);
      }

      employees = [employee];
    } else {
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

        const result = await sendCredentialsForEmployee(employee._id);

        if (result.accountCreated) {
          results.created++;
          console.log(`✅ Created & sent: ${employee.name} (${employee.email})`);
        } else {
          results.updated++;
          console.log(`✅ Updated & sent: ${employee.name} (${employee.email})`);
        }

        results.sent++;
      } catch (error) {
        if (error.statusCode === 502) {
          results.updated++;
          results.failed.push({ email: employee.email, error: error.message });
          console.log(`⚠️  Updated but email failed: ${employee.name} (${employee.email})`);
          continue;
        }

        logger.error(`Error processing employee ${employee.name} (${employee.email})`, error);
        results.errors.push({ employee: employee.name, email: employee.email, error: error.message });
        console.log(`❌ Error: ${employee.name} (${employee.email}) - ${error.message}`);
      }
    }

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

const testEmail = process.argv[2];

if (testEmail) {
  console.log(`\n🧪 TEST MODE: Sending credentials to ${testEmail}\n`);
  sendEmployeeCredentials(testEmail);
} else {
  console.log('\n🚀 PRODUCTION MODE: Sending credentials to all employees\n');
  console.log('⚠️  To test with a specific email, run:');
  console.log('   node scripts/sendEmployeeCredentials.js <email>\n');
  sendEmployeeCredentials();
}

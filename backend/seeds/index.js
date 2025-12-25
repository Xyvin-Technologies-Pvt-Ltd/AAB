import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../modules/auth/auth.model.js';
import Employee from '../modules/employee/employee.model.js';
import Client from '../modules/client/client.model.js';
import Package from '../modules/package/package.model.js';
import Task from '../modules/task/task.model.js';
import TimeEntry from '../modules/timeEntry/timeEntry.model.js';
import { connectDatabase } from '../config/database.js';
import logger from '../helpers/logger.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Clear existing data
    logger.info('Clearing existing data...');
    await User.deleteMany({});
    await Employee.deleteMany({});
    await Client.deleteMany({});
    await Package.deleteMany({});
    await Task.deleteMany({});
    await TimeEntry.deleteMany({});

    // Create Employees
    logger.info('Creating employees...');
    const employees = await Employee.insertMany([
      {
        name: 'Ahmed Al-Mansoori',
        monthlyCost: 15000,
        monthlyWorkingHours: 160,
        isActive: true,
      },
      {
        name: 'Fatima Hassan',
        monthlyCost: 12000,
        monthlyWorkingHours: 160,
        isActive: true,
      },
      {
        name: 'Mohammed Ali',
        monthlyCost: 18000,
        monthlyWorkingHours: 160,
        isActive: true,
      },
      {
        name: 'Sarah Al-Zahra',
        monthlyCost: 10000,
        monthlyWorkingHours: 160,
        isActive: true,
      },
      {
        name: 'Omar Abdullah',
        monthlyCost: 14000,
        monthlyWorkingHours: 160,
        isActive: true,
      },
    ]);

    // Create Admin User
    logger.info('Creating admin user...');
    const adminUser = await User.create({
      email: 'admin@accounting.com',
      password: 'admin123',
      role: 'ADMIN',
      employeeId: null,
      isActive: true,
    });

    // Create Employee Users
    logger.info('Creating employee users...');
    const employeeUsers = await User.insertMany([
      {
        email: 'ahmed@accounting.com',
        password: 'employee123',
        role: 'EMPLOYEE',
        employeeId: employees[0]._id,
        isActive: true,
      },
      {
        email: 'fatima@accounting.com',
        password: 'employee123',
        role: 'EMPLOYEE',
        employeeId: employees[1]._id,
        isActive: true,
      },
      {
        email: 'mohammed@accounting.com',
        password: 'employee123',
        role: 'EMPLOYEE',
        employeeId: employees[2]._id,
        isActive: true,
      },
      {
        email: 'sarah@accounting.com',
        password: 'employee123',
        role: 'EMPLOYEE',
        employeeId: employees[3]._id,
        isActive: true,
      },
      {
        email: 'omar@accounting.com',
        password: 'employee123',
        role: 'EMPLOYEE',
        employeeId: employees[4]._id,
        isActive: true,
      },
    ]);

    // Create Clients
    logger.info('Creating clients...');
    const clients = await Client.insertMany([
      {
        name: 'Dubai Trading LLC',
        contactPerson: 'Khalid Al-Rashid',
        email: 'khalid@dubaitrading.ae',
        phone: '+971-4-123-4567',
        status: 'ACTIVE',
      },
      {
        name: 'Abu Dhabi Investments',
        contactPerson: 'Mariam Al-Suwaidi',
        email: 'mariam@adinvestments.ae',
        phone: '+971-2-234-5678',
        status: 'ACTIVE',
      },
      {
        name: 'Sharjah Manufacturing Co.',
        contactPerson: 'Yusuf Al-Qasimi',
        email: 'yusuf@sharjahmfg.ae',
        phone: '+971-6-345-6789',
        status: 'ACTIVE',
      },
      {
        name: 'Ras Al Khaimah Real Estate',
        contactPerson: 'Layla Al-Nuaimi',
        email: 'layla@rakrealestate.ae',
        phone: '+971-7-456-7890',
        status: 'ACTIVE',
      },
      {
        name: 'Fujairah Logistics',
        contactPerson: 'Hamad Al-Sharqi',
        email: 'hamad@fujairahlogistics.ae',
        phone: '+971-9-567-8901',
        status: 'ACTIVE',
      },
      {
        name: 'Ajman Services Group',
        contactPerson: 'Noor Al-Nuaimi',
        email: 'noor@ajmanservices.ae',
        phone: '+971-6-678-9012',
        status: 'ACTIVE',
      },
      {
        name: 'Umm Al Quwain Holdings',
        contactPerson: 'Rashid Al-Ali',
        email: 'rashid@uaqholdings.ae',
        phone: '+971-6-789-0123',
        status: 'INACTIVE',
      },
      {
        name: 'Emirates Consulting',
        contactPerson: 'Amina Al-Mazrouei',
        email: 'amina@emiratesconsulting.ae',
        phone: '+971-4-890-1234',
        status: 'ACTIVE',
      },
      {
        name: 'Gulf Finance Corp',
        contactPerson: 'Saeed Al-Kaabi',
        email: 'saeed@gulffinance.ae',
        phone: '+971-2-901-2345',
        status: 'ACTIVE',
      },
      {
        name: 'Desert Oasis Trading',
        contactPerson: 'Zainab Al-Hashimi',
        email: 'zainab@desertoasis.ae',
        phone: '+971-4-012-3456',
        status: 'ACTIVE',
      },
    ]);

    // Create Packages
    logger.info('Creating packages...');
    const packages = [];
    const now = new Date();

    // Recurring packages
    packages.push(
      await Package.create({
        clientId: clients[0]._id,
        name: 'Monthly Bookkeeping',
        type: 'RECURRING',
        billingFrequency: 'MONTHLY',
        contractValue: 5000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[0]._id,
        name: 'Quarterly Tax Preparation',
        type: 'RECURRING',
        billingFrequency: 'QUARTERLY',
        contractValue: 15000,
        startDate: new Date(now.getFullYear(), 0, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[1]._id,
        name: 'Annual Audit Services',
        type: 'RECURRING',
        billingFrequency: 'YEARLY',
        contractValue: 120000,
        startDate: new Date(now.getFullYear(), 0, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[1]._id,
        name: 'Monthly Financial Reporting',
        type: 'RECURRING',
        billingFrequency: 'MONTHLY',
        contractValue: 8000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[2]._id,
        name: 'Monthly Payroll Processing',
        type: 'RECURRING',
        billingFrequency: 'MONTHLY',
        contractValue: 6000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[2]._id,
        name: 'Quarterly VAT Filing',
        type: 'RECURRING',
        billingFrequency: 'QUARTERLY',
        contractValue: 18000,
        startDate: new Date(now.getFullYear(), 0, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[3]._id,
        name: 'Annual Compliance Review',
        type: 'RECURRING',
        billingFrequency: 'YEARLY',
        contractValue: 80000,
        startDate: new Date(now.getFullYear(), 0, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[4]._id,
        name: 'Monthly Accounting Services',
        type: 'RECURRING',
        billingFrequency: 'MONTHLY',
        contractValue: 7000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 4, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[5]._id,
        name: 'Quarterly Financial Analysis',
        type: 'RECURRING',
        billingFrequency: 'QUARTERLY',
        contractValue: 24000,
        startDate: new Date(now.getFullYear(), 0, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[7]._id,
        name: 'Monthly Consulting',
        type: 'RECURRING',
        billingFrequency: 'MONTHLY',
        contractValue: 10000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        status: 'ACTIVE',
      })
    );

    // One-time packages
    packages.push(
      await Package.create({
        clientId: clients[0]._id,
        name: 'System Implementation',
        type: 'ONE_TIME',
        billingFrequency: null,
        contractValue: 50000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 2, 15),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 15),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[1]._id,
        name: 'Financial System Migration',
        type: 'ONE_TIME',
        billingFrequency: null,
        contractValue: 75000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 5, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[3]._id,
        name: 'Due Diligence Review',
        type: 'ONE_TIME',
        billingFrequency: null,
        contractValue: 40000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 3, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 2, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[4]._id,
        name: 'Process Documentation',
        type: 'ONE_TIME',
        billingFrequency: null,
        contractValue: 30000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 3, 1),
        status: 'ACTIVE',
      })
    );

    packages.push(
      await Package.create({
        clientId: clients[8]._id,
        name: 'Financial Restructuring',
        type: 'ONE_TIME',
        billingFrequency: null,
        contractValue: 90000,
        startDate: new Date(now.getFullYear(), now.getMonth() - 6, 1),
        endDate: new Date(now.getFullYear(), now.getMonth() + 6, 1),
        status: 'ACTIVE',
      })
    );

    // Create Tasks
    logger.info('Creating tasks...');
    const tasks = [];

    // Tasks for first few packages
    for (let i = 0; i < Math.min(packages.length, 10); i++) {
      const pkg = packages[i];
      const taskCount = Math.floor(Math.random() * 3) + 2; // 2-4 tasks per package

      for (let j = 0; j < taskCount; j++) {
        const statuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED'];
        tasks.push(
          await Task.create({
            clientId: pkg.clientId,
            packageId: pkg._id,
            name: `Task ${j + 1} for ${pkg.name}`,
            description: `Description for task ${j + 1}`,
            category: ['Bookkeeping', 'Tax', 'Audit', 'Reporting', 'Consulting'][
              Math.floor(Math.random() * 5)
            ],
            status: statuses[Math.floor(Math.random() * statuses.length)],
          })
        );
      }
    }

    // Create Time Entries
    logger.info('Creating time entries...');
    const timeEntries = [];
    const startDate = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const endDate = new Date();

    // Generate time entries for the past 3 months
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      // Skip weekends (optional - comment out if you want weekends too)
      if (d.getDay() === 0 || d.getDay() === 6) continue;

      // Generate 2-5 time entries per day
      const entriesPerDay = Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < entriesPerDay; i++) {
        const randomEmployee = employees[Math.floor(Math.random() * employees.length)];
        const randomPackage = packages[Math.floor(Math.random() * packages.length)];
        const packageTasks = tasks.filter((t) => t.packageId.toString() === randomPackage._id.toString());
        const randomTask = packageTasks[Math.floor(Math.random() * packageTasks.length)] || tasks[0];

        const minutesSpent = [30, 60, 90, 120, 180, 240][Math.floor(Math.random() * 6)];

        timeEntries.push(
          await TimeEntry.create({
            employeeId: randomEmployee._id,
            clientId: randomPackage.clientId,
            packageId: randomPackage._id,
            taskId: randomTask._id,
            date: new Date(d),
            minutesSpent,
            description: `Work on ${randomTask.name}`,
          })
        );
      }
    }

    logger.info('Seed data created successfully!');
    logger.info(`- ${employees.length} employees`);
    logger.info(`- ${employeeUsers.length + 1} users (1 admin, ${employeeUsers.length} employees)`);
    logger.info(`- ${clients.length} clients`);
    logger.info(`- ${packages.length} packages`);
    logger.info(`- ${tasks.length} tasks`);
    logger.info(`- ${timeEntries.length} time entries`);

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();


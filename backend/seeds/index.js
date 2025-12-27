import dotenv from 'dotenv';
import Service from '../modules/service/service.model.js';
import Activity from '../modules/activity/activity.model.js';
import { connectDatabase } from '../config/database.js';
import logger from '../helpers/logger.js';

dotenv.config();

const seedData = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Clear existing data
    logger.info('Clearing existing services and activities...');
    await Service.deleteMany({});
    await Activity.deleteMany({});

    // Create Services
    logger.info('Creating services...');
    const services = await Service.insertMany([
      { name: 'Accounting' },
      { name: 'Supervision' },
      { name: 'Vat Only' },
      { name: 'Vat Registration' },
      { name: 'Vat Deregistration' },
      { name: 'Ct Registration' },
      { name: 'Ct Deregistration' },
      { name: 'Zero' },
      { name: 'AML Services' },
      { name: 'Audit Services' },
      { name: 'Coaching Services' },
      { name: 'Business Valuation Services' },
      { name: 'Clearing Accounting Backlog' },
      { name: 'Client Staff Training' },
      { name: 'Fees Agreed Upon Procedures' },
      { name: 'Fixed Asset Tracking And Tagging Services' },
      { name: 'Fta Amendment Support' },
      { name: 'Icv Support Charges' },
      { name: 'Liquidation Audit Report' },
      { name: 'Onboarding Of Accounting Services' },
      { name: 'Policies And Procedure With Basic Training' },
      { name: 'Survey Support' },
      { name: 'Tax Audit Support' },
      { name: 'Tax Residency Certificate' },
      { name: 'Fta Site Visit' },
      { name: 'Corporate Tax Planning And Preparation' },
      { name: 'Audited Sales Report Support' },
      { name: 'Internal Audit' },
      { name: 'Corporate Tax Return Submission Support' },
    ]);

    // Create Activities
    logger.info('Creating activities...');
    const activities = await Activity.insertMany([
      { name: 'Accounting Software Setup' },
      { name: 'Audit Draft checking' },
      { name: 'Audit Preparation' },
      { name: 'Business Valuation' },
      { name: 'AML Registration' },
      { name: 'AML Policies' },
      { name: 'AML Training' },
      { name: 'AML Submission' },
      { name: 'Checking' },
      { name: 'Client Meeting' },
      { name: 'Client Onboarding' },
      { name: 'Company Liquidation Accounting' },
      { name: 'Consulting' },
      { name: 'Contract Preparation' },
      { name: 'Correspondance including Drafting' },
      { name: 'CT Registration' },
      { name: 'CT Return' },
      { name: 'Data Entry - Accounting' },
      { name: 'Data Entry - VAT Only' },
      { name: 'Data Migration Projects' },
      { name: 'Document Management Hard copies' },
      { name: 'Document Filing - Soft Copies' },
      { name: 'Employee Performance Review' },
      { name: 'ESR (Economic Substance Regulation) Reporting' },
      { name: 'Excise Tax Return' },
      { name: 'Feasibility Study Reports' },
      { name: 'Financial Statements & Review Meeting' },
      { name: 'Fixed Asset Register Maintenance' },
      { name: 'Marangoni' },
      { name: 'Monthly Closing' },
      { name: 'Policy & Procedure Manual Writing' },
      { name: 'Quarterly Closing' },
      { name: 'Quote Preparation' },
      { name: 'Review meeting' },
      { name: 'Sales Meeting' },
      { name: 'Sales report' },
      { name: 'SAP Posting' },
      { name: 'Scanning' },
      { name: 'Staff Training' },
      { name: 'Startup Financial Planning' },
      { name: 'Tax Audit Support' },
      { name: 'VAT Amendment' },
      { name: 'VAT Closing' },
      { name: 'VAT Registration' },
      { name: 'Vat Return' },
      { name: 'Yearly Closing' },
      { name: 'Training - Marangoni' },
      { name: 'Hiring for client' },
      { name: 'Accounting Backlog' },
      { name: 'Supervision - Accounting & VAT' },
      { name: 'Staff Grievance Handling' },
      { name: 'Fines Waiver/Reconsideration' },
      { name: 'TRC Services' },
      { name: 'Corporate Tax planning and preparation' },
      { name: 'VAT Deregistration Support' },
      { name: 'Corporate Tax Deregistration Support' },
      { name: 'ICV Support Services' },
      { name: 'Due Diligence Services' },
      { name: 'Internal Audit Report' },
      { name: 'Audited Sales Report' },
      { name: 'Document Follow up' },
      { name: 'AAB-Collection Follow up' },
      { name: 'AAB-Bank Recon' },
      { name: 'AAB-Invoicing' },
      { name: 'AAB-Pro bono' },
      { name: 'AAB-Masterfile Management' },
      { name: 'AAB-Hiring' },
      { name: 'AAB-Staff training' },
      { name: 'AAB-HR' },
      { name: 'AAB-Planning' },
      { name: 'AAB-Training' },
      { name: 'VAT Checking' },
      { name: 'Exisce Registration' },
      { name: 'VAT Payment' },
      { name: 'CT Deregistration' },
      { name: 'Client Invoicing' },
      { name: 'Work Allocation to staff' },
      { name: 'Salary Certificate' },
      { name: 'Employee Contract' },
      { name: 'FTA Checking' },
      { name: 'Software Meeting' },
      { name: 'Official Letter Drafting' },
      { name: 'Client Communication' },
      { name: 'Economic Survey Report' },
      { name: 'CT Workings' },
      { name: 'CT Closing' },
      { name: 'Liquidation Report' },
      { name: 'Client Bank Opening' },
      { name: 'FTA Complaint' },
    ]);

    logger.info('Seed data created successfully!');
    logger.info(`- ${services.length} services`);
    logger.info(`- ${activities.length} activities`);

    process.exit(0);
  } catch (error) {
    logger.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();

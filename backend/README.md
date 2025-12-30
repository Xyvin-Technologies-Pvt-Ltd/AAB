# Accounting Backend API

Profitability and effort tracking platform backend built with Node.js, Express, and MongoDB.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the backend directory:

```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/accounting
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRE=7d

# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key
AWS_S3_BUCKET_NAME=your-s3-bucket-name

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Email Configuration (SMTP)
EMAIL_HOST=mail.aaccounting.me
EMAIL_PORT=465
EMAIL_USER=it@aaccounting.me
EMAIL_PASS=your-email-password

# Login URL for employee credentials email
LOGIN_URL=https://erp.aaccounting.me
```

3. Make sure MongoDB is running on your system.

4. Seed the database with sample data:

```bash
npm run seed
```

5. Start the development server:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register a new user (Admin only)
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Clients

- `GET /api/clients` - Get all clients (with pagination, search, filters)
- `GET /api/clients/:id` - Get client by ID
- `POST /api/clients` - Create a new client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Employees

- `GET /api/employees` - Get all employees
- `GET /api/employees/:id` - Get employee by ID
- `POST /api/employees` - Create a new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee

### Packages

- `GET /api/packages` - Get all packages (with filters)
- `GET /api/packages/:id` - Get package by ID
- `POST /api/packages` - Create a new package
- `PUT /api/packages/:id` - Update package
- `DELETE /api/packages/:id` - Delete package

### Tasks

- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get task by ID
- `POST /api/tasks` - Create a new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Time Entries

- `GET /api/time-entries` - Get all time entries
- `GET /api/time-entries/:id` - Get time entry by ID
- `POST /api/time-entries` - Create a new time entry
- `PUT /api/time-entries/:id` - Update time entry
- `DELETE /api/time-entries/:id` - Delete time entry

### Analytics (Read-Only)

- `GET /api/analytics/packages` - Get package profitability
- `GET /api/analytics/clients` - Get client profitability
- `GET /api/analytics/employees` - Get employee utilization

## Seed Data

The seed script creates:

- 1 Admin user (email: `admin@accounting.com`, password: `admin123`)
- 5 Employee users with associated employee records
- 10 Clients
- 15 Packages (mix of recurring and one-time)
- 30+ Tasks
- 100+ Time entries

## Authentication

All endpoints except `/api/auth/login` and `/api/auth/register` require authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

## Project Structure

```
backend/
├── config/          # Configuration files
├── helpers/         # Helper functions (calculations, logger, response)
├── middlewares/     # Express middlewares (auth, error handling, validation)
├── modules/         # Feature modules (auth, client, package, etc.)
│   └── [module]/
│       ├── [module].model.js
│       ├── [module].service.js
│       ├── [module].controller.js
│       └── [module].route.js
├── seeds/           # Database seed scripts
├── validators/      # Joi validation schemas
├── app.js           # Express app configuration
└── server.js        # Server entry point
```

## Calculation Logic

- **Revenue Normalization**: Monthly equivalent calculation based on billing frequency
  - MONTHLY → value
  - QUARTERLY → value / 3
  - YEARLY → value / 12
  - ONE_TIME → value / 12

- **Cost Calculation**: Employee hourly cost = monthlyCost / monthlyWorkingHours
- **Profitability**: Profit = Revenue - Cost, Margin = (Profit / Revenue) × 100

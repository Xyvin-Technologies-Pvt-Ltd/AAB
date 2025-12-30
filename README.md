# Profitability Tracking Platform

An internal profitability and effort-tracking platform for accounting firms. This system measures package-level profitability by comparing employee effort costs against package revenue.

## Features

- **Client Management**: Manage client information and status
- **Package Management**: Create and manage packages (recurring and one-time) with billing frequency
- **Task Management**: Organize tasks within packages
- **Employee Management**: Track employee costs and working hours
- **Time Entry Logging**: Log time spent on tasks by employees
- **Profitability Analytics**:
  - Package-level profitability analysis
  - Client-level aggregated profitability
  - Employee utilization metrics

## Technology Stack

### Backend

- Node.js (JavaScript)
- Express.js
- MongoDB with Mongoose
- JWT Authentication
- Joi Validation
- Winston Logging

### Frontend

- React 19
- Vite
- Tailwind CSS
- shadcn/ui
- Zustand (State Management)
- TanStack Query (Server State)
- React Router

## Quick Start

### Prerequisites

- Node.js (v18 or higher)
- MongoDB (running locally or connection string)

### Backend Setup

1. Navigate to backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

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

4. Seed the database:

```bash
npm run seed
```

5. Start the server:

```bash
npm run dev
```

### Frontend Setup

1. Navigate to frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Create `.env` file:

```env
VITE_API_URL=http://localhost:5000/api
```

4. Start the development server:

```bash
npm run dev
```

5. Open `http://localhost:5173` in your browser

## Default Credentials

After seeding:

- **Admin**: `admin@accounting.com` / `admin123`
- **Employee**: `ahmed@accounting.com` / `employee123`

## Project Structure

```
AAcounting/
├── backend/          # Node.js + Express API
│   ├── config/      # Configuration
│   ├── modules/     # Feature modules
│   ├── middlewares/ # Express middlewares
│   ├── helpers/     # Helper functions
│   └── seeds/        # Database seeds
└── frontend/         # React + Vite application
    ├── src/
    │   ├── api/      # API services
    │   ├── pages/    # Page components
    │   ├── components/ # Reusable components
    │   └── store/    # State management
```

## Key Business Rules

1. **Revenue Normalization**: All revenue is normalized to monthly equivalent

   - MONTHLY → value
   - QUARTERLY → value / 3
   - YEARLY → value / 12
   - ONE_TIME → value / 12

2. **Cost Calculation**: Employee hourly cost = monthlyCost / monthlyWorkingHours

3. **Profitability**:

   - Profit = Monthly Revenue - Monthly Cost
   - Margin % = (Profit / Revenue) × 100

4. **Access Control**:
   - Employees can only log/edit their own time entries
   - Admins have full access

## API Documentation

See `backend/README.md` for detailed API endpoint documentation.

## Development

- Backend runs on `http://localhost:5000`
- Frontend runs on `http://localhost:5173`
- API prefix: `/api`

## License

Internal use only.

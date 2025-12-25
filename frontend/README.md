# Accounting Frontend

Profitability and effort tracking platform frontend built with React, Vite, Tailwind CSS, and shadcn/ui.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory:
```env
VITE_API_URL=http://localhost:5000/api
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Features

- **Authentication**: Login with email and password
- **Dashboard**: Overview with summary statistics
- **Clients Management**: Full CRUD operations for clients
- **Packages Management**: Create and manage packages (recurring and one-time)
- **Tasks Management**: Manage tasks associated with packages
- **Employees Management**: Manage employee records and costs
- **Time Entry Logging**: Log time spent on tasks
- **Analytics Dashboard**: View profitability and utilization metrics

## Project Structure

```
frontend/
├── src/
│   ├── api/          # API service functions
│   ├── components/   # Reusable components
│   ├── hooks/        # Custom React hooks
│   ├── layout/       # Layout components
│   ├── pages/        # Page components
│   ├── store/        # Zustand stores
│   ├── ui/           # shadcn/ui components
│   └── utils/        # Utility functions
├── public/            # Static assets
└── package.json
```

## Default Login Credentials

After seeding the backend:
- **Admin**: `admin@accounting.com` / `admin123`
- **Employee**: `ahmed@accounting.com` / `employee123`

## Technologies

- **React 19**: UI library
- **Vite**: Build tool and dev server
- **React Router**: Routing
- **TanStack Query**: Server state management
- **Zustand**: Client state management
- **Axios**: HTTP client
- **Tailwind CSS**: Styling
- **shadcn/ui**: UI component library

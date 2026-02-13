import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./ui/toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { Clients } from "./pages/Clients";
import { ClientDetails } from "./pages/ClientDetails";
import { Packages } from "./pages/Packages";
import { PackageDetails } from "./pages/PackageDetails";
import { Tasks } from "./pages/Tasks";
import { Employees } from "./pages/Employees";
import { EmployeeDetails } from "./pages/EmployeeDetails";
import { TimeEntries } from "./pages/TimeEntries";
import { Analytics } from "./pages/Analytics";
import { PackageAnalytics } from "./pages/PackageAnalytics";
import { ClientAnalytics } from "./pages/ClientAnalytics";
import { EmployeeAnalytics } from "./pages/EmployeeAnalytics";
import { Calendar } from "./pages/Calendar";
import { Alerts } from "./pages/Alerts";
import { Settings } from "./pages/Settings";
import { Teams } from "./pages/Teams";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients"
              element={
                <ProtectedRoute>
                  <Clients />
                </ProtectedRoute>
              }
            />
            <Route
              path="/clients/:id"
              element={
                <ProtectedRoute>
                  <ClientDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages"
              element={
                <ProtectedRoute>
                  <Packages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/packages/:id"
              element={
                <ProtectedRoute>
                  <PackageDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/tasks"
              element={
                <ProtectedRoute>
                  <Tasks />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Employees />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employees/:id"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <EmployeeDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="/time-entries"
              element={
                <ProtectedRoute>
                  <TimeEntries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "EMPLOYEE"]}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/package/:packageId"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "EMPLOYEE"]}>
                  <PackageAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/client/:clientId"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "EMPLOYEE"]}>
                  <ClientAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/analytics/employee/:employeeId"
              element={
                <ProtectedRoute allowedRoles={["ADMIN", "MANAGER", "EMPLOYEE"]}>
                  <EmployeeAnalytics />
                </ProtectedRoute>
              }
            />
            <Route
              path="/calendar"
              element={
                <ProtectedRoute>
                  <Calendar />
                </ProtectedRoute>
              }
            />
            <Route
              path="/alerts"
              element={
                <ProtectedRoute>
                  <Alerts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teams"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Teams />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;

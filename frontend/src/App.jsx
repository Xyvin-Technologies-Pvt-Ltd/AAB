import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "./ui/toast";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Loader } from "./components/Loader";
import { setOnUnauthorized } from "./api/axios";
import { useAuthStore } from "./store/authStore";
import { ErrorBoundary } from "./components/ErrorBoundary";

const Login = lazy(() => import("./pages/Login").then(m => ({ default: m.Login })));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword").then(m => ({ default: m.ForgotPassword })));
const ResetPassword = lazy(() => import("./pages/ResetPassword").then(m => ({ default: m.ResetPassword })));
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Clients = lazy(() => import("./pages/Clients").then(m => ({ default: m.Clients })));
const ClientDetails = lazy(() => import("./pages/ClientDetails").then(m => ({ default: m.ClientDetails })));
const Packages = lazy(() => import("./pages/Packages").then(m => ({ default: m.Packages })));
const PackageDetails = lazy(() => import("./pages/PackageDetails").then(m => ({ default: m.PackageDetails })));
const Tasks = lazy(() => import("./pages/Tasks").then(m => ({ default: m.Tasks })));
const Employees = lazy(() => import("./pages/Employees").then(m => ({ default: m.Employees })));
const EmployeeDetails = lazy(() => import("./pages/EmployeeDetails").then(m => ({ default: m.EmployeeDetails })));
const TimeEntries = lazy(() => import("./pages/TimeEntries").then(m => ({ default: m.TimeEntries })));
const Analytics = lazy(() => import("./pages/Analytics").then(m => ({ default: m.Analytics })));
const PackageAnalytics = lazy(() => import("./pages/PackageAnalytics").then(m => ({ default: m.PackageAnalytics })));
const ClientAnalytics = lazy(() => import("./pages/ClientAnalytics").then(m => ({ default: m.ClientAnalytics })));
const EmployeeAnalytics = lazy(() => import("./pages/EmployeeAnalytics").then(m => ({ default: m.EmployeeAnalytics })));
const Calendar = lazy(() => import("./pages/Calendar").then(m => ({ default: m.Calendar })));
const Alerts = lazy(() => import("./pages/Alerts").then(m => ({ default: m.Alerts })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));
const Teams = lazy(() => import("./pages/Teams").then(m => ({ default: m.Teams })));
const Invoices = lazy(() => import("./pages/Invoices").then(m => ({ default: m.Invoices })));
const CreateInvoice = lazy(() => import("./pages/CreateInvoice").then(m => ({ default: m.CreateInvoice })));
const InvoiceDetails = lazy(() => import("./pages/InvoiceDetails").then(m => ({ default: m.InvoiceDetails })));
const NotFound = lazy(() => import("./pages/NotFound").then(m => ({ default: m.NotFound })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 30 * 1000,
    },
  },
});

function AuthRedirectHandler() {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  useEffect(() => {
    setOnUnauthorized(() => {
      logout();
      navigate("/login", { replace: true });
    });
  }, [navigate, logout]);
  return null;
}

function App() {
  return (
    <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <AuthRedirectHandler />
          <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader /></div>}>
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
            <Route
              path="/invoices"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <Invoices />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/create"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <CreateInvoice />
                </ProtectedRoute>
              }
            />
            <Route
              path="/invoices/:id"
              element={
                <ProtectedRoute allowedRoles={["ADMIN"]}>
                  <InvoiceDetails />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

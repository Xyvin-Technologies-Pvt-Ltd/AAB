import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

export const ProtectedRoute = ({ children, allowedRoles = null }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If allowedRoles is specified, check if user's role is allowed
  if (allowedRoles && user) {
    if (!allowedRoles.includes(user.role)) {
      // Redirect to dashboard if unauthorized
      return <Navigate to="/dashboard" replace />;
    }
  }

  return children;
};


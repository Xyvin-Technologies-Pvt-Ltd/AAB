import { create } from 'zustand';
// store 

const getStoredAuth = () => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  return { token, user, isAuthenticated: !!token };
};

export const useAuthStore = create((set, get) => {
  const stored = getStoredAuth();
  return {
    user: stored.user,
    token: stored.token,
    isAuthenticated: stored.isAuthenticated,

    login: (user, token) => {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, token, isAuthenticated: true });
    },

    logout: () => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      set({ user: null, token: null, isAuthenticated: false });
    },

    setUser: (user) => {
      localStorage.setItem('user', JSON.stringify(user));
      set({ user });
    },

    // Permission helpers
    isAdmin: () => {
      const { user } = get();
      return user?.role === 'ADMIN';
    },

    isManager: () => {
      const { user } = get();
      return user?.role === 'MANAGER';
    },

    isEmployee: () => {
      const { user } = get();
      return user?.role === 'EMPLOYEE';
    },

    canAccess: (resource, action = 'view') => {
      const { user } = get();
      if (!user) return false;

      const role = user.role;

      // ADMIN has full access to everything
      if (role === 'ADMIN') {
        return true;
      }

      // Resource-specific permissions
      const permissions = {
        analytics: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: ['view'],
          EMPLOYEE: ['view'],
        },
        settings: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: [],
          EMPLOYEE: [],
        },
        timeEntries: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: ['view'],
          EMPLOYEE: ['view'],
        },
        tasks: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: ['view', 'edit'],
          EMPLOYEE: ['view', 'edit'],
        },
        employees: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: [],
          EMPLOYEE: [],
        },
        teams: {
          ADMIN: ['view', 'edit', 'delete'],
          MANAGER: [],
          EMPLOYEE: [],
        },
      };

      const resourcePermissions = permissions[resource];
      if (!resourcePermissions) {
        return false;
      }

      const rolePermissions = resourcePermissions[role] || [];
      return rolePermissions.includes(action);
    },
  };
});


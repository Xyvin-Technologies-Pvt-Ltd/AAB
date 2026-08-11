import { useQuery } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { analyticsApi } from '../analytics';

export const useDashboardStatistics = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.dashboardStatistics(),
    queryFn: () => analyticsApi.getDashboardStatistics(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useClientProfitability = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.clients(params),
    queryFn: () => analyticsApi.getClientProfitability(params),
    ...options,
  });
};

export const useEmployeeUtilization = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.employees(params),
    queryFn: () => analyticsApi.getEmployeeUtilization(params),
    ...options,
  });
};

export const usePackageProfitability = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.packages(params),
    queryFn: () => analyticsApi.getPackageProfitability(params),
    ...options,
  });
};

export const useClientDashboard = (clientId, params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.client(clientId, params),
    queryFn: () => analyticsApi.getClientDashboard(clientId, params),
    enabled: !!clientId,
    ...options,
  });
};

export const useClientAnalytics = (clientId, params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.client(clientId, params),
    queryFn: () => analyticsApi.getClientAnalytics(clientId, params),
    enabled: !!clientId,
    ...options,
  });
};

export const useEmployeeAnalytics = (employeeId, params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.employee(employeeId, params),
    queryFn: () => analyticsApi.getEmployeeAnalytics(employeeId, params),
    enabled: !!employeeId,
    ...options,
  });
};

export const usePackageAnalytics = (packageId, params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.analytics.package(packageId, params),
    queryFn: () => analyticsApi.getPackageAnalytics(packageId, params),
    enabled: !!packageId,
    ...options,
  });
};

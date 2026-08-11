import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getNextPageFromPagination } from './queryKeys';
import { notificationsApi } from '../notifications';

export const useNotifications = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.notifications.list(params),
    queryFn: () => notificationsApi.getAll(params),
    ...options,
  });
};

export const useInfiniteNotifications = (params = {}, options = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.notifications.infinite(params),
    queryFn: ({ pageParam = 1 }) => notificationsApi.getAll({ ...params, page: pageParam }),
    getNextPageParam: getNextPageFromPagination,
    initialPageParam: 1,
    ...options,
  });
};

export const useUnreadNotificationCount = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.notifications.unreadCount(),
    queryFn: () => notificationsApi.getUnreadCount(),
    refetchInterval: 30000,
    ...options,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => notificationsApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => notificationsApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
};

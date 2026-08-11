import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { activitiesApi } from '../activities';
import { useToast } from '@/hooks/useToast';

export const useActivities = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.activities.list(params),
    queryFn: () => activitiesApi.getAll(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useActivityDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.activities.detail(id),
    queryFn: () => activitiesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => activitiesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      toast({ title: 'Success', description: 'Activity created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create activity',
        type: 'error',
      });
    },
  });
};

export const useUpdateActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => activitiesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      toast({ title: 'Success', description: 'Activity updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update activity',
        type: 'error',
      });
    },
  });
};

export const useDeleteActivity = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => activitiesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
      toast({ title: 'Success', description: 'Activity deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete activity',
        type: 'error',
      });
    },
  });
};

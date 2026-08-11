import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { servicesApi } from '../services';
import { useToast } from '@/hooks/useToast';

export const useServices = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.services.list(params),
    queryFn: () => servicesApi.getAll(params),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

export const useServiceDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.services.detail(id),
    queryFn: () => servicesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => servicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast({ title: 'Success', description: 'Service created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create service',
        type: 'error',
      });
    },
  });
};

export const useUpdateService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => servicesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast({ title: 'Success', description: 'Service updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update service',
        type: 'error',
      });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => servicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.services.all });
      toast({ title: 'Success', description: 'Service deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete service',
        type: 'error',
      });
    },
  });
};

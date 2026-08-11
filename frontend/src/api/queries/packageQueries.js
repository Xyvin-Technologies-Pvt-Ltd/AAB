import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { packagesApi } from '../packages';
import { useToast } from '@/hooks/useToast';

export const usePackages = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.packages.list(filters),
    queryFn: () => packagesApi.getAll(filters),
    ...options,
  });
};

export const usePackagesPaginated = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.packages.list(filters),
    queryFn: () => packagesApi.getAll(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const usePackageDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.packages.detail(id),
    queryFn: () => packagesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const usePackagesByClient = (clientId, filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.packages.byClient(clientId),
    queryFn: () => packagesApi.getAll({ clientId, ...filters }),
    enabled: !!clientId,
    ...options,
  });
};

export const useCreatePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => packagesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast({ title: 'Success', description: 'Package created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create package',
        type: 'error',
      });
    },
  });
};

export const useUpdatePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => packagesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.packages.detail(variables.id) });
      }
      toast({ title: 'Success', description: 'Package updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update package',
        type: 'error',
      });
    },
  });
};

export const useDeletePackage = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => packagesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast({ title: 'Success', description: 'Package deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete package',
        type: 'error',
      });
    },
  });
};

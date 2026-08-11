import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { employeesApi } from '../employees';
import { useToast } from '@/hooks/useToast';

export const useEmployees = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => employeesApi.getAll(filters),
    ...options,
  });
};

export const useEmployeesPaginated = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => employeesApi.getAll(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useEmployeeDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.employees.detail(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => employeesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Success', description: 'Employee created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create employee',
        type: 'error',
      });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => employeesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      }
      toast({ title: 'Success', description: 'Employee updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update employee',
        type: 'error',
      });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => employeesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Success', description: 'Employee deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete employee',
        type: 'error',
      });
    },
  });
};

export const useUploadEmployeeDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, file }) => employeesApi.uploadDocument(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      toast({ title: 'Success', description: 'Document uploaded successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload document',
        type: 'error',
      });
    },
  });
};

export const useDeleteEmployeeDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, documentId }) => employeesApi.deleteDocument(id, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      toast({ title: 'Success', description: 'Document deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete document',
        type: 'error',
      });
    },
  });
};

export const useUploadEmployeeProfilePicture = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, file }) => employeesApi.uploadProfilePicture(id, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Success', description: 'Profile picture updated', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload profile picture',
        type: 'error',
      });
    },
  });
};

export const useDeleteEmployeeProfilePicture = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => employeesApi.deleteProfilePicture(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Success', description: 'Profile picture removed', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove profile picture',
        type: 'error',
      });
    },
  });
};

export const useSendEmployeeCredentials = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => employeesApi.sendCredentials(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
      toast({ title: 'Success', description: 'Credentials sent successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send credentials',
        type: 'error',
      });
    },
  });
};

import { keepPreviousData, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { invoicesApi } from '../invoices';
import { useToast } from '@/hooks/useToast';

export const useInvoices = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: () => invoicesApi.getAll(filters),
    ...options,
  });
};

export const useInvoicesPaginated = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.list(filters),
    queryFn: () => invoicesApi.getAll(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useInvoiceDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.detail(id),
    queryFn: () => invoicesApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useUnbilledTimeEntries = (clientId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.invoices.unbilledTimeEntries(clientId),
    queryFn: () => invoicesApi.getUnbilledTimeEntries(clientId),
    enabled: !!clientId,
    ...options,
  });
};

export const useCreateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => invoicesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Invoice created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create invoice',
        type: 'error',
      });
    },
  });
};

export const useUpdateInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => invoicesApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Invoice updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update invoice',
        type: 'error',
      });
    },
  });
};

export const useUpdateInvoiceStatus = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, status }) => invoicesApi.updateStatus(id, status),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.detail(variables.id) });
      toast({ title: 'Success', description: 'Invoice status updated', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update status',
        type: 'error',
      });
    },
  });
};

export const useDeleteInvoice = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.invoices.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Invoice deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete invoice',
        type: 'error',
      });
    },
  });
};

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { clientsApi } from '../clients';
import { useToast } from '@/hooks/useToast';

export const useClients = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => clientsApi.getAll(filters),
    ...options,
  });
};

export const useClientCount = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.count(),
    queryFn: () => clientsApi.getAll({ limit: 1 }),
    ...options,
  });
};

export const useClientDetails = (clientId, params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.detail(clientId),
    queryFn: () => clientsApi.getById(clientId, params),
    enabled: !!clientId,
    ...options,
  });
};

export const useClientAlerts = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.alerts(params),
    queryFn: () => clientsApi.getAllAlerts(params),
    ...options,
  });
};

export const useClientCalendarEvents = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.calendarEvents(params),
    queryFn: () => clientsApi.getCalendarEvents(params),
    ...options,
  });
};

export const useNextSubmissionDates = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.submissionDates(),
    queryFn: () => clientsApi.getNextSubmissionDates(),
    ...options,
  });
};

export const useComplianceStatus = (clientId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.clients.compliance(clientId),
    queryFn: () => clientsApi.getComplianceStatus(clientId),
    enabled: !!clientId,
    ...options,
  });
};

export const useCreateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => clientsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast({ title: 'Success', description: 'Client created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create client',
        type: 'destructive',
      });
    },
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => clientsApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.id) });
      }
      toast({ title: 'Success', description: 'Client updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update client',
        type: 'destructive',
      });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => clientsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      toast({ title: 'Success', description: 'Client deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete client',
        type: 'destructive',
      });
    },
  });
};

export const useBulkUploadClients = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ file, onUploadProgress }) => clientsApi.bulkUploadClients(file, onUploadProgress),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.packages.all });
      toast({ title: 'Success', description: 'Clients uploaded successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload clients',
        type: 'error',
      });
    },
  });
};

export const useUpdateEmaraTaxCredentials = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }) => clientsApi.updateEmaraTaxCredentials(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.emaraTaxCredentials(variables.clientId) });
      toast({ title: 'Success', description: 'EmaraTax credentials updated', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update credentials',
        type: 'error',
      });
    },
  });
};

export const useAssignDocument = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, documentId, personId }) =>
      clientsApi.assignDocument(clientId, documentId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.compliance(variables.clientId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to assign document',
        type: 'error',
      });
    },
  });
};

export const useDocumentUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, category, file, personId }) =>
      clientsApi.uploadDocumentByType(clientId, category, file, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({
        title: 'Success',
        description: 'Document uploaded and processed successfully',
        type: 'success',
      });
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

export const useDocumentProcess = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, documentId }) => clientsApi.processDocument(clientId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({
        title: 'Success',
        description: 'Document processed successfully. Data extracted.',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to process document',
        type: 'error',
      });
    },
  });
};

export const useDocumentReprocess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, documentId }) => clientsApi.processDocument(clientId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
    },
  });
};

export const useDocumentVerify = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, documentId, verifiedFields }) =>
      clientsApi.verifyDocument(clientId, documentId, verifiedFields),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.compliance(variables.clientId) });
      toast({
        title: 'Success',
        description: 'Document verified successfully',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to verify document',
        type: 'error',
      });
    },
  });
};

export const useDocumentDelete = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, documentId }) => clientsApi.deleteDocument(clientId, documentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.compliance(variables.clientId) });
      toast({
        title: 'Success',
        description: 'Document deleted successfully',
        type: 'success',
      });
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

export const useBusinessInfoUpdate = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }) => clientsApi.updateBusinessInfo(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({
        title: 'Success',
        description: 'Business information updated successfully',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update business information',
        type: 'error',
      });
    },
  });
};

export const useAddPartner = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }) => clientsApi.addPartner(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Partner added successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add partner',
        type: 'error',
      });
    },
  });
};

export const useUpdatePartner = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, personId, data }) =>
      clientsApi.updatePartner(clientId, personId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Partner updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update partner',
        type: 'error',
      });
    },
  });
};

export const useDeletePartner = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, personId }) => clientsApi.deletePartner(clientId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Partner removed successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove partner',
        type: 'error',
      });
    },
  });
};

export const useAddManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, data }) => clientsApi.addManager(clientId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Manager added successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add manager',
        type: 'error',
      });
    },
  });
};

export const useUpdateManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, personId, data }) =>
      clientsApi.updateManager(clientId, personId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Manager updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update manager',
        type: 'error',
      });
    },
  });
};

export const useDeleteManager = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, personId }) => clientsApi.deleteManager(clientId, personId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.detail(variables.clientId) });
      toast({ title: 'Success', description: 'Manager removed successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to remove manager',
        type: 'error',
      });
    },
  });
};

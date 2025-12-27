import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../clients';
import { useToast } from '@/hooks/useToast';

export const useClientDetails = (clientId) => {
  return useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getById(clientId),
    enabled: !!clientId,
  });
};

export const useDocumentUpload = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, category, file, personId }) =>
      clientsApi.uploadDocumentByType(clientId, category, file, personId),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      // Toast notifications handled in component
    },
    onError: () => {
      // Error handling done in component with specific status messages
    },
  });
};

export const useDocumentVerify = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ clientId, documentId, verifiedFields }) =>
      clientsApi.verifyDocument(clientId, documentId, verifiedFields),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['compliance', variables.clientId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      queryClient.invalidateQueries({ queryKey: ['compliance', variables.clientId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Partner added successfully',
        type: 'success',
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Partner updated successfully',
        type: 'success',
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Partner removed successfully',
        type: 'success',
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Manager added successfully',
        type: 'success',
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Manager updated successfully',
        type: 'success',
      });
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['client', variables.clientId] });
      toast({
        title: 'Success',
        description: 'Manager removed successfully',
        type: 'success',
      });
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

export const useComplianceStatus = (clientId) => {
  return useQuery({
    queryKey: ['compliance', clientId],
    queryFn: () => clientsApi.getComplianceStatus(clientId),
    enabled: !!clientId,
  });
};


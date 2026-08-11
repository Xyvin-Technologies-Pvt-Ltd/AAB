import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { calendarApi } from '../calendar';
import { useToast } from '@/hooks/useToast';

export const useGenerateCalendarToken = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => calendarApi.generateToken(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      toast({ title: 'Success', description: 'Calendar subscription link generated', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to generate calendar link',
        type: 'error',
      });
    },
  });
};

export const useRevokeCalendarToken = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => calendarApi.revokeToken(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.calendar.all });
      toast({ title: 'Success', description: 'Calendar subscription revoked', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to revoke calendar link',
        type: 'error',
      });
    },
  });
};

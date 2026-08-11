import { keepPreviousData, useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys, getNextPageFromPagination } from './queryKeys';
import { timeEntriesApi } from '../timeEntries';
import { useToast } from '@/hooks/useToast';

export const useTimeEntries = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.timeEntries.list(filters),
    queryFn: () => timeEntriesApi.getAll(filters),
    ...options,
  });
};

export const useTimeEntriesPaginated = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.timeEntries.list(filters),
    queryFn: () => timeEntriesApi.getAll(filters),
    placeholderData: keepPreviousData,
    ...options,
  });
};

export const useInfiniteTimeEntries = (filters = {}, options = {}) => {
  return useInfiniteQuery({
    queryKey: queryKeys.timeEntries.infinite(filters),
    queryFn: ({ pageParam = 1 }) =>
      timeEntriesApi.getAll({ ...filters, page: pageParam }),
    getNextPageParam: getNextPageFromPagination,
    initialPageParam: 1,
    ...options,
  });
};

export const useEmployeeTimeEntries = (employeeId, dateRange, options = {}) => {
  return useQuery({
    queryKey: queryKeys.timeEntries.byEmployee(employeeId, dateRange),
    queryFn: () =>
      timeEntriesApi.getAll({
        employeeId,
        startDate: dateRange?.startDate,
        endDate: dateRange?.endDate,
        limit: 1000,
      }),
    enabled: !!employeeId,
    ...options,
  });
};

export const useRunningTimer = (employeeId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.timeEntries.running(employeeId),
    queryFn: () => timeEntriesApi.getRunningTimer(employeeId),
    enabled: !!employeeId,
    refetchInterval: 5000,
    staleTime: 2000,
    ...options,
  });
};

export const useCreateTimeEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => timeEntriesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Time entry created', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create time entry',
        type: 'error',
      });
    },
  });
};

export const useUpdateTimeEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => timeEntriesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Time entry updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update time entry',
        type: 'error',
      });
    },
  });
};

export const useDeleteTimeEntry = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => timeEntriesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Time entry deleted', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete time entry',
        type: 'error',
      });
    },
  });
};

export const useStartTimer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => timeEntriesApi.startTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Timer started', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start timer',
        type: 'destructive',
      });
    },
  });
};

export const useStartTimerForTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, employeeId }) => timeEntriesApi.startTimerForTask(taskId, employeeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Timer started', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start timer',
        type: 'destructive',
      });
    },
  });
};

export const useStartMiscTimer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => timeEntriesApi.startMiscellaneousTimer(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Timer started', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to start timer',
        type: 'destructive',
      });
    },
  });
};

export const useStopTimer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, markTaskComplete = false }) => timeEntriesApi.stopTimer(id, markTaskComplete),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Timer stopped', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to stop timer',
        type: 'destructive',
      });
    },
  });
};

export const usePauseTimer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => timeEntriesApi.pauseTimer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Timer paused', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to pause timer',
        type: 'destructive',
      });
    },
  });
};

export const useResumeTimer = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => timeEntriesApi.resumeTimer(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.timeEntries.all });
      toast({ title: 'Success', description: 'Timer resumed', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to resume timer',
        type: 'destructive',
      });
    },
  });
};

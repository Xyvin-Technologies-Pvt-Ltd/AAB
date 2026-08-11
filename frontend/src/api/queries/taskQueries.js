import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { tasksApi, adminApi } from '../tasks';
import { useToast } from '@/hooks/useToast';

export const useTasks = (filters = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: () => tasksApi.getAll(filters),
    ...options,
  });
};

export const useTaskDetail = (id, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: () => tasksApi.getById(id),
    enabled: !!id,
    ...options,
  });
};

export const useDashboardTasks = (params = { limit: 1000 }, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.dashboard(),
    queryFn: () => tasksApi.getAll(params),
    ...options,
  });
};

export const useTaskWorkload = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.workload(params),
    queryFn: () => tasksApi.getWorkload(params),
    ...options,
  });
};

export const useArchivedTasks = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.archived(params),
    queryFn: () => tasksApi.getArchived(params),
    ...options,
  });
};

export const useCalendarTasks = (params = {}, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.calendar(params),
    queryFn: () => tasksApi.getCalendarTasks(params),
    ...options,
  });
};

export const useEmployeeTasks = (employeeId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.tasks.byEmployee(employeeId),
    queryFn: () => tasksApi.getAll({ assignedTo: employeeId, limit: 1000 }),
    enabled: !!employeeId,
    ...options,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (data) => tasksApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Task created successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        type: 'error',
      });
    },
  });
};

export const useUpdateTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ id, data }) => tasksApi.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (variables?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.id) });
      }
      toast({ title: 'Success', description: 'Task updated successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        type: 'error',
      });
    },
  });
};

export const useDeleteTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (id) => tasksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Task deleted successfully', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task',
        type: 'error',
      });
    },
  });
};

export const useUpdateTaskOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, order }) => tasksApi.updateOrder(id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
};

export const useArchiveTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId) => tasksApi.archive(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Task archived', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to archive task',
        type: 'error',
      });
    },
  });
};

export const useUnarchiveTask = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (taskId) => tasksApi.unarchive(taskId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Task restored', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to restore task',
        type: 'error',
      });
    },
  });
};

export const useTriggerArchive = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: () => adminApi.triggerArchive(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      toast({ title: 'Success', description: 'Archive job triggered', type: 'success' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to trigger archive',
        type: 'error',
      });
    },
  });
};

export const useAddTaskComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, content }) => tasksApi.addComment(taskId, content),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add comment',
        type: 'error',
      });
    },
  });
};

export const useDeleteTaskComment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, commentId }) => tasksApi.deleteComment(taskId, commentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete comment',
        type: 'error',
      });
    },
  });
};

export const useAddTaskAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, file }) => tasksApi.addAttachment(taskId, file),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to add attachment',
        type: 'error',
      });
    },
  });
};

export const useDeleteTaskAttachment = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ taskId, attachmentId }) => tasksApi.deleteAttachment(taskId, attachmentId),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(variables.taskId) });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete attachment',
        type: 'error',
      });
    },
  });
};

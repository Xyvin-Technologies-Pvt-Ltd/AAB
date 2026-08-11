import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import { getSessions, getSession, deleteSession, getInsights } from '../aiChat';

export const useChatSessions = (page = 1, limit = 30, options = {}) => {
  return useQuery({
    queryKey: [...queryKeys.aiChat.sessions(), page, limit],
    queryFn: () => getSessions(page, limit),
    ...options,
  });
};

export const useChatSession = (sessionId, options = {}) => {
  return useQuery({
    queryKey: queryKeys.aiChat.session(sessionId),
    queryFn: () => getSession(sessionId),
    enabled: !!sessionId,
    ...options,
  });
};

export const useDeleteChatSession = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiChat.sessions() });
    },
  });
};

export const useAIInsights = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.aiChat.insights(),
    queryFn: () => getInsights(),
    staleTime: 5 * 60 * 1000,
    ...options,
  });
};

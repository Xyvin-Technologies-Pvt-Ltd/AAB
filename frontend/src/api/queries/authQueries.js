import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from './queryKeys';
import { authApi } from '../auth';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/hooks/useToast';

export const useCurrentUser = (options = {}) => {
  return useQuery({
    queryKey: queryKeys.auth.me(),
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data;
    },
    enabled: !!localStorage.getItem('token'),
    ...options,
  });
};

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      const { token, user } = data.data;
      login(user, token);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me() });
      navigate('/dashboard');
    },
  });
};

export const useChangePassword = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (passwordData) => authApi.changePassword(passwordData),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password changed successfully',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to change password',
        variant: 'error',
      });
    },
  });
};

export const useUpdateAccountDetails = () => {
  const { setUser } = useAuthStore();
  const { toast } = useToast();

  return useMutation({
    mutationFn: (formData) => authApi.updateAccountDetails(formData),
    onSuccess: (updatedUser) => {
      setUser(updatedUser.data);
      toast({
        title: 'Success',
        description: 'Account details updated successfully',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update account details',
        variant: 'error',
      });
    },
  });
};

export const useForgotPassword = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: (email) => authApi.forgotPassword(email),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset link sent to your email',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to send reset link',
        type: 'error',
      });
    },
  });
};

export const useResetPassword = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: ({ token, newPassword }) => authApi.resetPassword(token, newPassword),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Password reset successfully',
        type: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to reset password',
        type: 'error',
      });
    },
  });
};

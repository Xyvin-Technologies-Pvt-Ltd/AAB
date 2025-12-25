import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { authApi } from '@/api/auth';
import { useNavigate } from 'react-router-dom';

export const useLogin = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }) => authApi.login(email, password),
    onSuccess: (data) => {
      const { token, user } = data.data;
      login(user, token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      queryClient.invalidateQueries({ queryKey: ['user'] });
      navigate('/dashboard');
    },
  });
};

export const useGetMe = () => {
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ['user', 'me'],
    queryFn: async () => {
      const response = await authApi.getMe();
      return response.data;
    },
    enabled: !!localStorage.getItem('token'),
    onSuccess: (data) => {
      setUser(data);
    },
  });
};


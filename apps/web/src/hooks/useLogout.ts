import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { logout } from '../services/auth.service.js';
import { useInvalidateCurrentUser } from './useAuth.js';

export function useLogout() {
  const navigate = useNavigate();
  const invalidateCurrentUser = useInvalidateCurrentUser();

  return useMutation({
    mutationFn: logout,
    onSettled: async () => {
      await invalidateCurrentUser();
      navigate('/login', { replace: true });
    },
  });
}

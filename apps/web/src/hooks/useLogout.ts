import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { logout } from '../services/auth.service.js';

export function useLogout() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: logout,
    // Every other member-scoped query (chores, money requests, dashboard overview...) is
    // cached under a fixed key with no user id in it, so a plain invalidate-and-refetch
    // still briefly serves this member's data to whoever logs in next on the same device.
    // A full clear is the only way to guarantee nothing leaks across the switch.
    onSettled: async () => {
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });
}

import { useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { logoutUser } from '@/lib/api/auth.service';
import { getTokens, clearTokens } from '@/lib/auth';

export function useLogout() {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const router = useRouter();

  const logout = useCallback(async () => {
    setLoading(true);
    const { refresh_token } = getTokens();

    // Best-effort server-side revocation
    if (refresh_token) {
      try {
        await logoutUser(refresh_token);
      } catch {
        // Intentionally swallowed — local cleanup must always run
      }
    }

    // Guaranteed local cleanup
    clearTokens();
    queryClient.clear();
    router.push('/auth/login');
    // Note: setLoading(false) not called — navigation unmounts the component
  }, [queryClient, router]);

  return { logout, loading };
}

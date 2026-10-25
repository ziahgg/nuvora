import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { useToast } from '@/components/Feedback';
import { api, AppError, type SessionUser, type Workspace } from '@/data';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});

interface SessionState {
  user: SessionUser | null;
  ready: boolean;
}

const SessionContext = createContext<SessionState>({ user: null, ready: false });

export function useSession() {
  return useContext(SessionContext);
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ user: null, ready: false });

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then((user) => alive && setState({ user, ready: true }))
      .catch(() => alive && setState({ user: null, ready: true }));
    const unsubscribe = api.onAuthChange((user) => {
      setState({ user, ready: true });
      if (!user) queryClient.clear();
      else void queryClient.invalidateQueries({ queryKey: ['workspace'] });
    });
    return () => {
      alive = false;
      unsubscribe();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={state}>{children}</SessionContext.Provider>
    </QueryClientProvider>
  );
}

export const WORKSPACE_KEY = ['workspace'] as const;

/** The signed-in user's business workspace (null → business setup needed). */
export function useWorkspaceQuery() {
  const { user } = useSession();
  return useQuery({
    queryKey: [...WORKSPACE_KEY, user?.id],
    queryFn: () => api.loadWorkspace(),
    enabled: !!user,
  });
}

/** Non-null workspace for screens inside the authenticated app group. */
export function useWorkspace(): Workspace {
  const { data } = useWorkspaceQuery();
  if (!data) throw new AppError('Workspace not loaded', 'unknown');
  return data;
}

export function errorMessage(e: unknown): string {
  if (e instanceof AppError) return e.message;
  if (e instanceof Error && /network|fetch/i.test(e.message)) return 'You’re offline. Check your connection and try again.';
  return 'Something went wrong. Please try again.';
}

/**
 * Wraps a backend call: shows a success toast, refreshes the workspace and
 * surfaces failures as an error toast (never silently swallowed).
 */
export function useAction<TArgs, TResult>(
  fn: (args: TArgs) => Promise<TResult>,
  opts: {
    success?: string | ((result: TResult, args: TArgs) => string | null);
    onSuccess?: (result: TResult, args: TArgs) => void;
    aboveTabBar?: boolean;
  } = {},
) {
  const qc = useQueryClient();
  const toast = useToast();
  const mutation = useMutation({
    mutationFn: fn,
    onSuccess: async (result, args) => {
      await qc.invalidateQueries({ queryKey: WORKSPACE_KEY });
      const msg = typeof opts.success === 'function' ? opts.success(result, args) : opts.success;
      if (msg) toast(msg, { kind: 'success', aboveTabBar: opts.aboveTabBar });
      opts.onSuccess?.(result, args);
    },
    onError: (error) => toast(errorMessage(error), { kind: 'error', aboveTabBar: opts.aboveTabBar }),
  });
  return useMemo(
    () => ({ run: mutation.mutate, runAsync: mutation.mutateAsync, pending: mutation.isPending, error: mutation.error }),
    [mutation.mutate, mutation.mutateAsync, mutation.isPending, mutation.error],
  );
}

/** Role helpers mirroring the RLS policies. */
export function usePermissions() {
  const ws = useWorkspace();
  const role = ws.member.role;
  return {
    role,
    finance: role === 'owner' || role === 'manager',
    owner: role === 'owner',
  };
}

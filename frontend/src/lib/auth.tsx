'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { api, setToken, getToken } from './api';
import type { AuthUser, ModuleAbilities } from './types';

type Ability = 'view' | 'create' | 'update' | 'delete';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  /** الاستعلام نفسه الذي يستخدمه الخادم — الواجهة تخفي، والخادم يرفض. */
  can: (module: string, ability?: Ability) => boolean;
  abilities: (module: string) => ModuleAbilities;
}

const NO_ACCESS: ModuleAbilities = { level: 0, view: false, create: false, update: false, delete: false };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const { user } = await api.get<{ user: AuthUser }>('/me');
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const { token, user } = await api.post<{ token: string; user: AuthUser }>('/login', { username, password });
    setToken(token);
    setUser(user);
    router.push(user.role === 'student' ? '/me' : '/dashboard');
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.post('/logout');
    } finally {
      setToken(null);
      setUser(null);
      router.push('/login');
    }
  }, [router]);

  const abilities = useCallback(
    (module: string): ModuleAbilities => user?.permissions?.[module] ?? NO_ACCESS,
    [user],
  );

  const can = useCallback(
    (module: string, ability: Ability = 'view') => abilities(module)[ability],
    [abilities],
  );

  const value = useMemo<AuthState>(
    () => ({ user, loading, login, logout, refresh, can, abilities }),
    [user, loading, login, logout, refresh, can, abilities],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth يجب أن يُستخدم داخل AuthProvider');
  return context;
}

/**
 * حارس القسم: يمنع رسم الشاشة أصلا لمن لا يملك الصلاحية،
 * ويعرض رسالة «غير مصرّح» الواضحة عند محاولة الوصول بالرابط المباشر.
 */
export function useModuleGuard(module: string, ability: Ability = 'view') {
  const { can, loading, user } = useAuth();
  const allowed = can(module, ability);

  return { allowed: loading || !user ? null : allowed, loading };
}

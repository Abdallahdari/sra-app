import * as SecureStore from 'expo-secure-store';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';
import { api, setAuthToken, setUnauthorizedHandler } from './api';
import type { AdminUser } from './types';

const KEY = 'sra.admin.session';

// SecureStore keeps the token in the iOS Keychain / Android Keystore.
// On web (dev preview only) fall back to sessionStorage.
const store = {
  get: async () => (Platform.OS === 'web' ? globalThis.sessionStorage?.getItem(KEY) ?? null : SecureStore.getItemAsync(KEY)),
  set: async (v: string) => (Platform.OS === 'web' ? globalThis.sessionStorage?.setItem(KEY, v) : SecureStore.setItemAsync(KEY, v)),
  del: async () => (Platform.OS === 'web' ? globalThis.sessionStorage?.removeItem(KEY) : SecureStore.deleteItemAsync(KEY)),
};

type AuthState = {
  user: AdminUser | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await store.del();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      try {
        const saved = await store.get();
        if (saved) {
          const { token, user: u } = JSON.parse(saved);
          setAuthToken(token);
          setUser(u);
          // verify in the background; a 401 signs the user out
          api<{ user: AdminUser }>('/api/auth/me')
            .then((r) => setUser(r.user))
            .catch(() => {});
        }
      } catch {
        await store.del();
      } finally {
        setReady(true);
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const r = await api<{ token: string; user: AdminUser }>('/api/auth/login', {
      method: 'POST',
      json: { email: email.trim(), password },
    });
    setAuthToken(r.token);
    setUser(r.user);
    await store.set(JSON.stringify(r));
  }, []);

  const value = useMemo(() => ({ user, ready, signIn, signOut }), [user, ready, signIn, signOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

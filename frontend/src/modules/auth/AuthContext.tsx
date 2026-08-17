import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { clearToken, setToken } from '../../lib/apiClient';
import { loginRequest, logoutRequest } from './auth.api';
import type { AuthUser } from './auth.types';

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const USER_KEY = 'kort-user';

function loadStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? (JSON.parse(raw) as AuthUser) : null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(loadStoredUser);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      login: async (email: string, password: string) => {
        const result = await loginRequest(email, password);
        setToken(result.token);
        localStorage.setItem(USER_KEY, JSON.stringify(result.user));
        setUser(result.user);
      },
      logout: async () => {
        // Best-effort: cierra la WorkSession en el backend (ver Jornadas
        // laborales), pero la sesion local se limpia igual si falla la red.
        await logoutRequest().catch(() => undefined);
        clearToken();
        localStorage.removeItem(USER_KEY);
        setUser(null);
      },
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}

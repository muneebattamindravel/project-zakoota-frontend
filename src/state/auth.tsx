import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '../utils/types';
import { loginApi, logoutApi, setAuthToken } from '../utils/api';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthed: boolean;
  bootstrapped: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'mf_auth';

type StoredAuth = {
  token: string;
  user: User;
  exp: number; // ms timestamp
};

// Tiny JWT decoder for exp
function decodeExp(token: string): number | null {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    const payloadJson = atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(payloadJson) as { exp?: number };
    if (!payload.exp) return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function readStoredAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (!parsed.token || !parsed.user || !parsed.exp) return null;
    if (parsed.exp < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, _setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [expiry, setExpiry] = useState<number | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const stored = readStoredAuth();
    if (stored) {
      _setUser(stored.user);
      setToken(stored.token);
      setExpiry(stored.exp);
      setAuthToken(stored.token);
    }
    setBootstrapped(true);
  }, []);

  useEffect(() => {
    if (!expiry || !token) return;

    const msLeft = expiry - Date.now();
    if (msLeft <= 0) {
      doLogout();
      return;
    }

    const id = window.setTimeout(() => {
      doLogout();
    }, msLeft + 1000);

    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiry, token]);

  const persistAuth = (store: StoredAuth | null) => {
    try {
      if (!store) {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
      }
    } catch {
      // ignore
    }
  };

  const doLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    _setUser(null);
    setToken(null);
    setExpiry(null);
    setAuthToken(null);
    persistAuth(null);
  };

  const login = async (username: string, password: string) => {
    const res = await loginApi(username, password);

    const authUser: User = {
      id: res.user.id,
      username: res.user.username,
      role: (res.user as any).role,
    };

    const exp = decodeExp(res.token) ?? Date.now() + 60 * 60 * 1000; // fallback 1h

    _setUser(authUser);
    setToken(res.token);
    setExpiry(exp);
    setAuthToken(res.token);

    persistAuth({
      token: res.token,
      user: authUser,
      exp,
    });
  };

  const setUser = (u: User | null) => {
    _setUser(u);
    const stored = readStoredAuth();
    if (stored) {
      persistAuth({
        ...stored,
        user: u || stored.user,
      });
    }
  };

  const isAuthed = !!user && !!token;

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      token,
      isAuthed,
      bootstrapped,
      login,
      logout: doLogout,
      setUser,
    }),
    [user, token, isAuthed, bootstrapped]
  );

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { User } from '../types';
import { loginApi, setAuthToken } from '../utils/api';

type AuthContextValue = {
  user: User | null;
  token: string | null;
  isAuthed: boolean;
  bootstrapped: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  // kept so old code calling setUser() doesn’t crash
  setUser: (u: User | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const STORAGE_KEY = 'mf_auth';

type StoredAuth = {
  token: string;
  user: User;
  exp: number; // ms timestamp
};

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

  // Restore auth from localStorage on mount
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

  // Auto-logout when expiry passes
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

  const doLogout = () => {
    _setUser(null);
    setToken(null);
    setExpiry(null);
    setAuthToken(null);
    persistAuth(null);
  };

  const login = async (username: string, password: string) => {
    const res = await loginApi(username, password);

    const authUser: User = {
      username: res.user.username,
      // simple mapping; adjust if your User type has more fields
      id: (res.user as any).id ?? res.user.username,
    };

    // match your backend JWT_EXPIRES_IN=8h (adjust if needed)
    const exp = Date.now() + 8 * 60 * 60 * 1000;

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

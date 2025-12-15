import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { loginApi, logoutApi, setAuthToken } from '../utils/api';

type User = {
  id?: string;
  username: string;
  role?: string;
};

type AuthState = {
  bootstrapped: boolean;
  isAuthed: boolean;
  user: User | null;
  token: string | null;
};

type AuthContextValue = AuthState & {
  login: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
};

const AUTH_STORAGE_KEY = 'mf_auth';

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function loadStoredAuth(): { token: string; user: User } | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    bootstrapped: false,
    isAuthed: false,
    user: null,
    token: null,
  });

  // Bootstrap from localStorage
  useEffect(() => {
    const stored = loadStoredAuth();
    if (stored?.token) {
      setAuthToken(stored.token);
      setState({
        bootstrapped: true,
        isAuthed: true,
        user: stored.user,
        token: stored.token,
      });
    } else {
      setState((prev) => ({ ...prev, bootstrapped: true }));
    }
  }, []);

  const login = useCallback<AuthContextValue['login']>(
    async (username, password) => {
      try {
        const res = await loginApi(username, password);
        if (!res?.token) {
          setState({
            bootstrapped: true,
            isAuthed: false,
            user: null,
            token: null,
          });
          return { ok: false, error: 'Invalid login response' };
        }

        const user: User = res.user ?? { username };
        const token = res.token;

        setAuthToken(token);
        try {
          localStorage.setItem(
            AUTH_STORAGE_KEY,
            JSON.stringify({ token, user })
          );
        } catch {
          // ignore storage errors
        }

        setState({
          bootstrapped: true,
          isAuthed: true,
          user,
          token,
        });

        return { ok: true };
      } catch (err: any) {
        const message =
          err?.response?.data?.error ||
          err?.message ||
          'Login failed';
        setState({
          bootstrapped: true,
          isAuthed: false,
          user: null,
          token: null,
        });
        return { ok: false, error: message };
      }
    },
    []
  );

  const logout = useCallback<AuthContextValue['logout']>(async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }

    setAuthToken(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch {
      // ignore
    }

    setState({
      bootstrapped: true,
      isAuthed: false,
      user: null,
      token: null,
    });
  }, []);

  const value: AuthContextValue = {
    ...state,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

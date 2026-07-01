import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { authApi } from '../services/endpoints';
import { tokenStore, setUnauthorizedHandler } from '../lib/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [booting, setBooting] = useState(true);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  // If any request 401s, the axios interceptor calls this.
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
  }, []);

  // On first load, if we have a token, verify it and hydrate the user.
  useEffect(() => {
    let active = true;
    const boot = async () => {
      if (!tokenStore.get()) {
        setBooting(false);
        return;
      }
      try {
        const res = await authApi.me();
        if (active) setUser(res.data);
      } catch {
        tokenStore.clear();
        if (active) setUser(null);
      } finally {
        if (active) setBooting(false);
      }
    };
    boot();
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (email, password, remember) => {
    const res = await authApi.login(email, password);
    const { token, user: u } = res.data;
    tokenStore.set(token);
    // "Remember me" just notes intent; the JWT itself carries the real expiry.
    if (remember) localStorage.setItem('prdcms_remember', '1');
    else localStorage.removeItem('prdcms_remember');
    setUser(u);
    return u;
  }, []);

  const value = {
    user,
    setUser,
    booting,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    role: user?.role || null,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

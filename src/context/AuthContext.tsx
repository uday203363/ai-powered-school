import React, { createContext, useContext, useEffect, useState } from 'react';
import type { User } from '../types';
import { authService } from '../services/auth';

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  login: (registerNo: string, password: string) => Promise<{ success: boolean; message?: string; user?: User | null }>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => authService.getCurrentUser());

  useEffect(() => {
    // keep state in sync with storage (in case of multi-tab behavior)
    const onStorage = () => {
      setUser(authService.getCurrentUser());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const login = async (registerNo: string, password: string) => {
    const res = await authService.login(registerNo, password);
    if (res.success) {
      setUser(res.user || null);
    }
    return { success: res.success, message: res.message, user: res.user };
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: authService.isAuthenticated(),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

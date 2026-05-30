import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { User } from '../types';
import { authService } from '../services';
import { getApiUrl } from '../services/apiClient';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (registerNo: string, password: string) => Promise<any>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<any>;
  refreshUserProfile: () => Promise<User | null>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUserProfile = useCallback(async (): Promise<User | null> => {
    try {
      const response = await fetch(getApiUrl('/auth/me'), {
        credentials: 'include',
      });

      if (response.ok) {
        const payload = await response.json();
        if (payload.success && payload.user) {
          let mergedUser: User | null = null;
          setUser((prev) => {
            const normalizedClassTeacherFor =
              payload.user.class_teacher_for || payload.user.class_teacher_of || '';

            const merged = {
              ...(prev || {}),
              ...payload.user,
              class_teacher_for: normalizedClassTeacherFor,
            } as User;
            mergedUser = merged;

            // Avoid unnecessary re-renders when nothing changed.
            if (
              prev &&
              prev.id === merged.id &&
              prev.class_teacher_for === merged.class_teacher_for &&
              prev.assigned_classes === merged.assigned_classes &&
              prev.class === merged.class &&
              prev.subjects === merged.subjects &&
              prev.email === merged.email &&
              prev.phone === merged.phone
            ) {
              return prev;
            }

            localStorage.setItem('auth_user', JSON.stringify(merged));
            return merged;
          });
          return mergedUser;
        }
      }
    } catch (error) {
      console.error('Error refreshing user profile:', error);
    }

    return null;
  }, []);

  useEffect(() => {
    const initializeUser = async () => {
      // Try to fetch current session from server (session cookie)
      const me = await refreshUserProfile();
      if (me) {
        setUser(me);
      }
      setLoading(false);
    };

    initializeUser();
  }, [refreshUserProfile]);

  // Ensure session is destroyed on browser/tab close where possible
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        // Best-effort: tell server to destroy session
        navigator.sendBeacon(getApiUrl('/auth/logout'));
      } catch (e) {
        // ignore
      }
      // Clear any cached user info
      localStorage.removeItem('auth_user');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Refresh user profile when teachers are updated (same-window assignments)
  useEffect(() => {
    // Listen for the teachersUpdated event (dispatched by assignment components)
    window.addEventListener('teachersUpdated', refreshUserProfile);
    return () => window.removeEventListener('teachersUpdated', refreshUserProfile);
  }, [refreshUserProfile]);

  // Keep profile synced for cross-tab/cross-session updates (admin may assign class teacher elsewhere)
  useEffect(() => {
    if (!user?.id) return;

    const onFocus = () => {
      refreshUserProfile();
    };

    const intervalId = window.setInterval(() => {
      refreshUserProfile();
    }, 15000);

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [user?.id, refreshUserProfile]);

  const login = async (registerNo: string, password: string) => {
    setLoading(true);
    const result = await authService.login(registerNo, password);
    if (result.success) {
      setUser(result.user || null);
    }
    setLoading(false);
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const changePassword = async (newPassword: string) => {
    if (!user) return { success: false };
    const result = await authService.changePassword(user.id, newPassword);
    if (result.success) {
      const updatedUser = { ...user, first_login: false };
      setUser(updatedUser);
      localStorage.setItem('auth_user', JSON.stringify(updatedUser));
    }
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        changePassword,
        refreshUserProfile,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

import { getApiUrl, getAuthHeaders } from './apiClient';
import type { User } from '../types';

const AUTH_TOKEN_KEY = 'auth_token';
const AUTH_USER_KEY = 'auth_user';

const readSessionItem = (key: string): string | null => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeSessionItem = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage errors
  }
};

const removeSessionItem = (key: string) => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage errors
  }
};

const normalizeAuthUser = (user: any): User | null => {
  if (!user) return null;

  return {
    ...user,
    class_teacher_for: user.class_teacher_for || user.class_teacher_of || undefined,
  };
};

export const authService = {
  // Login with register number and password
  async login(registerNo: string, password: string) {
    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ register_no: registerNo, password }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success) {
        return { success: false, message: payload.error || 'Login failed' };
      }

      const user = normalizeAuthUser(payload.user);

      // Persist user and token in sessionStorage (session-only)
      if (payload.token) {
        writeSessionItem(AUTH_TOKEN_KEY, payload.token);
      }
      writeSessionItem(AUTH_USER_KEY, JSON.stringify(user));

      return {
        success: true,
        user,
        firstLogin: user?.first_login === true,
      };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Login failed' };
    }
  },

  // Change password on first login
  async changePassword(_userId: string, newPassword: string) {
    try {
      const response = await fetch(getApiUrl(`/auth/change-password`), {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ newPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: payload.error || payload.message || `Status ${response.status}` };
      }

      return { success: true, message: payload.message || 'Password changed successfully' };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Password change failed' };
    }
  },

  // Change password after verifying the current password
  async changePasswordWithCurrentPassword(
    _userId: string,
    currentPassword: string,
    newPassword: string
  ) {
    try {
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        return { success: false, message: 'User not found' };
      }

      const response = await fetch(getApiUrl(`/auth/change-password`), {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: payload.error || payload.message || `Status ${response.status}` };
      }

      return { success: true, message: payload.message || 'Password changed successfully' };
    } catch (error) {
      console.error('Password change error:', error);
      return { success: false, message: 'Password change failed' };
    }
  },

  // Get current logged in user
  getCurrentUser(): User | null {
    try {
      const raw = readSessionItem(AUTH_USER_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return normalizeAuthUser(parsed);
    } catch (e) {
      return null;
    }
  },

  // Logout
  logout() {
    // Call server logout and clear local storage
    try {
      fetch(getApiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
    } catch (e) {
      // ignore
    }
    removeSessionItem(AUTH_USER_KEY);
    removeSessionItem(AUTH_TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!readSessionItem(AUTH_TOKEN_KEY);
  },

  // Create new user (Admin only)
  async createUser(
    registerNo: string,
    name: string,
    role: string,
    classOrSubject?: string,
    extras: Record<string, any> = {}
  ) {
    try {
      const response = await fetch(getApiUrl('/users'), {
        method: 'POST',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify({
          register_no: registerNo,
          name,
          role,
          class: classOrSubject || null,
          password: registerNo,
          ...extras,
        }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: payload.error || 'User creation failed' };
      }

      return { success: true, user: payload.data };
    } catch (error) {
      console.error('Create user error:', error);
      return { success: false, message: 'User creation failed' };
    }
  },

  // Get all users by role
  async getAllUsers() {
    try {
      const response = await fetch(getApiUrl('/users'), {
        headers: getAuthHeaders(false),
        credentials: 'include',
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, data: [] };
      }

      return { success: true, data: payload.data || [] };
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, data: [] };
    }
  },

  async getUsersByRole(role: string) {
    try {
      const result = await this.getAllUsers();
      if (!result.success) {
        return { success: false, data: [] };
      }

      const data = (result.data || []).filter((user: any) => user.role === role);
      return { success: true, data };
    } catch (error) {
      console.error('Get users error:', error);
      return { success: false, data: [] };
    }
  },

  // Update user
  async updateUser(userId: string, updates: Partial<User>) {
    try {
      const response = await fetch(getApiUrl(`/users/${userId}`), {
        method: 'PUT',
        headers: getAuthHeaders(true),
        credentials: 'include',
        body: JSON.stringify(updates),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, message: payload.error || 'Update failed' };
      }

      return { success: true, user: payload.data };
    } catch (error) {
      console.error('Update user error:', error);
      return { success: false, message: 'Update failed' };
    }
  },

  // Delete user
  async deleteUser(userId: string) {
    try {
      const response = await fetch(getApiUrl(`/users/${userId}`), {
        method: 'DELETE',
        headers: getAuthHeaders(false),
        credentials: 'include',
      });

      if (!response.ok) {
        return { success: false, message: 'Deletion failed' };
      }

      return { success: true };
    } catch (error) {
      console.error('Delete user error:', error);
      return { success: false, message: 'Deletion failed' };
    }
  },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const getServerOrigin = (): string => {
  try {
    return new URL(API_URL).origin;
  } catch {
    return 'http://localhost:5000';
  }
};

export const getStaticUrl = (path: string): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${getServerOrigin()}${normalizedPath}`;
};

export const getApiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_URL}${normalizedPath}`;
};

export const getAuthHeaders = (includeJson: boolean = true): HeadersInit => {
  const headers: Record<string, string> = {};

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  return headers;
};

export const apiRequest = async <T>(
  path: string,
  options: RequestInit = {}
): Promise<{ success: boolean; data?: T; error?: string; message?: string }> => {
  const response = await fetch(getApiUrl(path), {
    ...options,
    credentials: 'include',
    headers: {
      ...getAuthHeaders(true),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    return {
      success: false,
      error: payload.error || 'Request failed',
      message: payload.message,
    };
  }

  return {
    success: true,
    data: payload.data ?? payload.user ?? payload,
    message: payload.message,
  };
};
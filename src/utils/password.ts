/**
 * Password utility functions
 * WARNING: This is a simple hash for demo purposes only
 * For production, use bcrypt or similar
 */

// Simple hash function - consistent across entire app
export const simpleHash = (str: string): string => {
  if (!str) return '';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(36);
};

// Validate password format
export const isValidPassword = (password: string): { valid: boolean; error?: string } => {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  return { valid: true };
};

// Quick utility to clear session during testing
export const clearSession = () => {
  sessionStorage.removeItem('auth_user');
  sessionStorage.removeItem('auth_token');
  sessionStorage.clear();
  window.location.href = '/login';
};

// Add this to window for quick access in DevTools console
(window as any).clearSession = clearSession;

// Auto-clear session on page load (for fresh starts)
// Uncomment the line below to always start with login page
// clearSession();

console.log('💡 Tip: Run window.clearSession() in console to clear session and return to login');
console.log('💡 Or uncomment auto-clear in src/utils/debug.ts for always-fresh starts');


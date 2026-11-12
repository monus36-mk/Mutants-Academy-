export function clearClientAuthStorage() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem('mutants_logging_out', '1');
  } catch {}
  try {
    localStorage.removeItem('mutants_auth_token');
    localStorage.removeItem('mutants_user_role');
  } catch {}
}

export function performClientLogout() {
  clearClientAuthStorage();
  if (typeof window !== 'undefined') {
    window.location.replace('/api/auth/logout');
  }
}


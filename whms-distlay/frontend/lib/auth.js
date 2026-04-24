export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

export function getRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_role');
}

export function setRole(role) {
  if (typeof window === 'undefined') return;
  if (role) {
    localStorage.setItem('auth_role', role);
  } else {
    localStorage.removeItem('auth_role');
  }
}

export function getEmail() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_email');
}

export function setEmail(email) {
  if (typeof window === 'undefined') return;
  if (email) {
    localStorage.setItem('auth_email', email);
  } else {
    localStorage.removeItem('auth_email');
  }
}

export function isAuthenticated() {
  return !!getToken();
}

export function isAdmin() {
  return getRole() === 'admin';
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('auth_token');
  localStorage.removeItem('auth_role');
  localStorage.removeItem('auth_email');
}

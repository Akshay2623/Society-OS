const TOKEN_KEY = "sms_token";
const ROLE_KEY = "sms_role";

export function saveAuth(token, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function getRole() {
  return localStorage.getItem(ROLE_KEY);
}

export function getRoleHome(role = getRole()) {
  if (role === "admin") return "/admin-dashboard";
  if (role === "resident") return "/admin-dashboard";
  if (role === "security") return "/visitors";
  return "/login";
}

export function isTokenStructurallyValid(token = getToken()) {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

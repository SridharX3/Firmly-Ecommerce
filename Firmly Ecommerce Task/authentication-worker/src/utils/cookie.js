export function getCookie(request, name) {
  const cookieHeader = request?.headers?.get('Cookie');
  if (!cookieHeader) return null;

  const cookies = cookieHeader.split(';');

  for (const cookie of cookies) {
    const [key, ...rest] = cookie.trim().split('=');
    if (key === name) {
      const value = rest.join('=');
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}

export function setAuthCookie(token) {
  if (!token) {
    throw new Error('Cannot set auth cookie: token is missing');
  }

  return [
    `auth_token=${token}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Domain=.sridhar-89c.workers.dev'
  ].join('; ');
}

export function clearAuthCookie() {
  return [
    'auth_token=',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Max-Age=0'
  ].join('; ');
}

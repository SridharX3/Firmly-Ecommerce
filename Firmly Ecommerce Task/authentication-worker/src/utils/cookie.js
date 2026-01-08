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

export function setSessionCookie(sessionId) {
  if (!sessionId) {
    throw new Error('Cannot set session cookie: sessionId is missing');
  }

  return [
    `session_id=${encodeURIComponent(sessionId)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Domain=.sridhar-89c.workers.dev'
  ].join('; ');
}

export function clearSessionCookie() {
  return [
    'session_id=',
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Max-Age=0'
  ].join('; ');
}

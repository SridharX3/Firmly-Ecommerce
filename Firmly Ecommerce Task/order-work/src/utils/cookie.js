export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const parts = pair.split('=');
    if (parts.length < 2) continue;
    
    const key = parts[0].trim();
    if (key !== name) {
      continue;
    }
    
    let value = parts.slice(1).join('=').trim();

    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    try {
      return decodeURIComponent(value);
    } catch (e) {
      return value;
    }
  }

  return null;
}

export function setAuthCookie(token, domain) {
  if (!token) {
    throw new Error('Cannot set auth cookie: token is missing');
  }

  const d = domain || 'sridhar-89c.workers.dev';

  return [
    `auth_token=${token}`,
    'Path=/',
    `Domain=${d}`,
    'Secure',
    'HttpOnly'
  ].join('; ');
}

export function clearAuthCookie(domain) {
  const d = domain || 'sridhar-89c.workers.dev';
  return [
    'auth_token=',
    'Path=/',
    `Domain=${d}`,
    'Secure',
    'HttpOnly',
    'Max-Age=0'
  ].join('; ');
}

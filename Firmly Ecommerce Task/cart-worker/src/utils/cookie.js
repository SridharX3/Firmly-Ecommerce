export function getCookie(request, name) {
  const cookieHeader = request.headers.get('Cookie');
  if (!cookieHeader) return null;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    let eq_idx = pair.indexOf('=');
    if (eq_idx < 0) {
      continue;
    }

    const key = pair.substr(0, eq_idx).trim();
    if (key !== name) {
      continue;
    }
    
    let value = pair.substr(++eq_idx, pair.length).trim();

    if ('"' == value[0]) {
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

export function setAuthCookie(token) {
  if (!token) {
    throw new Error('Cannot set auth cookie: token is missing');
  }

  return [
    `auth_token=${token}`,
    'Path=/',
    'Domain=sridhar-89c.workers.dev',
    'Secure',
    'HttpOnly'
  ].join('; ');
}

export function clearAuthCookie() {
  return [
    'auth_token=',
    'Path=/',
    'Domain=sridhar-89c.workers.dev',
    'Secure',
    'HttpOnly',
    'Max-Age=0'
  ].join('; ');
}

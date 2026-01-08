export function getCookie(req, name) {
  const cookie = req.headers.get('Cookie');
  if (!cookie) return null;

  for (const part of cookie.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

/**
 * ✅ DO NOT SET Domain
 */
export function setSessionCookie(sessionId) {
  return `session_id=${sessionId};
    Path=/;
    HttpOnly;
    Secure;
    SameSite=None`;
}

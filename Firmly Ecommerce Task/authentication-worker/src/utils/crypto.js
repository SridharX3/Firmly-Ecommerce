export function generateUUID() {
  return crypto.randomUUID();
}

export async function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    data
  );

  return [...new Uint8Array(hashBuffer)]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function verifyPassword(password, hash) {
  const hashed = await hashPassword(password);
  return hashed === hash;
}
function base64UrlDecodeToBytes(str) {
  let output = str.replace(/-/g, '+').replace(/_/g, '/');
  switch (output.length % 4) {
    case 0: break;
    case 2: output += '=='; break;
    case 3: output += '='; break;
    default: throw new Error('Illegal base64url string!');
  }
  const binary = atob(output);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64UrlDecode(str) {
  return new TextDecoder().decode(base64UrlDecodeToBytes(str));
}

function arrayBufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  return arrayBufferToBase64Url(bytes.buffer);
}

export async function verifyToken(token, secret) {
  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBytes = base64UrlDecodeToBytes(parts[2]);
  const data = encoder.encode(`${parts[0]}.${parts[1]}`);

  const isValid = await crypto.subtle.verify(
    'HMAC',
    key,
    signatureBytes,
    data
  );

  if (!isValid) {
    throw new Error('Invalid signature');
  }

  const payload = JSON.parse(base64UrlDecode(parts[1]));

  if (payload.exp && Date.now() / 1000 > payload.exp) {
    throw new Error('Token expired');
  }

  return payload;
}

export async function signToken(payload, secret) {
  if (!secret) {
    throw new Error('JWT_SECRET is missing');
  }

  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    data
  );

  const encodedSignature = arrayBufferToBase64Url(signature);
  return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}
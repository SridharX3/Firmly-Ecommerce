// Helper to get a consistent AES key from the secret string
async function getEncryptionKey(secret) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  // Hash the secret to ensure it's 32 bytes (256 bits) for AES-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', keyData);
  
  return crypto.subtle.importKey(
    'raw',
    hashBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encrypt(text, secret, deterministic = false) {
  if (!text) return text;
  
  const key = await getEncryptionKey(secret);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  let iv;
  if (deterministic) {
    // For deterministic encryption (e.g. for email lookup), derive IV from data + secret
    // We use HMAC-SHA256 to generate a consistent IV
    const secretKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign('HMAC', secretKey, data);
    iv = new Uint8Array(signature).slice(0, 12); // AES-GCM needs 12-byte IV
  } else {
    // For standard encryption, use random IV
    iv = crypto.getRandomValues(new Uint8Array(12));
  }

  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Return as iv:ciphertext in hex
  const ivHex = [...iv].map(b => b.toString(16).padStart(2, '0')).join('');
  const cipherHex = [...new Uint8Array(encryptedBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${ivHex}:${cipherHex}`;
}

export async function decrypt(encryptedText, secret) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;

  const [ivHex, cipherHex] = encryptedText.split(':');
  const key = await getEncryptionKey(secret);

  const iv = new Uint8Array(ivHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const cipherData = new Uint8Array(cipherHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

  try {
    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      cipherData
    );
    return new TextDecoder().decode(decryptedBuffer);
  } catch (e) {
    throw new Error('Decryption failed');
  }
}

export async function hashPassword(password) {
  if (typeof password !== 'string') {
    throw new Error('Password must be a string');
  }

  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  const saltHex = [...salt].map(b => b.toString(16).padStart(2, '0')).join('');
  const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${saltHex}:${hashHex}`;
}

export async function verifyPassword(password, hash) {
  const [saltHex, originalHash] = hash.split(':');
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const hashBuffer = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );

  const hashHex = [...new Uint8Array(hashBuffer)].map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex === originalHash;
}
import Joi from 'joi';
import { withSpan } from '../observability/otel.js';
import { hashPassword, verifyPassword, encrypt, decrypt } from '../utils/crypto.js';

/* ---------- Joi Schemas ---------- */

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match' }),
  phone_number: Joi.string().allow(null, '').optional(),
  username: Joi.string().allow(null, '').optional(),
  shipping_address: Joi.alternatives().try(Joi.object(), Joi.string()).allow(null, '').optional(),
  billing_address: Joi.alternatives().try(Joi.object(), Joi.string()).allow(null, '').optional()
});

const loginSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().required()
});

/* ===========================
   REGISTER USER
=========================== */
export async function register(db, payload, ctx, authKey, adminSecret) {
  return withSpan(ctx, 'auth.register', {}, async (span) => {
    try {
      const { error, value } = registerSchema.validate(payload || {}, {
        abortEarly: false
      });

      if (error) {
        const errorMessage = error.details.map(d => d.message).join(', ');
        span.setAttribute('auth.error', 'validation_failed');
        span.setAttribute('auth.validation_error', errorMessage);
        throw new Error(errorMessage);
      }

      const {email, password, phone_number = null, username = null, shipping_address = null, billing_address = null } = value;
      const role = authKey === adminSecret ? 'admin' : 'user';

      // Encrypt email deterministically to allow checking for existence
      const encryptedEmail = await withSpan(ctx, 'crypto.encrypt_email', {}, () => 
        encrypt(email, adminSecret, true)
      );

      const existingUser = await withSpan(
        ctx,
        'db.select.user_by_email',
        { 'auth.email': email },
        () =>
          db
            .prepare('SELECT id FROM users WHERE email = ?') // Query by encrypted email
            .bind(encryptedEmail)
            .first()
      );

      if (existingUser) {
        throw new Error('Email already registered');
      }

      const passwordHash = await withSpan(
        ctx,
        'crypto.hash_password',
        {},
        () => hashPassword(password)
      );

      // Encrypt other PII (random IV is fine/better for these as we don't query by them)
      const encryptedPhone = await withSpan(ctx, 'crypto.encrypt_pii', {}, () => 
        encrypt(phone_number, adminSecret, false)
      );
      
      const encryptedUsername = await withSpan(ctx, 'crypto.encrypt_pii', {}, () => 
        encrypt(username, adminSecret, false)
      );

      const encryptedShipping = await withSpan(ctx, 'crypto.encrypt_pii', {}, () => 
        encrypt(
          typeof shipping_address === 'object' && shipping_address !== null ? JSON.stringify(shipping_address) : shipping_address,
          adminSecret, false
        )
      );

      const encryptedBilling = await withSpan(ctx, 'crypto.encrypt_pii', {}, () => 
        encrypt(
          typeof billing_address === 'object' && billing_address !== null ? JSON.stringify(billing_address) : billing_address,
          adminSecret, false
        )
      );

      const result = await withSpan(
        ctx,
        'db.insert.user',
        {},
        () =>
          db
            .prepare(`
              INSERT INTO users (email, phone_number, username, password, role, shipping_address, billing_address)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `)
            .bind(encryptedEmail, encryptedPhone, encryptedUsername, passwordHash, role, encryptedShipping, encryptedBilling)
            .run()
      );

      span.setAttribute('auth.email', email);
      span.setAttribute('auth.result', 'success');

      return {
        id: result.meta.last_row_id,
        email,
        phone_number,
        username, 
        role,
        shipping_address,
        billing_address
      };
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'error');
      throw err;
    }
  });
}

/* ===========================
   ADDRESS MANAGEMENT
=========================== */
export async function getShippingAddress(db, userId, ctx, adminSecret) {
  return withSpan(ctx, 'auth.get_shipping_address', {}, async () => {
    const user = await db
      .prepare('SELECT shipping_address FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) throw new Error('User not found');
    
    const decrypted = user.shipping_address ? await decrypt(user.shipping_address, adminSecret) : null;
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  });
}

export async function updateShippingAddress(db, userId, address, ctx, adminSecret) {
  return withSpan(ctx, 'auth.update_shipping_address', {}, async () => {
    const addressStr = typeof address === 'object' && address !== null ? JSON.stringify(address) : address;
    const encrypted = await withSpan(ctx, 'crypto.encrypt_address', {}, () => 
      encrypt(addressStr, adminSecret, false)
    );

    await db
      .prepare('UPDATE users SET shipping_address = ? WHERE id = ?')
      .bind(encrypted, userId)
      .run();

    return address;
  });
}

export async function getBillingAddress(db, userId, ctx, adminSecret) {
  return withSpan(ctx, 'auth.get_billing_address', {}, async () => {
    const user = await db
      .prepare('SELECT billing_address FROM users WHERE id = ?')
      .bind(userId)
      .first();

    if (!user) throw new Error('User not found');

    const decrypted = user.billing_address ? await decrypt(user.billing_address, adminSecret) : null;
    try {
      return JSON.parse(decrypted);
    } catch {
      return decrypted;
    }
  });
}

export async function updateBillingAddress(db, userId, address, ctx, adminSecret) {
  return withSpan(ctx, 'auth.update_billing_address', {}, async () => {
    const addressStr = typeof address === 'object' && address !== null ? JSON.stringify(address) : address;
    const encrypted = await encrypt(addressStr, adminSecret, false);
    await db.prepare('UPDATE users SET billing_address = ? WHERE id = ?').bind(encrypted, userId).run();
    return address;
  });
}

/* ===========================
   LOGIN USER
=========================== */
export async function login(db, payload, ctx, adminSecret) {
  return withSpan(ctx, 'auth.login', {}, async (span) => {
    try {
      const { error, value } = loginSchema.validate(payload || {}, {
        abortEarly: false
      });

      const { email, password } = value;

      // Encrypt email deterministically to find the user
      const encryptedEmail = await withSpan(ctx, 'crypto.encrypt_email_lookup', {}, () => 
        encrypt(email, adminSecret, true)
      );

      const user = await withSpan(
        ctx,
        'db.select.user_for_login',
        { 'auth.email': email },
        () =>
          db
            .prepare(
              'SELECT id, email, password, role FROM users WHERE email = ?'
            )
            .bind(encryptedEmail)
            .first()
      );

      if (!user) {
        throw new Error('No account found with this email');
      }

      const valid = await withSpan(
        ctx,
        'crypto.verify_password',
        {},
        () => verifyPassword(password, user.password)
      );

      if (!valid) {
        throw new Error('Incorrect password');
      }

      span.setAttribute('auth.email', email);
      span.setAttribute('auth.result', 'success');

      // We return the original email (decrypted/input) to the client
      return {
        id: user.id,
        email: email, 
        role: user.role
      };
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'error');
      throw err;
    }
  });
}

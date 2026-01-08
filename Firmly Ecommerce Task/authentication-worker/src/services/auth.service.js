import Joi from 'joi';
import { withSpan } from '../observability/otel.js';
import { hashPassword, verifyPassword } from '../utils/crypto.js';

/* ---------- Joi Schemas ---------- */

const registerSchema = Joi.object({
  email: Joi.string().email({ tlds: { allow: false } }).required(),
  password: Joi.string().min(6).required(),
  confirm_password: Joi.string().valid(Joi.ref('password')).required().messages({ 'any.only': 'Passwords do not match' }),
  phone_number: Joi.string().allow(null, '').optional(),
  username: Joi.string().allow(null, '').optional()
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

      const {email, password, phone_number = null, username = null } = value;
      const role = authKey === adminSecret ? 'admin' : 'user';

      const existingUser = await withSpan(
        ctx,
        'db.select.user_by_email',
        { 'auth.email': email },
        () =>
          db
            .prepare('SELECT id FROM users WHERE email = ?')
            .bind(email)
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

      const result = await withSpan(
        ctx,
        'db.insert.user',
        {},
        () =>
          db
            .prepare(`
              INSERT INTO users (email, phone_number, username, password, role)
              VALUES (?, ?, ?, ?, ?)
            `)
            .bind(email, phone_number, username, passwordHash, role)
            .run()
      );

      span.setAttribute('auth.email', email);
      span.setAttribute('auth.result', 'success');

      return {
        id: result.meta.last_row_id,
        email,
        phone_number,
        username
      };
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'error');
      throw err;
    }
  });
}

/* ===========================
   LOGIN USER
=========================== */
export async function login(db, payload, ctx) {
  return withSpan(ctx, 'auth.login', {}, async (span) => {
    try {
      const { error, value } = loginSchema.validate(payload || {}, {
        abortEarly: false
      });

      if (error) {
        const errorMessage = error.details.map(d => d.message).join(', ');
        span.setAttribute('auth.error', 'validation_failed');
        span.setAttribute('auth.validation_error', errorMessage);
        throw new Error(errorMessage);
      }

      const { email, password } = value;

      const user = await withSpan(
        ctx,
        'db.select.user_for_login',
        { 'auth.email': email },
        () =>
          db
            .prepare(
              'SELECT id, email, password, role FROM users WHERE email = ?'
            )
            .bind(email)
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

      return {
        id: user.id,
        email: user.email
      };
    } catch (err) {
      span.recordException(err);
      span.setAttribute('auth.result', 'error');
      throw err;
    }
  });
}

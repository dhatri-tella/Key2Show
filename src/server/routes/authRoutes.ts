import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import {
  hashPassword,
  verifyPassword,
  signAuthToken,
  requireAuth,
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  type AuthenticatedRequest,
} from '../security.ts';
import { isValidMobile, normalizeIndianMobile } from '../../utils/bookingLogic.ts';
import { adminAuth } from '../../lib/firebase-admin.ts';
import { getOrCreateUser } from '../../db/users.ts';

export const authRoutes = Router();

function getSafeUserRecord(userId: string) {
  const user = db
    .prepare('SELECT id, name, email, mobile, role, is_verified, created_at FROM users WHERE id = ?')
    .get(userId) as Record<string, unknown> | undefined;
  if (!user) return null;

  const profile = db
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .get(userId) as Record<string, unknown> | undefined;

  const links = db
    .prepare('SELECT id, companion_name, companion_mobile, relation, status FROM companion_links WHERE owner_user_id = ?')
    .all(userId);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    role: user.role,
    isVerified: Boolean(user.is_verified),
    avatarUrl: profile?.avatar_url ?? '',
    preferredCity: profile?.preferred_city ?? 'Hyderabad',
    savedLocations: JSON.parse(String(profile?.saved_locations_json ?? '["Hyderabad"]')),
    savedPaymentMethods: JSON.parse(String(profile?.saved_payment_methods_json ?? '[]')),
    wishlist: JSON.parse(String(profile?.wishlist_json ?? '[]')),
    companionLinks: links,
  };
}

// Send OTP (Login / Signup / Reset)
authRoutes.post('/otp/send', (req, res) => {
  const { target, purpose } = req.body ?? {};
  const cleanTarget = String(target ?? '').trim();
  if (!cleanTarget) {
    res.status(400).json({ error: 'Mobile number or email is required.' });
    return;
  }

  const normalized = isValidMobile(cleanTarget)
    ? normalizeIndianMobile(cleanTarget)
    : cleanTarget.toLowerCase();

  const code = generateOtpCode();
  const id = `otp-${crypto.randomUUID().slice(0, 8)}`;
  const expiresAt = Date.now() + 1000 * 60 * 5;

  db.prepare(
    'INSERT INTO otp_codes (id, target, purpose, code_hash, expires_at, consumed) VALUES (?, ?, ?, ?, ?, 0)'
  ).run(id, normalized, String(purpose ?? 'LOGIN').toUpperCase(), hashOtp(code), expiresAt);

  res.json({
    sent: true,
    target: normalized,
    // Provided solely for sandbox preview verification where real SMS/email provider is unconfigured
    sandboxOtp: process.env.NODE_ENV === 'production' ? undefined : code,
  });
});

// Signup with OTP verification
authRoutes.post('/signup', (req, res) => {
  const { name, mobile, email, password, confirmPassword, otpCode, acceptedTerms } = req.body ?? {};
  if (!name || !mobile || !email || !password) {
    res.status(400).json({ error: 'All fields are required.' });
    return;
  }
  if (!acceptedTerms) {
    res.status(400).json({ error: 'Please accept the Terms & Conditions.' });
    return;
  }
  if (password !== confirmPassword) {
    res.status(400).json({ error: 'Passwords do not match.' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }
  if (!isValidMobile(String(mobile))) {
    res.status(400).json({ error: 'Enter a valid 10-digit Indian mobile number.' });
    return;
  }

  const normalizedMobile = normalizeIndianMobile(String(mobile));
  const cleanEmail = String(email).trim().toLowerCase();

  const existing = db
    .prepare('SELECT id FROM users WHERE email = ? OR mobile = ?')
    .get(cleanEmail, normalizedMobile);
  if (existing) {
    res.status(409).json({ error: 'An account with this email or mobile already exists.' });
    return;
  }

  const otpRow = db
    .prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? AND consumed = 0 ORDER BY expires_at DESC LIMIT 1')
    .get(normalizedMobile, 'SIGNUP') as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!otpRow || otpRow.expires_at < Date.now() || !verifyOtpHash(String(otpCode ?? ''), otpRow.code_hash)) {
    res.status(400).json({ error: 'Invalid or expired OTP code.' });
    return;
  }

  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRow.id);

  const userId = `user-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
    VALUES (?, ?, ?, ?, ?, 'USER', 1, ?)
  `).run(userId, String(name).trim(), cleanEmail, normalizedMobile, hashPassword(String(password)), now);

  db.prepare(`
    INSERT INTO user_profiles (user_id, avatar_url, preferred_city, saved_locations_json, saved_payment_methods_json, wishlist_json, updated_at)
    VALUES (?, '', 'Hyderabad', '["Hyderabad"]', '["UPI (PhonePe / GPay)"]', '[]', ?)
  `).run(userId, now);

  // Link any pending companion invitations sent to this mobile number automatically!
  db.prepare(`
    UPDATE booking_participants
    SET user_id = ?, verification_status = 'VERIFIED', verified_at = ?
    WHERE mobile = ? AND user_id IS NULL
  `).run(userId, now, normalizedMobile);

  db.prepare(`
    UPDATE companion_access
    SET companion_user_id = ?, verification_status = 'VERIFIED', access_status = 'VERIFIED', verified_at = ?
    WHERE companion_mobile = ? AND companion_user_id IS NULL
  `).run(userId, now, normalizedMobile);

  const token = signAuthToken(userId, 'USER');
  res.status(201).json({ token, user: getSafeUserRecord(userId) });
});

// Login with Email + Password OR Mobile + OTP
authRoutes.post('/login', (req, res) => {
  const { mode, email, password, mobile, otpCode } = req.body ?? {};

  if (mode === 'otp') {
    if (!isValidMobile(String(mobile ?? ''))) {
      res.status(400).json({ error: 'Enter a valid 10-digit mobile number.' });
      return;
    }
    const normalizedMobile = normalizeIndianMobile(String(mobile));
    const otpRow = db
      .prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? AND consumed = 0 ORDER BY expires_at DESC LIMIT 1')
      .get(normalizedMobile, 'LOGIN') as { id: string; code_hash: string; expires_at: number } | undefined;

    if (!otpRow || otpRow.expires_at < Date.now() || !verifyOtpHash(String(otpCode ?? ''), otpRow.code_hash)) {
      res.status(401).json({ error: 'Invalid or expired OTP.' });
      return;
    }
    db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRow.id);

    let user = db.prepare('SELECT id, role FROM users WHERE mobile = ?').get(normalizedMobile) as
      | { id: string; role: 'USER' | 'ADMIN' }
      | undefined;

    // Auto-create verified member account if phone verified via OTP (for frictionless companion login!)
    if (!user) {
      const userId = `user-${crypto.randomUUID().slice(0, 8)}`;
      const now = new Date().toISOString();
      const digits = normalizedMobile.replace(/\D/g, '').slice(-4);
      db.prepare(`
        INSERT INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, 'USER', 1, ?)
      `).run(
        userId,
        `Member ${digits}`,
        `member.${digits}@key2show.local`,
        normalizedMobile,
        hashPassword(crypto.randomBytes(16).toString('hex')),
        now
      );
      db.prepare(`
        INSERT INTO user_profiles (user_id, avatar_url, preferred_city, saved_locations_json, saved_payment_methods_json, wishlist_json, updated_at)
        VALUES (?, '', 'Hyderabad', '["Hyderabad"]', '["UPI"]', '[]', ?)
      `).run(userId, now);
      db.prepare(`
        UPDATE booking_participants
        SET user_id = ?, verification_status = 'VERIFIED', verified_at = ?
        WHERE mobile = ?
      `).run(userId, now, normalizedMobile);
      db.prepare(`
        UPDATE companion_access
        SET companion_user_id = ?, verification_status = 'VERIFIED', access_status = 'VERIFIED', verified_at = ?
        WHERE companion_mobile = ?
      `).run(userId, now, normalizedMobile);
      user = { id: userId, role: 'USER' };
    }

    const token = signAuthToken(user.id, user.role);
    res.json({ token, user: getSafeUserRecord(user.id) });
    return;
  }

  // Email + Password login
  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const userRow = db
    .prepare('SELECT id, password_hash, role FROM users WHERE email = ?')
    .get(cleanEmail) as { id: string; password_hash: string; role: 'USER' | 'ADMIN' } | undefined;

  if (!userRow || !verifyPassword(String(password ?? ''), userRow.password_hash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  const token = signAuthToken(userRow.id, userRow.role);
  res.json({ token, user: getSafeUserRecord(userRow.id) });
});

// Quick Demo Family Switcher (strictly limited to seeded non-admin .demo family accounts)
authRoutes.post('/demo-switch', (req, res) => {
  const { userId } = req.body ?? {};
  const user = db
    .prepare("SELECT id, role, email FROM users WHERE id = ? AND role = 'USER' AND email LIKE '%@key2show.demo'")
    .get(String(userId ?? '')) as { id: string; role: 'USER' } | undefined;

  if (!user) {
    res.status(404).json({ error: 'Demo family account not found.' });
    return;
  }
  const token = signAuthToken(user.id, 'USER');
  res.json({ token, user: getSafeUserRecord(user.id) });
});

// Exchange Firebase Google Sign-In ID Token for Key2Show Session + Cloud SQL sync
authRoutes.post('/firebase-exchange', async (req, res) => {
  const { idToken } = req.body ?? {};
  if (!idToken || typeof idToken !== 'string') {
    res.status(400).json({ error: 'Firebase idToken is required.' });
    return;
  }

  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    const email = (decoded.email || `${decoded.uid}@firebase.key2show.local`).toLowerCase();
    const displayName = (typeof decoded.name === 'string' && decoded.name.trim()) || email.split('@')[0];

    try {
      await getOrCreateUser(decoded.uid, email, displayName);
    } catch (cloudErr) {
      console.error('Non-fatal Cloud SQL user sync error:', cloudErr);
    }

    let localUser = db
      .prepare('SELECT id, role FROM users WHERE email = ?')
      .get(email) as { id: string; role: 'USER' | 'ADMIN' } | undefined;

    if (!localUser) {
      const userId = `user-${decoded.uid.slice(0, 12)}`;
      const now = new Date().toISOString();
      const synthMobile = `+91 90${String(crypto.randomInt(100, 999))} ${String(crypto.randomInt(10000, 99999))}`;
      db.prepare(`
        INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
        VALUES (?, ?, ?, ?, ?, 'USER', 1, ?)
      `).run(userId, displayName, email, synthMobile, hashPassword(crypto.randomBytes(16).toString('hex')), now);
      db.prepare(`
        INSERT OR IGNORE INTO user_profiles (user_id, avatar_url, preferred_city, saved_locations_json, saved_payment_methods_json, wishlist_json, updated_at)
        VALUES (?, ?, 'Hyderabad', '["Hyderabad","Bengaluru"]', '["UPI (PhonePe / GPay)"]', '[]', ?)
      `).run(userId, typeof decoded.picture === 'string' ? decoded.picture : '', now);
      localUser = { id: userId, role: 'USER' };
    }

    const token = signAuthToken(localUser.id, localUser.role);
    res.json({ token, user: getSafeUserRecord(localUser.id) });
  } catch (err) {
    res.status(401).json({ error: err instanceof Error ? err.message : 'Invalid Google sign-in token.' });
  }
});

// Forgot password reset with OTP
authRoutes.post('/reset-password', (req, res) => {
  const { target, otpCode, newPassword } = req.body ?? {};
  const cleanTarget = isValidMobile(String(target ?? ''))
    ? normalizeIndianMobile(String(target))
    : String(target ?? '').trim().toLowerCase();

  if (!newPassword || String(newPassword).length < 6) {
    res.status(400).json({ error: 'New password must be at least 6 characters.' });
    return;
  }

  const otpRow = db
    .prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? AND consumed = 0 ORDER BY expires_at DESC LIMIT 1')
    .get(cleanTarget, 'RESET') as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!otpRow || otpRow.expires_at < Date.now() || !verifyOtpHash(String(otpCode ?? ''), otpRow.code_hash)) {
    res.status(400).json({ error: 'Invalid or expired reset OTP.' });
    return;
  }

  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRow.id);
  const updated = db
    .prepare('UPDATE users SET password_hash = ? WHERE email = ? OR mobile = ?')
    .run(hashPassword(String(newPassword)), cleanTarget, cleanTarget);

  if (updated.changes === 0) {
    res.status(404).json({ error: 'No account found for that email or mobile.' });
    return;
  }
  res.json({ reset: true });
});

// Current User Profile & Preferences
authRoutes.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const user = getSafeUserRecord(req.auth!.userId);
  if (!user) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }
  res.json({ user });
});

authRoutes.put('/profile', requireAuth, (req: AuthenticatedRequest, res) => {
  const { name, preferredCity, savedLocations, savedPaymentMethods, wishlist } = req.body ?? {};
  const now = new Date().toISOString();
  if (name && String(name).trim()) {
    db.prepare('UPDATE users SET name = ? WHERE id = ?').run(String(name).trim(), req.auth!.userId);
  }
  const current = db
    .prepare('SELECT * FROM user_profiles WHERE user_id = ?')
    .get(req.auth!.userId) as Record<string, unknown> | undefined;

  db.prepare(`
    UPDATE user_profiles
    SET preferred_city = ?, saved_locations_json = ?, saved_payment_methods_json = ?, wishlist_json = ?, updated_at = ?
    WHERE user_id = ?
  `).run(
    preferredCity ?? current?.preferred_city ?? 'Hyderabad',
    savedLocations ? JSON.stringify(savedLocations) : String(current?.saved_locations_json ?? '["Hyderabad"]'),
    savedPaymentMethods ? JSON.stringify(savedPaymentMethods) : String(current?.saved_payment_methods_json ?? '[]'),
    wishlist ? JSON.stringify(wishlist) : String(current?.wishlist_json ?? '[]'),
    now,
    req.auth!.userId
  );

  res.json({ user: getSafeUserRecord(req.auth!.userId) });
});

// Notifications
authRoutes.get('/notifications', requireAuth, (req: AuthenticatedRequest, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.auth!.userId);
  res.json({ notifications: rows });
});

authRoutes.post('/notifications/read-all', requireAuth, (req: AuthenticatedRequest, res) => {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ?').run(req.auth!.userId);
  res.json({ ok: true });
});

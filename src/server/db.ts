import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'key2show.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

function hasColumn(table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[];
  return rows.some((r) => r.name === column);
}

export function initializeSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      mobile TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'USER',
      is_verified INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS user_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      avatar_url TEXT,
      preferred_city TEXT NOT NULL DEFAULT 'Hyderabad',
      saved_locations_json TEXT NOT NULL DEFAULT '["Hyderabad","Bengaluru"]',
      saved_payment_methods_json TEXT NOT NULL DEFAULT '["UPI (PhonePe / GPay)","HDFC RuPay Credit •••• 4821"]',
      wishlist_json TEXT NOT NULL DEFAULT '[]',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS otp_codes (
      id TEXT PRIMARY KEY,
      target TEXT NOT NULL,
      purpose TEXT NOT NULL,
      code_hash TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      consumed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      external_id TEXT,
      source_mode TEXT NOT NULL DEFAULT 'DEMO',
      title TEXT NOT NULL,
      subtitle TEXT,
      poster TEXT NOT NULL,
      banner TEXT NOT NULL,
      trailer_url TEXT,
      genre_json TEXT NOT NULL,
      language TEXT NOT NULL,
      duration TEXT NOT NULL,
      rating REAL NOT NULL DEFAULT 8.5,
      votes TEXT NOT NULL DEFAULT '100K',
      certification TEXT NOT NULL DEFAULT 'UA',
      formats_json TEXT NOT NULL,
      release_date TEXT NOT NULL,
      end_date TEXT,
      release_year INTEGER NOT NULL,
      base_price INTEGER NOT NULL DEFAULT 250,
      featured INTEGER NOT NULL DEFAULT 1,
      published INTEGER NOT NULL DEFAULT 1,
      synopsis TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT,
      last_synced_at TEXT
    );

    CREATE TABLE IF NOT EXISTS movie_cast (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      actor_name TEXT NOT NULL,
      role_name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS movie_crew (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      member_name TEXT NOT NULL,
      department TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS theatres (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      location TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'Multiplex',
      rating REAL NOT NULL DEFAULT 4.5,
      image TEXT NOT NULL,
      screens_count INTEGER NOT NULL DEFAULT 6,
      formats_json TEXT NOT NULL,
      amenities_json TEXT NOT NULL,
      food_available INTEGER NOT NULL DEFAULT 1,
      lat REAL NOT NULL DEFAULT 17.4239,
      lng REAL NOT NULL DEFAULT 78.4738,
      featured INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS screens (
      id TEXT PRIMARY KEY,
      theatre_id TEXT NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      rows_count INTEGER NOT NULL DEFAULT 6,
      cols_count INTEGER NOT NULL DEFAULT 10,
      sound_system TEXT NOT NULL DEFAULT 'Dolby Atmos',
      projection TEXT NOT NULL DEFAULT '4K Laser'
    );

    CREATE TABLE IF NOT EXISTS seats (
      id TEXT PRIMARY KEY,
      screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
      row_label TEXT NOT NULL,
      seat_number INTEGER NOT NULL,
      seat_code TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'STANDARD',
      price_delta INTEGER NOT NULL DEFAULT 0,
      is_blocked INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS shows (
      id TEXT PRIMARY KEY,
      movie_id TEXT NOT NULL REFERENCES movies(id) ON DELETE CASCADE,
      theatre_id TEXT NOT NULL REFERENCES theatres(id) ON DELETE CASCADE,
      screen_id TEXT NOT NULL REFERENCES screens(id) ON DELETE CASCADE,
      show_date TEXT NOT NULL,
      show_time TEXT NOT NULL,
      time_slot TEXT NOT NULL,
      format TEXT NOT NULL,
      base_price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE'
    );

    CREATE TABLE IF NOT EXISTS show_seats (
      id TEXT PRIMARY KEY,
      show_id TEXT NOT NULL REFERENCES shows(id) ON DELETE CASCADE,
      seat_code TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'AVAILABLE',
      locked_by_user_id TEXT,
      lock_expires_at INTEGER,
      booking_id TEXT,
      UNIQUE(show_id, seat_code)
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      booking_code TEXT UNIQUE NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      kind TEXT NOT NULL DEFAULT 'MOVIE',
      show_id TEXT REFERENCES shows(id),
      event_id TEXT,
      movie_title TEXT NOT NULL,
      theatre_name TEXT NOT NULL,
      screen_name TEXT NOT NULL,
      show_date TEXT NOT NULL,
      show_time TEXT NOT NULL,
      format TEXT NOT NULL,
      seats_subtotal INTEGER NOT NULL,
      food_subtotal INTEGER NOT NULL DEFAULT 0,
      convenience_fee INTEGER NOT NULL DEFAULT 0,
      taxes INTEGER NOT NULL DEFAULT 0,
      discount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL,
      coupon_code TEXT,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      payment_status TEXT NOT NULL DEFAULT 'PAID',
      qr_token TEXT,
      qr_status TEXT NOT NULL DEFAULT 'ACTIVE',
      email_status TEXT NOT NULL DEFAULT 'PENDING',
      scanned_at TEXT,
      scanned_by_admin_id TEXT,
      is_family_booking INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS booking_items (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      label TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS booking_participants (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id),
      name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'Self',
      seat_code TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'COMPANION',
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      invited_at TEXT NOT NULL,
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS companion_access (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      companion_user_id TEXT REFERENCES users(id),
      companion_name TEXT NOT NULL,
      companion_mobile TEXT NOT NULL,
      relation TEXT NOT NULL DEFAULT 'Companion',
      verification_status TEXT NOT NULL DEFAULT 'PENDING',
      access_status TEXT NOT NULL DEFAULT 'PENDING',
      invited_at TEXT NOT NULL,
      verified_at TEXT
    );

    CREATE TABLE IF NOT EXISTS companion_links (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      companion_name TEXT NOT NULL,
      companion_mobile TEXT NOT NULL,
      companion_user_id TEXT REFERENCES users(id),
      relation TEXT NOT NULL DEFAULT 'Friend',
      status TEXT NOT NULL DEFAULT 'VERIFIED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      participant_id TEXT NOT NULL REFERENCES booking_participants(id) ON DELETE CASCADE,
      holder_user_id TEXT REFERENCES users(id),
      holder_name TEXT NOT NULL,
      holder_mobile TEXT NOT NULL,
      seat_code TEXT NOT NULL,
      qr_token TEXT UNIQUE NOT NULL,
      qr_status TEXT NOT NULL DEFAULT 'ACTIVE',
      email_status TEXT NOT NULL DEFAULT 'PENDING',
      scanned_at TEXT,
      scanned_by_admin_id TEXT
    );

    CREATE TABLE IF NOT EXISTS food_items (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL,
      is_combo INTEGER NOT NULL DEFAULT 0,
      is_veg INTEGER NOT NULL DEFAULT 1,
      available INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS food_orders (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      subtotal INTEGER NOT NULL,
      taxes INTEGER NOT NULL,
      discount INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'CONFIRMED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS food_order_items (
      id TEXT PRIMARY KEY,
      food_order_id TEXT NOT NULL REFERENCES food_orders(id) ON DELETE CASCADE,
      food_item_id TEXT NOT NULL REFERENCES food_items(id),
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      unit_price INTEGER NOT NULL,
      total_price INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id),
      method TEXT NOT NULL,
      masked_reference TEXT NOT NULL,
      amount INTEGER NOT NULL,
      status TEXT NOT NULL,
      transaction_ref TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value INTEGER NOT NULL,
      min_amount INTEGER NOT NULL DEFAULT 0,
      max_discount INTEGER NOT NULL DEFAULT 0,
      expiry_date TEXT NOT NULL,
      applicable_movie_id TEXT,
      applicable_theatre_id TEXT,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS offers (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      code TEXT NOT NULL,
      description TEXT NOT NULL,
      badge TEXT NOT NULL,
      valid_till TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      venue TEXT NOT NULL,
      city TEXT NOT NULL,
      event_date TEXT NOT NULL,
      event_time TEXT NOT NULL,
      price INTEGER NOT NULL,
      image TEXT NOT NULL,
      badge TEXT NOT NULL,
      description TEXT NOT NULL,
      published INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS event_tickets (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      tier_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      total_qty INTEGER NOT NULL,
      sold_qty INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id),
      user_name TEXT NOT NULL,
      rating REAL NOT NULL,
      comment TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS refunds (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      original_amount INTEGER NOT NULL,
      cancellation_fee INTEGER NOT NULL,
      refund_amount INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PROCESSED',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      details_json TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS platform_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_sessions (
      id TEXT PRIMARY KEY,
      idempotency_key TEXT UNIQUE,
      user_id TEXT NOT NULL REFERENCES users(id),
      draft_json TEXT NOT NULL,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'CREATED',
      booking_id TEXT REFERENCES bookings(id),
      expires_at INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Idempotent column migrations for existing databases on disk
  const movieMigrations: [string, string][] = [
    ['external_id', 'ALTER TABLE movies ADD COLUMN external_id TEXT'],
    ['source_mode', "ALTER TABLE movies ADD COLUMN source_mode TEXT NOT NULL DEFAULT 'DEMO'"],
    ['end_date', 'ALTER TABLE movies ADD COLUMN end_date TEXT'],
    ['updated_at', 'ALTER TABLE movies ADD COLUMN updated_at TEXT'],
    ['last_synced_at', 'ALTER TABLE movies ADD COLUMN last_synced_at TEXT'],
  ];
  for (const [col, sql] of movieMigrations) {
    if (!hasColumn('movies', col)) db.exec(sql);
  }

  const bookingMigrations: [string, string][] = [
    ['payment_status', "ALTER TABLE bookings ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'PAID'"],
    ['qr_token', 'ALTER TABLE bookings ADD COLUMN qr_token TEXT'],
    ['qr_status', "ALTER TABLE bookings ADD COLUMN qr_status TEXT NOT NULL DEFAULT 'ACTIVE'"],
    ['email_status', "ALTER TABLE bookings ADD COLUMN email_status TEXT NOT NULL DEFAULT 'PENDING'"],
    ['scanned_at', 'ALTER TABLE bookings ADD COLUMN scanned_at TEXT'],
    ['scanned_by_admin_id', 'ALTER TABLE bookings ADD COLUMN scanned_by_admin_id TEXT'],
  ];
  for (const [col, sql] of bookingMigrations) {
    if (!hasColumn('bookings', col)) db.exec(sql);
  }

  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_qr_token ON bookings(qr_token) WHERE qr_token IS NOT NULL;');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_transaction_ref ON payments(transaction_ref) WHERE transaction_ref IS NOT NULL;');
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_sessions_booking_id ON payment_sessions(booking_id) WHERE booking_id IS NOT NULL;');

  // Backfill ONE qr_token per booking for any legacy rows & keep companion_access in sync
  const legacyBookings = db
    .prepare("SELECT id, status, qr_token FROM bookings WHERE qr_token IS NULL OR qr_token = ''")
    .all() as { id: string; status: string; qr_token: string | null }[];

  for (const b of legacyBookings) {
    const firstTicket = db
      .prepare('SELECT qr_token, qr_status, scanned_at, scanned_by_admin_id FROM tickets WHERE booking_id = ? LIMIT 1')
      .get(b.id) as
      | { qr_token: string; qr_status: string; scanned_at: string | null; scanned_by_admin_id: string | null }
      | undefined;

    const qrToken = firstTicket?.qr_token || `K2SQ-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const qrStatus = b.status === 'CANCELLED' ? 'CANCELLED' : firstTicket?.qr_status || 'ACTIVE';
    db.prepare(`
      UPDATE bookings
      SET qr_token = ?, qr_status = ?, scanned_at = COALESCE(scanned_at, ?), scanned_by_admin_id = COALESCE(scanned_by_admin_id, ?)
      WHERE id = ?
    `).run(qrToken, qrStatus, firstTicket?.scanned_at ?? null, firstTicket?.scanned_by_admin_id ?? null, b.id);
  }

  // Backfill companion_access from booking_participants where role = 'COMPANION'
  const companions = db
    .prepare(`
      SELECT bp.booking_id, bp.user_id, bp.name, bp.mobile, bp.relation, bp.verification_status, bp.invited_at, bp.verified_at
      FROM booking_participants bp
      WHERE bp.role = 'COMPANION'
    `)
    .all() as {
    booking_id: string;
    user_id: string | null;
    name: string;
    mobile: string;
    relation: string;
    verification_status: string;
    invited_at: string;
    verified_at: string | null;
  }[];

  const checkCa = db.prepare('SELECT id FROM companion_access WHERE booking_id = ? AND companion_mobile = ?');
  const insertCa = db.prepare(`
    INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of companions) {
    const exists = checkCa.get(c.booking_id, c.mobile);
    if (!exists) {
      insertCa.run(
        `ca-${crypto.randomUUID().slice(0, 8)}`,
        c.booking_id,
        c.user_id,
        c.name,
        c.mobile,
        c.relation,
        c.verification_status,
        c.verification_status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        c.invited_at,
        c.verified_at
      );
    }
  }
}

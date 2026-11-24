import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import {
  hashPassword,
  verifyPassword,
  signAuthToken,
  requireAdmin,
  type AuthenticatedRequest,
} from '../security.ts';

export const adminRoutes = Router();

function isAdminPasscodeConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
}

function getClaimedAdminHash(): string | null {
  const row = db
    .prepare("SELECT value FROM platform_settings WHERE key = 'admin_claimed_hash'")
    .get() as { value: string } | undefined;
  return row?.value ?? null;
}

// Check whether first-run admin setup is needed
adminRoutes.get('/bootstrap-status', (_req, res) => {
  const envConfigured = isAdminPasscodeConfigured();
  const claimedHash = getClaimedAdminHash();
  res.json({
    envPasscodeActive: envConfigured,
    needsFirstRunSetup: !envConfigured && !claimedHash,
  });
});

// One-time atomic first-run admin setup/claim
adminRoutes.post('/bootstrap', (req, res) => {
  if (isAdminPasscodeConfigured() || getClaimedAdminHash()) {
    res.status(403).json({ error: 'Admin access has already been configured.' });
    return;
  }
  const { name = 'Key2Show Admin', email, password } = req.body ?? {};
  if (!email || !password || String(password).length < 6) {
    res.status(400).json({ error: 'Valid admin email and password (min 6 chars) required.' });
    return;
  }

  const hash = hashPassword(String(password));
  const now = new Date().toISOString();
  const adminId = 'admin-primary';
  const cleanEmail = String(email).trim().toLowerCase();

  db.exec('BEGIN IMMEDIATE');
  // Re-check inside transaction for atomicity
  if (getClaimedAdminHash()) {
    db.exec('ROLLBACK');
    res.status(403).json({ error: 'Admin access already claimed.' });
    return;
  }
  db.prepare("INSERT INTO platform_settings (key, value) VALUES ('admin_claimed_hash', ?)").run(hash);
  db.prepare(`
    INSERT OR REPLACE INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
    VALUES (?, ?, ?, '+91 90000 00000', ?, 'ADMIN', 1, ?)
  `).run(adminId, String(name).trim(), cleanEmail, hash, now);
  db.prepare(`
    INSERT OR IGNORE INTO user_profiles (user_id, avatar_url, preferred_city, saved_locations_json, saved_payment_methods_json, wishlist_json, updated_at)
    VALUES (?, '', 'Hyderabad', '["Hyderabad"]', '[]', '[]', ?)
  `).run(adminId, now);
  db.exec('COMMIT');

  const token = signAuthToken(adminId, 'ADMIN');
  res.status(201).json({
    token,
    admin: { id: adminId, name: String(name).trim(), email: cleanEmail, role: 'ADMIN' },
  });
});

// Admin Login
adminRoutes.post('/login', (req, res) => {
  const { email, password, passcode } = req.body ?? {};
  const envPasscode = process.env.ADMIN_PASSCODE?.trim();

  // Env passcode overrides claimed fallback hash
  if (envPasscode && envPasscode.length > 0) {
    const provided = Buffer.from(String(passcode ?? password ?? ''));
    const expected = Buffer.from(envPasscode);
    if (provided.length !== expected.length || !crypto.timingSafeEqual(provided, expected)) {
      res.status(401).json({ error: 'Invalid administrator passcode.' });
      return;
    }
    const now = new Date().toISOString();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, name, email, mobile, password_hash, role, is_verified, created_at)
      VALUES ('admin-primary', 'Key2Show Admin', 'admin@key2show.local', '+91 90000 00000', ?, 'ADMIN', 1, ?)
    `).run(hashPassword(crypto.randomBytes(16).toString('hex')), now);
    const token = signAuthToken('admin-primary', 'ADMIN');
    res.json({ token, admin: { id: 'admin-primary', name: 'Key2Show Admin', email: 'admin@key2show.local', role: 'ADMIN' } });
    return;
  }

  const cleanEmail = String(email ?? '').trim().toLowerCase();
  const adminUser = db
    .prepare("SELECT id, name, email, password_hash, role FROM users WHERE role = 'ADMIN' AND (email = ? OR id = 'admin-primary')")
    .get(cleanEmail) as { id: string; name: string; email: string; password_hash: string; role: 'ADMIN' } | undefined;

  if (!adminUser || !verifyPassword(String(password ?? ''), adminUser.password_hash)) {
    res.status(401).json({ error: 'Invalid administrator credentials.' });
    return;
  }

  const token = signAuthToken(adminUser.id, 'ADMIN');
  res.json({
    token,
    admin: { id: adminUser.id, name: adminUser.name, email: adminUser.email, role: 'ADMIN' },
  });
});

// Protected Admin Overview & Analytics
adminRoutes.get('/overview', requireAdmin, (_req, res) => {
  const totalUsers = (db.prepare('SELECT COUNT(*) AS c FROM users').get() as { c: number }).c;
  const totalBookings = (db.prepare('SELECT COUNT(*) AS c FROM bookings').get() as { c: number }).c;
  const activeShows = (db.prepare("SELECT COUNT(*) AS c FROM shows WHERE status = 'ACTIVE'").get() as { c: number }).c;
  const totalMovies = (db.prepare('SELECT COUNT(*) AS c FROM movies').get() as { c: number }).c;
  const totalEvents = (db.prepare('SELECT COUNT(*) AS c FROM events').get() as { c: number }).c;
  const totalTheatres = (db.prepare('SELECT COUNT(*) AS c FROM theatres').get() as { c: number }).c;
  const foodOrdersCount = (db.prepare('SELECT COUNT(*) AS c FROM food_orders').get() as { c: number }).c;
  const cancelledBookings = (db.prepare("SELECT COUNT(*) AS c FROM bookings WHERE status = 'CANCELLED'").get() as { c: number }).c;
  const refundsTotal = (db.prepare('SELECT COALESCE(SUM(refund_amount), 0) AS s FROM refunds').get() as { s: number }).s;
  const companionTicketsCount = (db.prepare("SELECT COUNT(*) AS c FROM booking_participants WHERE role = 'COMPANION'").get() as { c: number }).c;
  const revenueRow = db.prepare("SELECT COALESCE(SUM(total_amount), 0) AS s FROM bookings WHERE status = 'CONFIRMED'").get() as { s: number };

  const revenueByMovie = db
    .prepare(`
      SELECT movie_title AS label, SUM(total_amount) AS revenue, COUNT(*) AS bookings
      FROM bookings
      WHERE status = 'CONFIRMED'
      GROUP BY movie_title
      ORDER BY revenue DESC
      LIMIT 6
    `)
    .all();

  const settingsRows = db.prepare('SELECT key, value FROM platform_settings WHERE key != \'admin_claimed_hash\'').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const r of settingsRows) settings[r.key] = r.value;

  res.json({
    kpis: {
      totalUsers,
      totalBookings,
      todayBookings: totalBookings,
      todayRevenue: revenueRow.s,
      activeShows,
      totalMovies,
      totalEvents,
      totalTheatres,
      foodOrdersCount,
      cancelledBookings,
      refundsTotal,
      companionTicketsCount,
    },
    revenueByMovie,
    settings,
  });
});

// Admin Movies CRUD
adminRoutes.get('/movies', requireAdmin, (_req, res) => {
  const rows = db.prepare('SELECT * FROM movies ORDER BY created_at DESC').all();
  res.json({ movies: rows });
});

adminRoutes.post('/movies', requireAdmin, (req: AuthenticatedRequest, res) => {
  const { title, language = 'Telugu / Hindi', duration = '2h 30m', rating = 8.5, certification = 'UA', genre = ['Action'], formats = ['2D', 'IMAX 2D'], basePrice = 260, synopsis = '', poster = '/assets/images/movie-pushpa.jpg', releaseDate = '2026-11-22', cast = [], director = 'Director' } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'Movie title is required.' });
    return;
  }
  const id = `mov-${crypto.randomUUID().slice(0, 6)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO movies (id, title, subtitle, poster, banner, trailer_url, genre_json, language, duration, rating, votes, certification, formats_json, release_date, release_year, base_price, featured, published, synopsis, created_at)
    VALUES (?, ?, '', ?, '/assets/images/hero-cast.jpg', '', ?, ?, ?, ?, '10K', ?, ?, ?, 2026, ?, 1, 1, ?, ?)
  `).run(id, String(title).trim(), String(poster), JSON.stringify(genre), String(language), String(duration), Number(rating), String(certification), JSON.stringify(formats), String(releaseDate), Number(basePrice), String(synopsis), now);

  if (Array.isArray(cast)) {
    cast.forEach((actor: string, i: number) => {
      db.prepare('INSERT INTO movie_cast (id, movie_id, actor_name, role_name) VALUES (?, ?, ?, ?)').run(`${id}-c${i}`, id, String(actor), 'Lead');
    });
  }
  db.prepare('INSERT INTO movie_crew (id, movie_id, member_name, department) VALUES (?, ?, ?, ?)').run(`${id}-cr1`, id, String(director), 'Director');
  res.status(201).json({ id });
});

adminRoutes.put('/movies/:id', requireAdmin, (req, res) => {
  const { title, published, basePrice, rating, synopsis } = req.body ?? {};
  db.prepare(`
    UPDATE movies
    SET title = COALESCE(?, title),
        published = COALESCE(?, published),
        base_price = COALESCE(?, base_price),
        rating = COALESCE(?, rating),
        synopsis = COALESCE(?, synopsis)
    WHERE id = ?
  `).run(
    title ?? null,
    published === undefined ? null : published ? 1 : 0,
    basePrice ?? null,
    rating ?? null,
    synopsis ?? null,
    req.params.id
  );
  res.json({ updated: true });
});

adminRoutes.delete('/movies/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM movies WHERE id = ?').run(req.params.id);
  res.json({ deleted: true });
});

// Admin Theatres, Screens & Visual Seat Layout Editor
adminRoutes.get('/theatres', requireAdmin, (_req, res) => {
  const theatres = db.prepare('SELECT * FROM theatres').all();
  const screens = db.prepare('SELECT * FROM screens').all();
  res.json({ theatres, screens });
});

adminRoutes.post('/theatres', requireAdmin, (req, res) => {
  const { name, location, city = 'Hyderabad', address, category = 'Multiplex', rating = 4.5, image = '/assets/images/theatre-pvr.jpg' } = req.body ?? {};
  if (!name || !location) {
    res.status(400).json({ error: 'Theatre name and location are required.' });
    return;
  }
  const id = `tht-${crypto.randomUUID().slice(0, 6)}`;
  db.prepare(`
    INSERT INTO theatres (id, name, location, city, address, category, rating, image, screens_count, formats_json, amenities_json, food_available, lat, lng, featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, '["2D","Dolby Atmos"]', '["Parking","QR Entry"]', 1, 17.42, 78.45, 0)
  `).run(id, String(name), String(location), String(city), String(address || `${location}, ${city}`), String(category), Number(rating), String(image));

  const scrId = `${id}-scr-1`;
  db.prepare("INSERT INTO screens (id, theatre_id, name, rows_count, cols_count, sound_system, projection) VALUES (?, ?, 'Screen 1 (Dolby Atmos)', 6, 10, 'Dolby Atmos', '4K Laser')").run(scrId, id);
  for (const row of ['A', 'B', 'C', 'D', 'E', 'F']) {
    for (let c = 1; c <= 10; c++) {
      db.prepare('INSERT INTO seats (id, screen_id, row_label, seat_number, seat_code, category, price_delta, is_blocked) VALUES (?, ?, ?, ?, ?, ?, ?, 0)').run(
        `${scrId}-${row}${c}`,
        scrId,
        row,
        c,
        `${row}${c}`,
        row === 'F' ? 'RECLINER' : row === 'D' || row === 'E' ? 'PREMIUM' : 'STANDARD',
        row === 'F' ? 180 : row === 'D' || row === 'E' ? 70 : 0
      );
    }
  }
  res.status(201).json({ id });
});

adminRoutes.get('/screens/:id/seats', requireAdmin, (req, res) => {
  const seats = db.prepare('SELECT * FROM seats WHERE screen_id = ? ORDER BY row_label, seat_number').all(req.params.id);
  res.json({ seats });
});

adminRoutes.put('/screens/:id/seats', requireAdmin, (req, res) => {
  const { updates = [] } = req.body ?? {};
  const stmt = db.prepare('UPDATE seats SET category = ?, price_delta = ?, is_blocked = ? WHERE screen_id = ? AND seat_code = ?');
  for (const u of updates) {
    stmt.run(String(u.category), Number(u.price_delta ?? 0), u.is_blocked ? 1 : 0, req.params.id, String(u.seat_code));
  }
  res.json({ updated: true });
});

// Admin Shows Management
adminRoutes.get('/shows', requireAdmin, (_req, res) => {
  const shows = db.prepare(`
    SELECT s.*, m.title AS movie_title, t.name AS theatre_name, sc.name AS screen_name
    FROM shows s
    JOIN movies m ON m.id = s.movie_id
    JOIN theatres t ON t.id = s.theatre_id
    JOIN screens sc ON sc.id = s.screen_id
    ORDER BY s.show_date DESC, s.show_time ASC
  `).all();
  res.json({ shows });
});

adminRoutes.post('/shows', requireAdmin, (req, res) => {
  const { movieId, theatreId, screenId, showDate, showTime, timeSlot = 'Evening', format = 'IMAX 2D', basePrice = 350 } = req.body ?? {};
  if (!movieId || !theatreId || !screenId || !showDate || !showTime) {
    res.status(400).json({ error: 'All show fields are required.' });
    return;
  }
  const showId = `show-${crypto.randomUUID().slice(0, 8)}`;
  db.exec('BEGIN IMMEDIATE');
  db.prepare(`
    INSERT INTO shows (id, movie_id, theatre_id, screen_id, show_date, show_time, time_slot, format, base_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `).run(showId, String(movieId), String(theatreId), String(screenId), String(showDate), String(showTime), String(timeSlot), String(format), Number(basePrice));

  const seats = db.prepare('SELECT seat_code, category, price_delta, is_blocked FROM seats WHERE screen_id = ?').all(String(screenId)) as {
    seat_code: string; category: string; price_delta: number; is_blocked: number;
  }[];
  const ins = db.prepare('INSERT INTO show_seats (id, show_id, seat_code, category, price, status, locked_by_user_id, lock_expires_at, booking_id) VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)');
  for (const s of seats) {
    ins.run(`${showId}-${s.seat_code}`, showId, s.seat_code, s.category, Number(basePrice) + s.price_delta, s.is_blocked ? 'UNAVAILABLE' : 'AVAILABLE');
  }
  db.exec('COMMIT');
  res.status(201).json({ id: showId });
});

adminRoutes.put('/shows/:id/cancel', requireAdmin, (req, res) => {
  db.prepare("UPDATE shows SET status = 'CANCELLED' WHERE id = ?").run(req.params.id);
  res.json({ cancelled: true });
});

// Admin Food, Events, Coupons, Offers, Bookings, Users, Refunds
adminRoutes.get('/food', requireAdmin, (_req, res) => {
  res.json({ foodItems: db.prepare('SELECT * FROM food_items').all() });
});

adminRoutes.post('/food', requireAdmin, (req, res) => {
  const { name, category = 'Snacks', description = '', price = 180, isCombo = false, image = '/assets/images/theatre-pvr.jpg' } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'Food item name is required.' });
    return;
  }
  const id = `food-${crypto.randomUUID().slice(0, 6)}`;
  db.prepare('INSERT INTO food_items (id, name, category, description, price, image, is_combo, is_veg, available) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1)')
    .run(id, String(name), String(category), String(description), Number(price), String(image), isCombo ? 1 : 0);
  res.status(201).json({ id });
});

adminRoutes.put('/food/:id', requireAdmin, (req, res) => {
  const { available, price } = req.body ?? {};
  db.prepare('UPDATE food_items SET available = COALESCE(?, available), price = COALESCE(?, price) WHERE id = ?')
    .run(available === undefined ? null : available ? 1 : 0, price ?? null, req.params.id);
  res.json({ updated: true });
});

adminRoutes.get('/events', requireAdmin, (_req, res) => {
  res.json({ events: db.prepare('SELECT * FROM events').all() });
});

adminRoutes.post('/events', requireAdmin, (req, res) => {
  const { title, category = 'Concerts', venue, city = 'Hyderabad', eventDate, eventTime, price = 999, badge = 'New', description = '', image = '/assets/images/live-events-bg.jpg' } = req.body ?? {};
  if (!title || !venue) {
    res.status(400).json({ error: 'Event title and venue required.' });
    return;
  }
  const id = `evt-${crypto.randomUUID().slice(0, 6)}`;
  db.prepare('INSERT INTO events (id, title, category, venue, city, event_date, event_time, price, image, badge, description, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)')
    .run(id, String(title), String(category), String(venue), String(city), String(eventDate || 'Sat, 28 Dec'), String(eventTime || '07:00 PM'), Number(price), String(image), String(badge), String(description));
  db.prepare('INSERT INTO event_tickets (id, event_id, tier_name, price, total_qty, sold_qty) VALUES (?, ?, ?, ?, 200, 0)').run(`${id}-silver`, id, 'Silver Access', Number(price));
  res.status(201).json({ id });
});

adminRoutes.get('/coupons', requireAdmin, (_req, res) => {
  res.json({
    coupons: db.prepare('SELECT * FROM coupons').all(),
    offers: db.prepare('SELECT * FROM offers').all(),
  });
});

adminRoutes.post('/coupons', requireAdmin, (req, res) => {
  const { code, title, discountType = 'FLAT', discountValue = 100, minAmount = 300, maxDiscount = 150, expiryDate = '2027-12-31' } = req.body ?? {};
  if (!code || !title) {
    res.status(400).json({ error: 'Coupon code and title required.' });
    return;
  }
  const id = `coup-${crypto.randomUUID().slice(0, 6)}`;
  db.prepare('INSERT INTO coupons (id, code, title, discount_type, discount_value, min_amount, max_discount, expiry_date, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)')
    .run(id, String(code).toUpperCase().trim(), String(title), String(discountType), Number(discountValue), Number(minAmount), Number(maxDiscount), String(expiryDate));
  res.status(201).json({ id });
});

adminRoutes.get('/bookings', requireAdmin, (req, res) => {
  const q = String(req.query.q ?? '').trim().toLowerCase();
  const rows = db.prepare(`
    SELECT b.*, u.name AS booker_name, u.mobile AS booker_mobile, p.method AS payment_method, p.status AS payment_status
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN payments p ON p.booking_id = b.id
    ORDER BY b.created_at DESC
  `).all() as Record<string, string | number | null>[];

  const filtered = q
    ? rows.filter((r) =>
        String(r.booking_code).toLowerCase().includes(q) ||
        String(r.booker_name).toLowerCase().includes(q) ||
        String(r.booker_mobile).toLowerCase().includes(q) ||
        String(r.movie_title).toLowerCase().includes(q) ||
        String(r.theatre_name).toLowerCase().includes(q)
      )
    : rows;

  const enriched = filtered.map((b) => {
    const seats = (
      db
        .prepare("SELECT label FROM booking_items WHERE booking_id = ? AND item_type = 'SEAT'")
        .all(b.id) as { label: string }[]
    ).map((i) => i.label.replace(/^Seat\s+/i, '').trim());
    const participants = db
      .prepare('SELECT name, mobile, relation, seat_code, role, verification_status FROM booking_participants WHERE booking_id = ?')
      .all(b.id) as { seat_code: string }[];

    return {
      ...b,
      seats: seats.length > 0 ? seats : Array.from(new Set(participants.map((p) => p.seat_code))),
      participants,
      companionAccess: db.prepare('SELECT id, companion_name, companion_mobile, relation, verification_status, access_status FROM companion_access WHERE booking_id = ?').all(b.id),
      foodItems: db.prepare('SELECT foi.name, foi.quantity FROM food_order_items foi JOIN food_orders fo ON fo.id = foi.food_order_id WHERE fo.booking_id = ?').all(b.id),
    };
  });

  res.json({ bookings: enriched });
});

adminRoutes.get('/users', requireAdmin, (_req, res) => {
  const users = db
    .prepare('SELECT id, name, email, mobile, role, is_verified, created_at FROM users ORDER BY created_at DESC')
    .all();
  res.json({ users });
});

adminRoutes.get('/refunds', requireAdmin, (_req, res) => {
  const refunds = db.prepare(`
    SELECT r.*, b.booking_code, b.movie_title, u.name AS user_name
    FROM refunds r
    JOIN bookings b ON b.id = r.booking_id
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC
  `).all();
  res.json({ refunds });
});

// ONE BOOKING = ONE QR CODE Scanner & Validation (Admin/Staff Entry Gate)
adminRoutes.get('/qr/scan/:token', requireAdmin, (req, res) => {
  const qrToken = String(req.params.token).trim();
  const booking = db.prepare(`
    SELECT
      b.id AS booking_id, b.booking_code, b.user_id, b.movie_title, b.theatre_name, b.screen_name,
      b.show_date, b.show_time, b.format, b.status AS booking_status, b.payment_status,
      b.qr_token, b.qr_status, b.scanned_at,
      u.name AS booker_name, u.mobile AS booker_mobile,
      s.status AS show_status
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    LEFT JOIN shows s ON s.id = b.show_id
    WHERE b.qr_token = ?
  `).get(qrToken) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(404).json({ valid: false, status: 'INVALID', reason: 'QR code does not match any active booking.' });
    return;
  }

  const itemSeats = (
    db.prepare("SELECT label FROM booking_items WHERE booking_id = ? AND item_type = 'SEAT'").all(booking.booking_id) as { label: string }[]
  ).map((r) => r.label.replace(/^Seat\s+/i, '').trim());
  const participants = db
    .prepare('SELECT name, mobile, relation, seat_code, role, verification_status FROM booking_participants WHERE booking_id = ?')
    .all(booking.booking_id) as { name: string; mobile: string; relation: string; seat_code: string; role: string; verification_status: string }[];
  const companionAccess = db
    .prepare('SELECT companion_name AS name, companion_mobile AS mobile, relation, verification_status FROM companion_access WHERE booking_id = ?')
    .all(booking.booking_id);
  const seats = itemSeats.length > 0 ? itemSeats : Array.from(new Set(participants.map((p) => p.seat_code)));

  const foodItems = db.prepare(`
    SELECT foi.name, foi.quantity
    FROM food_order_items foi
    JOIN food_orders fo ON fo.id = foi.food_order_id
    WHERE fo.booking_id = ?
  `).all(booking.booking_id);

  const showActive = !booking.show_status || booking.show_status === 'ACTIVE';
  const paidOk = !booking.payment_status || booking.payment_status === 'PAID';
  const isValid = booking.qr_status === 'ACTIVE' && booking.booking_status === 'CONFIRMED' && paidOk && showActive;

  res.json({
    valid: isValid,
    status: booking.qr_status,
    reason: isValid
      ? `Valid Booking QR (${seats.length} Ticket${seats.length === 1 ? '' : 's'}) — Ready for Gate Entry`
      : `Entry Rejected — Booking QR status is ${booking.qr_status} (${booking.booking_status})`,
    booking: {
      ...booking,
      seats,
      ticketCount: seats.length,
      participants,
      companionAccess,
      foodItems,
    },
  });
});

adminRoutes.post('/qr/mark-entry', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { qrToken } = req.body ?? {};
  const clean = String(qrToken ?? '').trim();
  const booking = db
    .prepare('SELECT id, booking_code, user_id, qr_status, status, payment_status FROM bookings WHERE qr_token = ?')
    .get(clean) as { id: string; booking_code: string; user_id: string; qr_status: string; status: string; payment_status: string } | undefined;

  if (!booking) {
    res.status(404).json({ error: 'Booking QR not found.' });
    return;
  }
  if (booking.status !== 'CONFIRMED' || booking.payment_status !== 'PAID') {
    res.status(409).json({ error: `Booking is not eligible for entry (${booking.status} / ${booking.payment_status}).` });
    return;
  }
  if (booking.qr_status !== 'ACTIVE') {
    res.status(409).json({ error: `Booking QR cannot be used (current status: ${booking.qr_status}).` });
    return;
  }

  const now = new Date().toISOString();
  db.prepare("UPDATE bookings SET qr_status = 'USED', scanned_at = ?, scanned_by_admin_id = ? WHERE id = ?")
    .run(now, req.auth!.userId, booking.id);

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'QR_BOOKING_ENTERED', 'BOOKING', ?, ?, ?)
  `).run(`aud-${crypto.randomUUID().slice(0, 8)}`, req.auth!.userId, booking.id, JSON.stringify({ bookingCode: booking.booking_code }), now);

  const { publishToUsers, publishToAdmins } = await import('../services/realtimeHub.ts');
  const compUsers = db
    .prepare('SELECT companion_user_id FROM companion_access WHERE booking_id = ? AND companion_user_id IS NOT NULL')
    .all(booking.id) as { companion_user_id: string }[];
  const recipients = [booking.user_id, ...compUsers.map((c) => c.companion_user_id)];
  publishToUsers(recipients, 'booking:checked_in', { bookingId: booking.id, bookingCode: booking.booking_code, qrStatus: 'USED', scannedAt: now });
  publishToAdmins('booking:checked_in', { bookingId: booking.id, bookingCode: booking.booking_code, qrStatus: 'USED', scannedAt: now });

  res.json({ markedUsed: true, scannedAt: now, bookingCode: booking.booking_code });
});

adminRoutes.put('/settings', requireAdmin, (req, res) => {
  const allowedKeys = ['free_cancel_hours', 'partial_refund_pct', 'convenience_fee_pct', 'tax_pct'];
  const stmt = db.prepare('INSERT OR REPLACE INTO platform_settings (key, value) VALUES (?, ?)');
  for (const k of allowedKeys) {
    if (req.body?.[k] !== undefined) {
      stmt.run(k, String(req.body[k]));
    }
  }
  res.json({ updated: true });
});

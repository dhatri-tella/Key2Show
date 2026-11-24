import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import {
  requireAuth,
  generateQrToken,
  generateOtpCode,
  hashOtp,
  verifyOtpHash,
  type AuthenticatedRequest,
} from '../security.ts';
import { releaseExpiredLocks } from './publicRoutes.ts';
import {
  publishToAdmins,
  publishToShow,
  publishToUsers,
} from '../services/realtimeHub.ts';
import {
  calculateDetailedBookingTotal,
  calculateRefundAmount,
  isValidMobile,
  normalizeIndianMobile,
  validateCouponRule,
  type CouponRule,
} from '../../utils/bookingLogic.ts';
import { dispatchBookingConfirmationEmail } from '../services/emailService.ts';

export const bookingRoutes = Router();

const LOCK_TTL_MS = 10 * 60 * 1000; // 10 minutes

interface RazorpayCredentials {
  keyId: string;
  keySecret: string;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  status: string;
}

interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: string;
  method?: string;
}

function getRazorpayCredentials(): RazorpayCredentials | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  return keyId && keySecret ? { keyId, keySecret } : null;
}

async function razorpayRequest<T>(
  path: string,
  credentials: RazorpayCredentials,
  method: 'GET' | 'POST',
  body?: Record<string, unknown>
): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Basic ${Buffer.from(`${credentials.keyId}:${credentials.keySecret}`).toString('base64')}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => null) as
    | (T & { error?: { description?: string } })
    | null;
  if (!response.ok) {
    throw new Error(result?.error?.description || `Razorpay request failed (${response.status}).`);
  }
  if (!result) {
    throw new Error('Razorpay returned an empty response.');
  }
  return result;
}

function verifyRazorpaySignature(orderId: string, paymentId: string, signature: string, keySecret: string): boolean {
  if (!/^[\da-f]{64}$/i.test(signature)) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest();
  const actual = Buffer.from(signature, 'hex');
  return actual.length === expected.length && crypto.timingSafeEqual(expected, actual);
}

function getBookingSeatCodes(bookingId: string): string[] {
  const items = db
    .prepare("SELECT label FROM booking_items WHERE booking_id = ? AND item_type = 'SEAT'")
    .all(bookingId) as { label: string }[];
  if (items.length > 0) {
    return items.map((i) => i.label.replace(/^Seat\s+/i, '').trim());
  }
  const parts = db
    .prepare('SELECT seat_code FROM booking_participants WHERE booking_id = ?')
    .all(bookingId) as { seat_code: string }[];
  return Array.from(new Set(parts.map((p) => p.seat_code).filter(Boolean)));
}

function getBookingStakeholderUserIds(bookingId: string): string[] {
  const b = db.prepare('SELECT user_id FROM bookings WHERE id = ?').get(bookingId) as { user_id: string } | undefined;
  const parts = db
    .prepare('SELECT user_id FROM booking_participants WHERE booking_id = ? AND user_id IS NOT NULL')
    .all(bookingId) as { user_id: string }[];
  const ca = db
    .prepare('SELECT companion_user_id FROM companion_access WHERE booking_id = ? AND companion_user_id IS NOT NULL')
    .all(bookingId) as { companion_user_id: string }[];
  return Array.from(
    new Set([
      ...(b ? [b.user_id] : []),
      ...parts.map((p) => p.user_id),
      ...ca.map((c) => c.companion_user_id),
    ])
  );
}

// Temporary seat lock
bookingRoutes.post('/shows/:id/lock', requireAuth, (req: AuthenticatedRequest, res) => {
  releaseExpiredLocks();
  const { seatCodes } = req.body ?? {};
  if (!Array.isArray(seatCodes) || seatCodes.length === 0 || seatCodes.length > 8) {
    res.status(400).json({ error: 'Select between 1 and 8 seats.' });
    return;
  }

  const showId = String(req.params.id);
  const userId = req.auth!.userId;
  const expiresAt = Date.now() + LOCK_TTL_MS;

  try {
    db.exec('BEGIN IMMEDIATE');

    // Release previous locks held by this user on this show first
    db.prepare(`
      UPDATE show_seats
      SET status = 'AVAILABLE', locked_by_user_id = NULL, lock_expires_at = NULL
      WHERE show_id = ? AND status = 'LOCKED' AND locked_by_user_id = ?
    `).run(showId, userId);

    for (const rawCode of seatCodes) {
      const code = String(rawCode).trim().toUpperCase();
      const seat = db
        .prepare('SELECT id, status, locked_by_user_id FROM show_seats WHERE show_id = ? AND seat_code = ?')
        .get(showId, code) as { id: string; status: string; locked_by_user_id: string | null } | undefined;

      if (!seat) {
        db.exec('ROLLBACK');
        res.status(404).json({ error: `Seat ${code} does not exist for this show.` });
        return;
      }
      if (seat.status === 'BOOKED' || seat.status === 'UNAVAILABLE') {
        db.exec('ROLLBACK');
        res.status(409).json({ error: `Sorry, ${code} was just booked. Please select another seat.` });
        return;
      }
      if (seat.status === 'LOCKED' && seat.locked_by_user_id !== userId) {
        db.exec('ROLLBACK');
        res.status(409).json({ error: `Seat ${code} is temporarily locked by another customer.` });
        return;
      }

      db.prepare(`
        UPDATE show_seats
        SET status = 'LOCKED', locked_by_user_id = ?, lock_expires_at = ?
        WHERE id = ?
      `).run(userId, expiresAt, seat.id);
    }

    db.exec('COMMIT');
    publishToShow(showId, 'seats:updated', { showId });
    res.json({ locked: true, seatCodes, expiresAt });
  } catch (err) {
    db.exec('ROLLBACK');
    res.status(500).json({ error: (err as Error).message });
  }
});

bookingRoutes.post('/shows/:id/release', requireAuth, (req: AuthenticatedRequest, res) => {
  const showId = String(req.params.id);
  db.prepare(`
    UPDATE show_seats
    SET status = 'AVAILABLE', locked_by_user_id = NULL, lock_expires_at = NULL
    WHERE show_id = ? AND status = 'LOCKED' AND locked_by_user_id = ?
  `).run(showId, req.auth!.userId);
  publishToShow(showId, 'seats:updated', { showId });
  res.json({ released: true });
});

interface CreateBookingParams {
  userId: string;
  kind?: 'MOVIE' | 'EVENT';
  showId?: string;
  eventId?: string;
  eventTierName?: string;
  eventQty?: number;
  seatCodes?: string[];
  foodCart?: { foodItemId: string; quantity: number }[];
  companions?: { seatCode?: string; name: string; mobile: string; relation?: string; verified?: boolean }[];
  couponCode?: string;
  paymentMethod?: string;
  maskedReference?: string;
  transactionRef?: string;
  isFamilyBooking?: boolean;
}

interface CreateBookingResult {
  bookingId: string;
  bookingCode: string;
  qrToken: string;
  totalAmount: number;
  movieTitle: string;
  theatreName: string;
  screenName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  companionUserIds: string[];
}

function createBookingCore(params: CreateBookingParams): CreateBookingResult {
  releaseExpiredLocks();
  const {
    userId,
    kind = 'MOVIE',
    showId,
    eventId,
    eventTierName,
    eventQty,
    seatCodes = [],
    foodCart = [],
    companions = [],
    couponCode = '',
    paymentMethod = 'UPI',
    maskedReference = 'upi@okaxis',
    transactionRef,
    isFamilyBooking = false,
  } = params;

  const userRow = db
    .prepare('SELECT id, name, mobile FROM users WHERE id = ?')
    .get(userId) as { id: string; name: string; mobile: string } | undefined;

  if (!userRow) {
    throw new Error('Authenticated user not found.');
  }

  const now = new Date().toISOString();
  const bookingId = `bkg-${crypto.randomUUID().slice(0, 8)}`;
  const bookingCode = `K2S${new Date().getFullYear()}${crypto.randomInt(100000, 999999)}`;
  const singleBookingQr = generateQrToken();

  db.exec('BEGIN IMMEDIATE');
  try {
    let movieTitle = '';
    let theatreName = '';
    let screenName = '';
    let showDate = now.slice(0, 10);
    let showTime = '';
    let format = '';
    let seatPrices: number[] = [];
    let resolvedSeatCodes: string[] = [];
    let movieIdForCoupon: string | undefined;
    let theatreIdForCoupon: string | undefined;

    if (kind === 'EVENT') {
      const ev = db
        .prepare('SELECT * FROM events WHERE id = ? AND published = 1')
        .get(String(eventId ?? '')) as Record<string, string | number | null> | undefined;
      if (!ev) {
        throw new Error('Selected event not found.');
      }
      const tier = db
        .prepare('SELECT * FROM event_tickets WHERE event_id = ? AND tier_name = ?')
        .get(ev.id, String(eventTierName ?? 'Silver Access')) as Record<string, string | number | null> | undefined;

      const qty = Math.max(1, Math.min(8, Number(eventQty ?? companions.length ?? 1)));
      const unitPrice = tier ? Number(tier.price) : Number(ev.price);
      movieTitle = String(ev.title);
      theatreName = String(ev.venue);
      screenName = tier ? String(tier.tier_name) : 'General Admission';
      showDate = String(ev.event_date);
      showTime = String(ev.event_time);
      format = String(ev.category);
      seatPrices = Array.from({ length: qty }, () => unitPrice);
      resolvedSeatCodes = Array.from({ length: qty }, (_, idx) => `PASS-${idx + 1}`);

      if (tier) {
        db.prepare('UPDATE event_tickets SET sold_qty = sold_qty + ? WHERE id = ?').run(qty, tier.id);
      }
    } else {
      if (!showId || !Array.isArray(seatCodes) || seatCodes.length === 0) {
        throw new Error('Show and at least one seat are required.');
      }
      const show = db
        .prepare(`
          SELECT s.*, m.title AS movie_title, t.name AS theatre_name, t.location AS theatre_location, sc.name AS screen_name
          FROM shows s
          JOIN movies m ON m.id = s.movie_id
          JOIN theatres t ON t.id = s.theatre_id
          JOIN screens sc ON sc.id = s.screen_id
          WHERE s.id = ? AND s.status = 'ACTIVE'
        `)
        .get(String(showId)) as Record<string, string | number | null> | undefined;

      if (!show) {
        throw new Error('Selected show is no longer active.');
      }

      movieTitle = String(show.movie_title);
      theatreName = `${show.theatre_name} (${show.theatre_location})`;
      screenName = String(show.screen_name);
      showDate = String(show.show_date);
      showTime = String(show.show_time);
      format = String(show.format);
      movieIdForCoupon = String(show.movie_id);
      theatreIdForCoupon = String(show.theatre_id);

      for (const rawSeat of seatCodes) {
        const code = String(rawSeat).trim().toUpperCase();
        const seatRow = db
          .prepare('SELECT * FROM show_seats WHERE show_id = ? AND seat_code = ?')
          .get(show.id, code) as Record<string, string | number | null> | undefined;

        if (!seatRow) {
          throw new Error(`Seat ${code} not found.`);
        }
        if (seatRow.status === 'BOOKED' || seatRow.status === 'UNAVAILABLE') {
          throw new Error(`Sorry, ${code} was just booked. Please select another seat.`);
        }
        if (seatRow.status === 'LOCKED' && seatRow.locked_by_user_id !== userId) {
          throw new Error(`Seat ${code} is locked by another user.`);
        }

        seatPrices.push(Number(seatRow.price));
        resolvedSeatCodes.push(code);

        db.prepare(`
          UPDATE show_seats
          SET status = 'BOOKED', locked_by_user_id = NULL, lock_expires_at = NULL, booking_id = ?
          WHERE id = ?
        `).run(bookingId, seatRow.id);
      }
    }

    // Validate and compute Food & Beverages from DB prices
    let foodSubtotal = 0;
    const resolvedFood: { id: string; name: string; qty: number; price: number }[] = [];
    if (Array.isArray(foodCart)) {
      for (const fc of foodCart) {
        const qty = Math.max(0, Math.min(20, Number(fc?.quantity ?? 0)));
        if (qty <= 0) continue;
        const item = db
          .prepare('SELECT id, name, price, available FROM food_items WHERE id = ?')
          .get(String(fc.foodItemId ?? '')) as
          | { id: string; name: string; price: number; available: number }
          | undefined;
        if (!item || !item.available) {
          throw new Error(`Food item ${fc?.foodItemId} is unavailable.`);
        }
        foodSubtotal += item.price * qty;
        resolvedFood.push({ id: item.id, name: item.name, qty, price: item.price });
      }
    }

    // Coupon verification
    let discount = 0;
    const cleanCoupon = String(couponCode ?? '').trim().toUpperCase();
    if (cleanCoupon) {
      const crow = db
        .prepare('SELECT * FROM coupons WHERE UPPER(code) = ?')
        .get(cleanCoupon) as Record<string, unknown> | undefined;
      const rule: CouponRule | undefined = crow
        ? {
            code: String(crow.code),
            discountType: String(crow.discount_type) as 'PERCENT' | 'FLAT',
            discountValue: Number(crow.discount_value),
            minAmount: Number(crow.min_amount),
            maxDiscount: Number(crow.max_discount),
            expiryDate: String(crow.expiry_date),
            applicableMovieId: crow.applicable_movie_id ? String(crow.applicable_movie_id) : null,
            applicableTheatreId: crow.applicable_theatre_id ? String(crow.applicable_theatre_id) : null,
            active: Boolean(crow.active),
          }
        : undefined;
      const seatAndFood = seatPrices.reduce((s, p) => s + p, 0) + foodSubtotal;
      const cRes = validateCouponRule(rule, seatAndFood, {
        movieId: movieIdForCoupon,
        theatreId: theatreIdForCoupon,
      });
      if (!cRes.valid) {
        throw new Error(cRes.reason ?? 'Invalid coupon code.');
      }
      discount = cRes.discount;
    }

    const convPctRow = db.prepare("SELECT value FROM platform_settings WHERE key = 'convenience_fee_pct'").get() as { value: string } | undefined;
    const taxPctRow = db.prepare("SELECT value FROM platform_settings WHERE key = 'tax_pct'").get() as { value: string } | undefined;
    const convRate = Number(convPctRow?.value ?? 8) / 100;
    const taxRate = Number(taxPctRow?.value ?? 18) / 100;

    const totals = calculateDetailedBookingTotal({
      seatPrices,
      foodTotal: foodSubtotal,
      discount,
      convenienceRate: kind === 'EVENT' ? 0.06 : convRate,
      taxRate,
    });

    const companionList = Array.isArray(companions)
      ? companions.filter((c: { mobile?: string }) => c?.mobile && isValidMobile(String(c.mobile)))
      : [];
    const familyFlag = Boolean(isFamilyBooking) || companionList.length > 0;

    db.prepare(`
      INSERT INTO bookings (
        id, booking_code, user_id, kind, show_id, event_id, movie_title, theatre_name, screen_name,
        show_date, show_time, format, seats_subtotal, food_subtotal, convenience_fee, taxes,
        discount, total_amount, coupon_code, status, payment_status, qr_token, qr_status, email_status, is_family_booking, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONFIRMED', 'PAID', ?, 'ACTIVE', 'PENDING', ?, ?)
    `).run(
      bookingId,
      bookingCode,
      userId,
      kind,
      kind === 'MOVIE' ? String(showId) : null,
      kind === 'EVENT' ? String(eventId) : null,
      movieTitle,
      theatreName,
      screenName,
      showDate,
      showTime,
      format,
      totals.seatsSubtotal,
      totals.foodSubtotal,
      totals.convenienceFee,
      totals.taxes,
      totals.discount,
      totals.total,
      cleanCoupon || null,
      singleBookingQr,
      familyFlag ? 1 : 0,
      now
    );

    // Booking items (SEAT + FOOD)
    const insertBItem = db.prepare(`
      INSERT INTO booking_items (id, booking_id, item_type, label, quantity, unit_price, total_price)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    resolvedSeatCodes.forEach((sc, idx) => {
      insertBItem.run(`bi-${crypto.randomUUID().slice(0, 8)}`, bookingId, 'SEAT', `Seat ${sc}`, 1, seatPrices[idx], seatPrices[idx]);
    });

    // Food order
    if (resolvedFood.length > 0) {
      const foodOrderId = `fo-${crypto.randomUUID().slice(0, 8)}`;
      const foodTaxes = Math.round(foodSubtotal * taxRate);
      db.prepare(`
        INSERT INTO food_orders (id, booking_id, user_id, subtotal, taxes, discount, total, status, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, 'CONFIRMED', ?)
      `).run(foodOrderId, bookingId, userId, foodSubtotal, foodTaxes, foodSubtotal + foodTaxes, now);

      const insertFoi = db.prepare(`
        INSERT INTO food_order_items (id, food_order_id, food_item_id, name, quantity, unit_price, total_price)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      for (const rf of resolvedFood) {
        insertFoi.run(`foi-${crypto.randomUUID().slice(0, 8)}`, foodOrderId, rf.id, rf.name, rf.qty, rf.price, rf.price * rf.qty);
        insertBItem.run(`bi-${crypto.randomUUID().slice(0, 8)}`, bookingId, 'FOOD', rf.name, rf.qty, rf.price, rf.price * rf.qty);
      }
    }

    // Payment record (Tokenized / Masked only)
    const safeMaskedRef = String(maskedReference).slice(0, 28);
    db.prepare(`
      INSERT INTO payments (id, booking_id, user_id, method, masked_reference, amount, status, transaction_ref, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, ?)
    `).run(
      `pay-${crypto.randomUUID().slice(0, 8)}`,
      bookingId,
      userId,
      String(paymentMethod),
      safeMaskedRef,
      totals.total,
      transactionRef || `TXN-K2S-${crypto.randomInt(100000, 999999)}`,
      now
    );

    // Participants + Companion Access referencing the SINGLE booking QR
    const insertPart = db.prepare(`
      INSERT INTO booking_participants (id, booking_id, user_id, name, mobile, relation, seat_code, role, verification_status, invited_at, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertCompanionAccess = db.prepare(`
      INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertNotif = db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, ?, ?, ?, 0, ?)
    `);

    const companionUserIds: string[] = [];
    const seenCompanionMobiles = new Set<string>();

    resolvedSeatCodes.forEach((seatCode, index) => {
      const assignedComp =
        companionList.find((c: { seatCode?: string }) => c?.seatCode === seatCode) ??
        companionList[index] ??
        null;

      if (assignedComp && assignedComp.mobile) {
        const normCompMobile = normalizeIndianMobile(String(assignedComp.mobile));
        if (normCompMobile !== userRow.mobile && !seenCompanionMobiles.has(normCompMobile)) {
          seenCompanionMobiles.add(normCompMobile);
          const compName = String(assignedComp.name || 'Companion').trim();
          const compRelation = String(assignedComp.relation || 'Companion');
          const verStatus: 'VERIFIED' | 'PENDING' = assignedComp.verified ? 'VERIFIED' : 'PENDING';
          const existingUser = db
            .prepare('SELECT id, name FROM users WHERE mobile = ?')
            .get(normCompMobile) as { id: string; name: string } | undefined;

          const compUserId = existingUser?.id ?? null;
          const resolvedName = existingUser && !assignedComp.name ? existingUser.name : compName;
          const verTimestamp = verStatus === 'VERIFIED' ? now : null;

          insertPart.run(
            `part-${crypto.randomUUID().slice(0, 8)}`,
            bookingId,
            compUserId,
            resolvedName,
            normCompMobile,
            compRelation,
            seatCode,
            'COMPANION',
            verStatus,
            now,
            verTimestamp
          );

          insertCompanionAccess.run(
            `ca-${crypto.randomUUID().slice(0, 8)}`,
            bookingId,
            compUserId,
            resolvedName,
            normCompMobile,
            compRelation,
            verStatus,
            verStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
            now,
            verTimestamp
          );

          if (compUserId) {
            companionUserIds.push(compUserId);
            insertNotif.run(
              `notif-${crypto.randomUUID().slice(0, 8)}`,
              compUserId,
              'TICKET_SHARED',
              `Shared Booking Ready: ${movieTitle}`,
              `${userRow.name} shared booking access (${resolvedSeatCodes.join(', ')}) at ${theatreName} (${showTime}) with you.`,
              now
            );
          }
          return;
        }
      }

      insertPart.run(
        `part-${crypto.randomUUID().slice(0, 8)}`,
        bookingId,
        userId,
        userRow.name,
        userRow.mobile,
        'Self',
        seatCode,
        'PRIMARY',
        'VERIFIED',
        now,
        now
      );
    });

    for (const comp of companionList) {
      const normCompMobile = normalizeIndianMobile(String(comp.mobile));
      if (normCompMobile === userRow.mobile || seenCompanionMobiles.has(normCompMobile)) continue;
      seenCompanionMobiles.add(normCompMobile);
      const compName = String(comp.name || 'Companion').trim();
      const compRelation = String(comp.relation || 'Companion');
      const verStatus: 'VERIFIED' | 'PENDING' = comp.verified ? 'VERIFIED' : 'PENDING';
      const existingUser = db
        .prepare('SELECT id, name FROM users WHERE mobile = ?')
        .get(normCompMobile) as { id: string; name: string } | undefined;
      const compUserId = existingUser?.id ?? null;
      const verTimestamp = verStatus === 'VERIFIED' ? now : null;

      insertCompanionAccess.run(
        `ca-${crypto.randomUUID().slice(0, 8)}`,
        bookingId,
        compUserId,
        existingUser && !comp.name ? existingUser.name : compName,
        normCompMobile,
        compRelation,
        verStatus,
        verStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
        now,
        verTimestamp
      );
      if (compUserId) {
        companionUserIds.push(compUserId);
        insertNotif.run(
          `notif-${crypto.randomUUID().slice(0, 8)}`,
          compUserId,
          'TICKET_SHARED',
          `Shared Booking Ready: ${movieTitle}`,
          `${userRow.name} shared booking access (${resolvedSeatCodes.join(', ')}) at ${theatreName} (${showTime}) with you.`,
          now
        );
      }
    }

    insertNotif.run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      'BOOKING_CONFIRMED',
      `Booking Confirmed: ${bookingCode}`,
      `${resolvedSeatCodes.length} ticket(s) for ${movieTitle} at ${theatreName} confirmed with 1 booking QR.`,
      now
    );

    db.prepare(`
      INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
      VALUES (?, ?, 'BOOKING_CREATED', 'BOOKING', ?, ?, ?)
    `).run(
      `aud-${crypto.randomUUID().slice(0, 8)}`,
      userId,
      bookingId,
      JSON.stringify({ bookingCode, seats: resolvedSeatCodes, total: totals.total, singleQr: true }),
      now
    );

    db.exec('COMMIT');

    if (kind === 'MOVIE' && showId) {
      publishToShow(String(showId), 'seats:updated', { showId: String(showId) });
    }
    publishToUsers([userId, ...companionUserIds], 'booking:created', { bookingId, bookingCode });
    publishToAdmins('booking:created', { bookingId, bookingCode });

    return {
      bookingId,
      bookingCode,
      qrToken: singleBookingQr,
      totalAmount: totals.total,
      movieTitle,
      theatreName,
      screenName,
      showDate,
      showTime,
      seats: resolvedSeatCodes,
      companionUserIds,
    };
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

// Dedicated Payment Gateway: Create Secure Payment Session
bookingRoutes.post('/payments/create-session', requireAuth, async (req: AuthenticatedRequest, res) => {
  releaseExpiredLocks();
  const userId = req.auth!.userId;
  const userRow = db.prepare('SELECT id, name, mobile FROM users WHERE id = ?').get(userId);
  if (!userRow) {
    res.status(401).json({ error: 'Authenticated user not found.' });
    return;
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    res.status(503).json({
      error: 'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET, then restart the server.',
    });
    return;
  }

  const {
    kind = 'MOVIE',
    showId,
    eventId,
    eventTierName,
    eventQty = 1,
    seatCodes = [],
    foodCart = [],
    companions = [],
    couponCode = '',
    idempotencyKey,
  } = req.body ?? {};

  // Check if idempotencyKey already has an active session
  if (idempotencyKey) {
    const existingSession = db
      .prepare('SELECT * FROM payment_sessions WHERE idempotency_key = ?')
      .get(String(idempotencyKey)) as Record<string, any> | undefined;

    if (existingSession && Number(existingSession.expires_at) > Date.now()) {
      let draftObj: any = {};
      try { draftObj = JSON.parse(existingSession.draft_json); } catch {}
      if (!draftObj?.razorpayOrderId) {
        res.status(409).json({ error: 'This payment session has no Razorpay order. Please start checkout again.' });
        return;
      }
      res.json({
        sessionId: existingSession.id,
        amount: Number(existingSession.amount),
        currency: String(existingSession.currency),
        expiresAt: Number(existingSession.expires_at),
        status: String(existingSession.status),
        bookingId: existingSession.booking_id,
        summary: draftObj?.summary ?? null,
        razorpayOrderId: String(draftObj.razorpayOrderId),
        razorpayKeyId: credentials.keyId,
      });
      return;
    }
  }

  // Pre-calculate prices & verify locks
  let seatPrices: number[] = [];
  let movieTitle = '';
  let theatreName = '';
  let showTime = '';

  if (kind === 'EVENT') {
    const ev = db.prepare('SELECT * FROM events WHERE id = ?').get(String(eventId)) as any;
    if (!ev) {
      res.status(404).json({ error: 'Event not found.' });
      return;
    }
    const tier = db
      .prepare('SELECT * FROM event_tickets WHERE event_id = ? AND tier_name = ?')
      .get(ev.id, String(eventTierName ?? 'Silver Access')) as any;
    const qty = Math.max(1, Math.min(8, Number(eventQty)));
    const price = tier ? Number(tier.price) : Number(ev.price);
    seatPrices = Array.from({ length: qty }, () => price);
    movieTitle = String(ev.title);
    theatreName = String(ev.venue);
    showTime = `${ev.event_date} · ${ev.event_time}`;
  } else {
    if (!showId || !Array.isArray(seatCodes) || seatCodes.length === 0) {
      res.status(400).json({ error: 'Show and seat codes required.' });
      return;
    }
    const show = db
      .prepare(`
        SELECT s.*, m.title AS movie_title, t.name AS theatre_name, t.location AS theatre_location
        FROM shows s
        JOIN movies m ON m.id = s.movie_id
        JOIN theatres t ON t.id = s.theatre_id
        WHERE s.id = ? AND s.status = 'ACTIVE'
      `)
      .get(String(showId)) as any;

    if (!show) {
      res.status(404).json({ error: 'Show not found.' });
      return;
    }
    movieTitle = show.movie_title;
    theatreName = `${show.theatre_name} (${show.theatre_location})`;
    showTime = `${show.show_date} · ${show.show_time}`;

    for (const code of seatCodes) {
      const s = db
        .prepare('SELECT price, status, locked_by_user_id FROM show_seats WHERE show_id = ? AND seat_code = ?')
        .get(show.id, String(code).trim().toUpperCase()) as any;
      if (!s) {
        res.status(404).json({ error: `Seat ${code} not found.` });
        return;
      }
      if (s.status === 'BOOKED' || s.status === 'UNAVAILABLE') {
        res.status(409).json({ error: `Seat ${code} is unavailable.` });
        return;
      }
      if (s.status === 'LOCKED' && s.locked_by_user_id !== userId) {
        res.status(409).json({ error: `Seat ${code} is held by another user.` });
        return;
      }
      seatPrices.push(Number(s.price));
    }
  }

  let foodSubtotal = 0;
  if (Array.isArray(foodCart)) {
    for (const fc of foodCart) {
      const qty = Math.max(0, Number(fc.quantity ?? 0));
      if (qty <= 0) continue;
      const f = db.prepare('SELECT price, available FROM food_items WHERE id = ?').get(String(fc.foodItemId)) as any;
      if (f && f.available) {
        foodSubtotal += f.price * qty;
      }
    }
  }

  let discount = 0;
  const cleanCoupon = String(couponCode ?? '').trim().toUpperCase();
  if (cleanCoupon) {
    const crow = db.prepare('SELECT * FROM coupons WHERE UPPER(code) = ?').get(cleanCoupon) as any;
    if (crow) {
      const rule: CouponRule = {
        code: crow.code,
        discountType: crow.discount_type,
        discountValue: Number(crow.discount_value),
        minAmount: Number(crow.min_amount),
        maxDiscount: Number(crow.max_discount),
        expiryDate: crow.expiry_date,
        applicableMovieId: crow.applicable_movie_id,
        applicableTheatreId: crow.applicable_theatre_id,
        active: Boolean(crow.active),
      };
      const cRes = validateCouponRule(rule, seatPrices.reduce((a, b) => a + b, 0) + foodSubtotal);
      if (cRes.valid) discount = cRes.discount;
    }
  }

  const totals = calculateDetailedBookingTotal({
    seatPrices,
    foodTotal: foodSubtotal,
    discount,
    convenienceRate: kind === 'EVENT' ? 0.06 : 0.08,
    taxRate: 0.18,
  });

  const sessionId = `psess-${crypto.randomUUID().slice(0, 10)}`;
  const expiresAt = Date.now() + LOCK_TTL_MS;

  const summary = {
    kind,
    title: movieTitle,
    venue: theatreName,
    showTime,
    seats: seatCodes,
    ticketCount: seatPrices.length,
    foodCount: foodCart.reduce((s: number, f: any) => s + Number(f.quantity || 0), 0),
    total: totals.total,
    subtotal: totals.subtotal,
    convenienceFee: totals.convenienceFee,
    taxes: totals.taxes,
    discount: totals.discount,
  };

  let razorpayOrder: RazorpayOrder;
  try {
    razorpayOrder = await razorpayRequest<RazorpayOrder>(
      '/orders',
      credentials,
      'POST',
      {
        amount: Math.round(totals.total * 100),
        currency: 'INR',
        receipt: sessionId,
        notes: { session_id: sessionId },
      }
    );
  } catch (err) {
    res.status(502).json({
      error: `Unable to create a Razorpay order: ${(err as Error).message}`,
    });
    return;
  }

  if (
    !razorpayOrder.id ||
    razorpayOrder.amount !== Math.round(totals.total * 100) ||
    razorpayOrder.currency !== 'INR'
  ) {
    res.status(502).json({ error: 'Razorpay returned an order that does not match the booking total.' });
    return;
  }

  const draftPayload = { ...req.body, razorpayOrderId: razorpayOrder.id, summary };

  db.prepare(`
    INSERT INTO payment_sessions (id, idempotency_key, user_id, draft_json, amount, currency, status, expires_at, created_at)
    VALUES (?, ?, ?, ?, ?, 'INR', 'CREATED', ?, ?)
  `).run(sessionId, idempotencyKey || null, userId, JSON.stringify(draftPayload), totals.total, expiresAt, new Date().toISOString());

  res.status(201).json({
    sessionId,
    amount: totals.total,
    currency: 'INR',
    expiresAt,
    summary,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: credentials.keyId,
  });
});

// Dedicated Payment Gateway: Verify Payment & Finalize Booking (with Anti-Duplication Protection)
bookingRoutes.post('/payments/verify-and-book', requireAuth, async (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const { sessionId, razorpayOrderId, razorpayPaymentId, razorpaySignature, simulateFailure = false } = req.body ?? {};
  if (!sessionId) {
    res.status(400).json({ error: 'Payment session ID is required.' });
    return;
  }

  const session = db
    .prepare('SELECT * FROM payment_sessions WHERE id = ?')
    .get(String(sessionId)) as Record<string, any> | undefined;

  if (!session) {
    res.status(404).json({ error: 'Payment session not found or expired.' });
    return;
  }

  if (session.user_id !== userId) {
    res.status(403).json({ error: 'Payment session does not belong to authenticated user.' });
    return;
  }

  if (session.booking_id) {
    const b = db
      .prepare('SELECT id, booking_code, qr_token FROM bookings WHERE id = ?')
      .get(session.booking_id) as any;
    if (b) {
      const payment = db
        .prepare('SELECT transaction_ref FROM payments WHERE booking_id = ?')
        .get(b.id) as { transaction_ref: string } | undefined;
      res.json({
        verified: true,
        status: 'SUCCESS',
        duplicateDetected: true,
        bookingId: b.id,
        bookingCode: b.booking_code,
        qrToken: b.qr_token,
        transactionRef: payment?.transaction_ref ?? 'RAZORPAY-EXISTING',
      });
      return;
    }
  }

  if (razorpayPaymentId) {
    const existingPayment = db
      .prepare(`
        SELECT p.booking_id, b.booking_code, b.qr_token
        FROM payments p
        JOIN bookings b ON b.id = p.booking_id
        WHERE p.transaction_ref = ?
      `)
      .get(String(razorpayPaymentId)) as
      | { booking_id: string; booking_code: string; qr_token: string }
      | undefined;
    if (existingPayment) {
      res.json({
        verified: true,
        status: 'SUCCESS',
        duplicateDetected: true,
        bookingId: existingPayment.booking_id,
        bookingCode: existingPayment.booking_code,
        qrToken: existingPayment.qr_token,
        transactionRef: String(razorpayPaymentId),
      });
      return;
    }
  }

  if (Number(session.expires_at) < Date.now()) {
    res.status(400).json({ error: 'Payment session expired. Please re-select seats.' });
    return;
  }

  if (simulateFailure && process.env.NODE_ENV !== 'production') {
    db.prepare("UPDATE payment_sessions SET status = 'FAILED' WHERE id = ?").run(session.id);
    res.status(402).json({
      verified: false,
      status: 'FAILED',
      reason: 'Payment authorization was declined in the development test simulation.',
    });
    return;
  }

  const credentials = getRazorpayCredentials();
  if (!credentials) {
    res.status(503).json({ error: 'Razorpay is not configured on the server.' });
    return;
  }

  let draft: any = {};
  try {
    draft = JSON.parse(session.draft_json);
  } catch {
    res.status(400).json({ error: 'Corrupt payment session draft.' });
    return;
  }

  const expectedOrderId = String(draft.razorpayOrderId ?? '');
  const providedOrderId = String(razorpayOrderId ?? '');
  const paymentId = String(razorpayPaymentId ?? '');
  const signature = String(razorpaySignature ?? '');
  if (!expectedOrderId || providedOrderId !== expectedOrderId || !paymentId || !signature) {
    res.status(400).json({ error: 'Razorpay payment details do not match this checkout session.' });
    return;
  }

  if (!verifyRazorpaySignature(providedOrderId, paymentId, signature, credentials.keySecret)) {
    res.status(400).json({ error: 'Razorpay payment signature verification failed.' });
    return;
  }

  let payment: RazorpayPayment;
  try {
    payment = await razorpayRequest<RazorpayPayment>(
      `/payments/${encodeURIComponent(paymentId)}`,
      credentials,
      'GET'
    );
    if (
      payment.status === 'authorized' &&
      payment.order_id === expectedOrderId &&
      payment.amount === Math.round(Number(session.amount) * 100) &&
      payment.currency === String(session.currency)
    ) {
      payment = await razorpayRequest<RazorpayPayment>(
        `/payments/${encodeURIComponent(paymentId)}/capture`,
        credentials,
        'POST',
        { amount: payment.amount, currency: payment.currency }
      );
    }
  } catch (err) {
    res.status(502).json({ error: `Unable to verify or capture the Razorpay payment: ${(err as Error).message}` });
    return;
  }

  if (
    payment.order_id !== expectedOrderId ||
    payment.amount !== Math.round(Number(session.amount) * 100) ||
    payment.currency !== String(session.currency)
  ) {
    res.status(400).json({ error: 'Razorpay payment amount or order does not match this booking.' });
    return;
  }

  if (payment.status !== 'captured') {
    if (payment.status === 'created' || payment.status === 'authorized' || payment.status === 'pending') {
      db.prepare("UPDATE payment_sessions SET status = 'PENDING' WHERE id = ?").run(session.id);
      res.status(202).json({
        verified: false,
        status: 'PENDING',
        reason: 'Your payment is still being processed. Please wait before trying again.',
        code: 'PAYMENT_PENDING',
      });
      return;
    }
    res.status(402).json({
      verified: false,
      status: 'FAILED',
      reason: 'Razorpay has not captured this payment. Please try again or choose another payment method.',
    });
    return;
  }

  let result: CreateBookingResult;
  try {
    result = createBookingCore({
      ...draft,
      userId,
      paymentMethod: `RAZORPAY_${String(payment.method ?? 'PAYMENT').toUpperCase()}`,
      maskedReference: `Razorpay •••• ${payment.id.slice(-8)}`,
      transactionRef: payment.id,
    });
  } catch (err) {
    try {
      const refund = await razorpayRequest<{ id: string }>(
        `/payments/${encodeURIComponent(payment.id)}/refund`,
        credentials,
        'POST',
        { amount: payment.amount }
      );
      db.prepare("UPDATE payment_sessions SET status = 'FAILED' WHERE id = ?").run(session.id);
      res.status(409).json({
        verified: false,
        status: 'FAILED',
        reason: `Booking could not be completed. Razorpay refund ${refund.id} was initiated. ${(err as Error).message}`,
      });
    } catch (refundErr) {
      res.status(502).json({
        error: `Payment ${payment.id} was captured, but booking failed and the refund could not be initiated: ${(refundErr as Error).message}`,
      });
    }
    return;
  }

  db.prepare("UPDATE payment_sessions SET status = 'SUCCESS', booking_id = ? WHERE id = ?").run(
    result.bookingId,
    session.id
  );
  dispatchBookingConfirmationEmail(result.bookingId).catch(() => {});

  res.json({
    verified: true,
    status: 'SUCCESS',
    bookingId: result.bookingId,
    bookingCode: result.bookingCode,
    qrToken: result.qrToken,
    transactionRef: payment.id,
  });
});

// Get User's Bookings (Full Primary Bookings + Companion Shared Bookings using the EXACT SAME 1 BOOKING QR)
bookingRoutes.get('/bookings', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const user = db.prepare('SELECT mobile FROM users WHERE id = ?').get(userId) as { mobile: string } | undefined;

  const primaryBookings = db
    .prepare('SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC')
    .all(userId) as Record<string, string | number | null>[];

  const enrichedPrimary = primaryBookings.map((b) => {
    const seats = getBookingSeatCodes(String(b.id));
    const participants = db
      .prepare('SELECT id, user_id, name, mobile, relation, seat_code, role, verification_status FROM booking_participants WHERE booking_id = ?')
      .all(b.id);
    const companionAccess = db
      .prepare('SELECT id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at FROM companion_access WHERE booking_id = ? ORDER BY invited_at ASC')
      .all(b.id);
    const foodItems = db
      .prepare(`
        SELECT foi.name, foi.quantity, foi.unit_price, foi.total_price
        FROM food_order_items foi
        JOIN food_orders fo ON fo.id = foi.food_order_id
        WHERE fo.booking_id = ?
      `)
      .all(b.id);
    const refund = db
      .prepare('SELECT original_amount, cancellation_fee, refund_amount, status, created_at FROM refunds WHERE booking_id = ?')
      .get(b.id);

    return {
      ...b,
      seats,
      participants,
      companionAccess,
      foodItems,
      refund: refund ?? null,
    };
  });

  // Companion Bookings Shared With Me (EXACT SAME booking + EXACT SAME 1 QR; no payment info or cancel permission)
  const sharedRows = db
    .prepare(`
      SELECT
        ca.id AS access_id, ca.relation, ca.verification_status, ca.access_status,
        b.id AS booking_id, b.booking_code, b.movie_title, b.theatre_name, b.screen_name,
        b.show_date, b.show_time, b.format, b.status AS booking_status,
        b.qr_token, b.qr_status, b.scanned_at,
        u.name AS shared_by_name
      FROM companion_access ca
      JOIN bookings b ON b.id = ca.booking_id
      JOIN users u ON u.id = b.user_id
      WHERE b.user_id != ?
        AND (ca.companion_user_id = ? OR ca.companion_mobile = ?)
      ORDER BY b.created_at DESC
    `)
    .all(userId, userId, user?.mobile ?? '') as Record<string, string | number | null>[];

  const sharedWithMe = sharedRows.map((row) => {
    const allSeats = getBookingSeatCodes(String(row.booking_id));
    const foodSummary = db
      .prepare(`
        SELECT foi.name, foi.quantity
        FROM food_order_items foi
        JOIN food_orders fo ON fo.id = foi.food_order_id
        WHERE fo.booking_id = ?
      `)
      .all(row.booking_id);
    const companionList = db
      .prepare('SELECT companion_name, relation, verification_status FROM companion_access WHERE booking_id = ?')
      .all(row.booking_id);

    const isVerified = row.verification_status === 'VERIFIED';
    return {
      accessId: row.access_id,
      bookingId: row.booking_id,
      bookingCode: row.booking_code,
      movieTitle: row.movie_title,
      theatreName: row.theatre_name,
      screenName: row.screen_name,
      showDate: row.show_date,
      showTime: row.show_time,
      format: row.format,
      allSeats,
      seatCode: allSeats.join(', '),
      ticketCount: allSeats.length,
      sharedByName: row.shared_by_name,
      sharedWith: companionList,
      relation: row.relation,
      verificationStatus: row.verification_status,
      accessStatus: row.access_status,
      qrToken: isVerified ? row.qr_token : null,
      qrStatus: row.qr_status || 'ACTIVE',
      scannedAt: row.scanned_at ?? null,
      bookingStatus: row.booking_status,
      foodSummary,
      isPrimaryBooker: false,
    };
  });

  res.json({ primaryBookings: enrichedPrimary, sharedWithMe });
});

// Send Companion Verification OTP during checkout or post-booking
bookingRoutes.post('/companions/send-otp', requireAuth, (req: AuthenticatedRequest, res) => {
  const { mobile } = req.body ?? {};
  if (!isValidMobile(String(mobile ?? ''))) {
    res.status(400).json({ error: 'Enter a valid 10-digit companion mobile number.' });
    return;
  }
  const normalized = normalizeIndianMobile(String(mobile));
  const code = generateOtpCode();
  db.prepare(
    'INSERT INTO otp_codes (id, target, purpose, code_hash, expires_at, consumed) VALUES (?, ?, ?, ?, ?, 0)'
  ).run(`otp-${crypto.randomUUID().slice(0, 8)}`, normalized, 'COMPANION', hashOtp(code), Date.now() + 300000);

  res.json({
    sent: true,
    mobile: normalized,
    sandboxOtp: process.env.NODE_ENV === 'production' ? undefined : code,
  });
});

// Verify Companion Ownership OTP (either during checkout or on Shared With Me)
bookingRoutes.post('/companions/verify', requireAuth, (req: AuthenticatedRequest, res) => {
  const { mobile, otpCode, accessId, participantId } = req.body ?? {};
  if (!isValidMobile(String(mobile ?? ''))) {
    res.status(400).json({ error: 'Valid mobile number is required.' });
    return;
  }
  const normalized = normalizeIndianMobile(String(mobile));
  const otpRow = db
    .prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? AND consumed = 0 ORDER BY expires_at DESC LIMIT 1')
    .get(normalized, 'COMPANION') as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!otpRow || otpRow.expires_at < Date.now() || !verifyOtpHash(String(otpCode ?? ''), otpRow.code_hash)) {
    res.status(400).json({ error: 'Invalid or expired companion OTP.' });
    return;
  }
  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRow.id);

  const matchedUser = db.prepare('SELECT id FROM users WHERE mobile = ?').get(normalized) as { id: string } | undefined;
  const targetUserId = matchedUser?.id ?? req.auth!.userId;
  const now = new Date().toISOString();

  let affectedBookingId: string | null = null;
  if (accessId) {
    const caRow = db
      .prepare('SELECT booking_id FROM companion_access WHERE id = ?')
      .get(String(accessId)) as { booking_id: string } | undefined;
    affectedBookingId = caRow?.booking_id ?? null;
    db.prepare(`
      UPDATE companion_access
      SET verification_status = 'VERIFIED', access_status = 'VERIFIED', verified_at = ?, companion_user_id = COALESCE(companion_user_id, ?)
      WHERE id = ? AND companion_mobile = ?
    `).run(now, targetUserId, String(accessId), normalized);
  }
  if (participantId) {
    const bpRow = db
      .prepare('SELECT booking_id FROM booking_participants WHERE id = ?')
      .get(String(participantId)) as { booking_id: string } | undefined;
    affectedBookingId = affectedBookingId ?? bpRow?.booking_id ?? null;
    db.prepare(`
      UPDATE booking_participants
      SET verification_status = 'VERIFIED', verified_at = ?, user_id = COALESCE(user_id, ?)
      WHERE id = ? AND mobile = ?
    `).run(now, targetUserId, String(participantId), normalized);
  }

  db.prepare(`
    UPDATE companion_access
    SET verification_status = 'VERIFIED', access_status = 'VERIFIED', verified_at = ?, companion_user_id = COALESCE(companion_user_id, ?)
    WHERE companion_mobile = ? AND verification_status = 'PENDING'
  `).run(now, targetUserId, normalized);

  if (affectedBookingId) {
    publishToUsers(getBookingStakeholderUserIds(affectedBookingId), 'companion:connected', {
      bookingId: affectedBookingId,
      mobile: normalized,
    });
  }

  res.json({ verified: true, mobile: normalized });
});

// Primary Booker ONLY: Add a new Companion to an existing booking (shares SAME booking QR)
bookingRoutes.post('/bookings/:id/companions', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.auth!.userId) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can add companions to this booking.' });
    return;
  }
  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({ error: 'Cannot share a cancelled booking.' });
    return;
  }

  const { name, mobile, relation = 'Companion', verified = true } = req.body ?? {};
  if (!name || !isValidMobile(String(mobile ?? ''))) {
    res.status(400).json({ error: 'Valid companion name and 10-digit mobile number are required.' });
    return;
  }

  const normMobile = normalizeIndianMobile(String(mobile));
  const existing = db
    .prepare('SELECT id FROM companion_access WHERE booking_id = ? AND companion_mobile = ?')
    .get(String(booking.id), normMobile) as { id: string } | undefined;
  if (existing) {
    res.status(409).json({ error: 'This mobile number already has access to this booking.' });
    return;
  }

  const targetUser = db.prepare('SELECT id FROM users WHERE mobile = ?').get(normMobile) as { id: string } | undefined;
  const now = new Date().toISOString();
  const verStatus = verified ? 'VERIFIED' : 'PENDING';
  const accessId = `ca-${crypto.randomUUID().slice(0, 8)}`;
  const seats = getBookingSeatCodes(String(booking.id));

  db.prepare(`
    INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    accessId,
    String(booking.id),
    targetUser?.id ?? null,
    String(name).trim(),
    normMobile,
    String(relation),
    verStatus,
    verStatus === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
    now,
    verified ? now : null
  );

  db.prepare('UPDATE bookings SET is_family_booking = 1 WHERE id = ?').run(String(booking.id));

  if (targetUser) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, 'TICKET_SHARED', ?, ?, 0, ?)
    `).run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      targetUser.id,
      `Shared Booking Ready: ${booking.movie_title}`,
      `You now have booking access (${seats.join(', ')}) for ${booking.movie_title} at ${booking.theatre_name}.`,
      now
    );
  }

  publishToUsers(getBookingStakeholderUserIds(String(booking.id)), 'companion:connected', {
    bookingId: String(booking.id),
    accessId,
  });

  res.status(201).json({ added: true, accessId });
});

// Primary Booker ONLY: Remove a Companion from booking access
bookingRoutes.delete('/bookings/:id/companions/:accessId', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = db
    .prepare('SELECT id FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.auth!.userId) as { id: string } | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can remove companions from this booking.' });
    return;
  }

  const target = db
    .prepare('SELECT companion_user_id, companion_mobile FROM companion_access WHERE id = ? AND booking_id = ?')
    .get(req.params.accessId, booking.id) as { companion_user_id: string | null; companion_mobile: string } | undefined;

  if (!target) {
    res.status(404).json({ error: 'Companion access entry not found.' });
    return;
  }

  db.prepare('DELETE FROM companion_access WHERE id = ? AND booking_id = ?').run(req.params.accessId, booking.id);
  db.prepare("DELETE FROM booking_participants WHERE booking_id = ? AND mobile = ? AND role = 'COMPANION'")
    .run(booking.id, target.companion_mobile);

  publishToUsers([req.auth!.userId, target.companion_user_id], 'booking:updated', { bookingId: booking.id });
  res.json({ removed: true });
});

// Primary Booker ONLY: Update companion seat assignment
bookingRoutes.post('/bookings/:id/assign-companion', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.auth!.userId) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can manage companions for this booking.' });
    return;
  }

  const { participantId, name, mobile, relation = 'Companion', verified = true } = req.body ?? {};
  if (!name || !isValidMobile(String(mobile ?? ''))) {
    res.status(400).json({ error: 'Valid companion name and mobile number are required.' });
    return;
  }
  const normMobile = normalizeIndianMobile(String(mobile));
  const targetUser = db.prepare('SELECT id FROM users WHERE mobile = ?').get(normMobile) as { id: string } | undefined;
  const now = new Date().toISOString();
  const status = verified ? 'VERIFIED' : 'PENDING';

  db.prepare(`
    UPDATE booking_participants
    SET user_id = ?, name = ?, mobile = ?, relation = ?, role = 'COMPANION', verification_status = ?, invited_at = ?, verified_at = ?
    WHERE id = ? AND booking_id = ?
  `).run(targetUser?.id ?? null, String(name).trim(), normMobile, String(relation), status, now, verified ? now : null, String(participantId), String(booking.id));

  const existingCa = db
    .prepare('SELECT id FROM companion_access WHERE booking_id = ? AND companion_mobile = ?')
    .get(String(booking.id), normMobile);
  if (!existingCa) {
    db.prepare(`
      INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`ca-${crypto.randomUUID().slice(0, 8)}`, String(booking.id), targetUser?.id ?? null, String(name).trim(), normMobile, String(relation), status, status === 'VERIFIED' ? 'VERIFIED' : 'PENDING', now, verified ? now : null);
  }

  publishToUsers(getBookingStakeholderUserIds(String(booking.id)), 'booking:updated', { bookingId: String(booking.id) });
  res.json({ updated: true });
});

// Primary Booker ONLY: Transfer Booking Access to another verified mobile number (keeps ONE booking QR!)
bookingRoutes.post('/bookings/:id/transfer', requireAuth, (req: AuthenticatedRequest, res) => {
  const userId = req.auth!.userId;
  const user = db.prepare('SELECT mobile, name FROM users WHERE id = ?').get(userId) as { mobile: string; name: string } | undefined;
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, userId) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can transfer this booking.' });
    return;
  }
  if (booking.qr_status !== 'ACTIVE' || booking.status !== 'CONFIRMED') {
    res.status(400).json({ error: `Cannot transfer a booking with QR status ${booking.qr_status}.` });
    return;
  }

  const { recipientName, recipientMobile, otpCode } = req.body ?? {};
  if (!recipientName || !isValidMobile(String(recipientMobile ?? ''))) {
    res.status(400).json({ error: 'Valid recipient name and 10-digit mobile are required.' });
    return;
  }
  const normRecipient = normalizeIndianMobile(String(recipientMobile));

  const otpRow = db
    .prepare('SELECT * FROM otp_codes WHERE target = ? AND purpose = ? AND consumed = 0 ORDER BY expires_at DESC LIMIT 1')
    .get(normRecipient, 'TRANSFER') as { id: string; code_hash: string; expires_at: number } | undefined;

  if (!otpRow || otpRow.expires_at < Date.now() || !verifyOtpHash(String(otpCode ?? ''), otpRow.code_hash)) {
    res.status(400).json({ error: 'Invalid or expired transfer verification OTP.' });
    return;
  }

  db.prepare('UPDATE otp_codes SET consumed = 1 WHERE id = ?').run(otpRow.id);

  const recipientUser = db.prepare('SELECT id FROM users WHERE mobile = ?').get(normRecipient) as { id: string } | undefined;
  const now = new Date().toISOString();
  const rotatedQr = generateQrToken();

  db.prepare('UPDATE bookings SET qr_token = ? WHERE id = ?').run(rotatedQr, String(booking.id));

  const existingCa = db
    .prepare('SELECT id FROM companion_access WHERE booking_id = ? AND companion_mobile = ?')
    .get(String(booking.id), normRecipient) as { id: string } | undefined;

  if (!existingCa) {
    db.prepare(`
      INSERT INTO companion_access (id, booking_id, companion_user_id, companion_name, companion_mobile, relation, verification_status, access_status, invited_at, verified_at)
      VALUES (?, ?, ?, ?, ?, 'Transferred Access', 'VERIFIED', 'VERIFIED', ?, ?)
    `).run(`ca-${crypto.randomUUID().slice(0, 8)}`, String(booking.id), recipientUser?.id ?? null, String(recipientName).trim(), normRecipient, now, now);
  }

  db.prepare(`
    INSERT INTO audit_logs (id, actor_user_id, action, entity_type, entity_id, details_json, created_at)
    VALUES (?, ?, 'BOOKING_TRANSFERRED', 'BOOKING', ?, ?, ?)
  `).run(
    `aud-${crypto.randomUUID().slice(0, 8)}`,
    userId,
    String(booking.id),
    JSON.stringify({ from: user?.mobile, to: normRecipient }),
    now
  );

  if (recipientUser) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, 'TICKET_TRANSFERRED', ?, ?, 0, ?)
    `).run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      recipientUser.id,
      `Booking Access Received: ${booking.movie_title}`,
      `${user?.name ?? 'A user'} granted you verified booking QR access at ${booking.theatre_name}.`,
      now
    );
  }

  publishToUsers(getBookingStakeholderUserIds(String(booking.id)), 'booking:updated', { bookingId: String(booking.id) });
  res.json({ transferred: true, qrToken: rotatedQr });
});

// Add Food After Ticket Booking (Primary Booker Only!)
bookingRoutes.post('/bookings/:id/food', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.auth!.userId) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can modify food orders for this booking.' });
    return;
  }
  if (booking.status !== 'CONFIRMED') {
    res.status(400).json({ error: 'Cannot add food to a cancelled booking.' });
    return;
  }

  const { foodCart = [] } = req.body ?? {};
  if (!Array.isArray(foodCart) || foodCart.length === 0) {
    res.status(400).json({ error: 'Select at least one food item.' });
    return;
  }

  let subtotal = 0;
  const items: { id: string; name: string; qty: number; price: number }[] = [];
  for (const fc of foodCart) {
    const qty = Math.max(0, Number(fc.quantity ?? 0));
    if (qty <= 0) continue;
    const item = db
      .prepare('SELECT id, name, price, available FROM food_items WHERE id = ?')
      .get(String(fc.foodItemId ?? '')) as { id: string; name: string; price: number; available: number } | undefined;
    if (!item || !item.available) {
      res.status(400).json({ error: `Food item ${fc.foodItemId} unavailable.` });
      return;
    }
    subtotal += item.price * qty;
    items.push({ id: item.id, name: item.name, qty, price: item.price });
  }

  if (items.length === 0) {
    res.status(400).json({ error: 'No valid food items selected.' });
    return;
  }

  const taxes = Math.round(subtotal * 0.18);
  const total = subtotal + taxes;
  const now = new Date().toISOString();
  const foId = `fo-${crypto.randomUUID().slice(0, 8)}`;

  db.exec('BEGIN IMMEDIATE');
  db.prepare(`
    INSERT INTO food_orders (id, booking_id, user_id, subtotal, taxes, discount, total, status, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?, 'CONFIRMED', ?)
  `).run(foId, String(booking.id), req.auth!.userId, subtotal, taxes, total, now);

  const insertFoi = db.prepare(`
    INSERT INTO food_order_items (id, food_order_id, food_item_id, name, quantity, unit_price, total_price)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  for (const it of items) {
    insertFoi.run(`foi-${crypto.randomUUID().slice(0, 8)}`, foId, it.id, it.name, it.qty, it.price, it.price * it.qty);
  }

  db.prepare(`
    UPDATE bookings
    SET food_subtotal = food_subtotal + ?, taxes = taxes + ?, total_amount = total_amount + ?
    WHERE id = ?
  `).run(subtotal, taxes, total, String(booking.id));

  db.prepare(`
    INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
    VALUES (?, ?, 'FOOD_CONFIRMED', ?, ?, 0, ?)
  `).run(
    `notif-${crypto.randomUUID().slice(0, 8)}`,
    req.auth!.userId,
    `Food Pre-Order Added (${booking.booking_code})`,
    `Added ₹${total} snacks & beverages to your ${booking.movie_title} booking.`,
    now
  );
  db.exec('COMMIT');

  publishToUsers(getBookingStakeholderUserIds(String(booking.id)), 'booking:updated', { bookingId: String(booking.id) });
  res.status(201).json({ added: true, total });
});

// Cancel Booking & Process Refund (Primary Booker Only!)
bookingRoutes.post('/bookings/:id/cancel', requireAuth, (req: AuthenticatedRequest, res) => {
  const booking = db
    .prepare('SELECT * FROM bookings WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.auth!.userId) as Record<string, string | number | null> | undefined;

  if (!booking) {
    res.status(403).json({ error: 'Only the primary booker can cancel this booking.' });
    return;
  }
  if (booking.status === 'CANCELLED') {
    res.status(400).json({ error: 'This booking is already cancelled.' });
    return;
  }

  const freeHoursRow = db.prepare("SELECT value FROM platform_settings WHERE key = 'free_cancel_hours'").get() as { value: string } | undefined;
  const partialPctRow = db.prepare("SELECT value FROM platform_settings WHERE key = 'partial_refund_pct'").get() as { value: string } | undefined;

  const hoursUntil = Number(req.body?.hoursUntilShow ?? 6);
  const refundCalc = calculateRefundAmount(Number(booking.total_amount), hoursUntil, {
    freeCancelHours: Number(freeHoursRow?.value ?? 4),
    partialRefundPct: Number(partialPctRow?.value ?? 60),
  });

  if (!refundCalc.eligible) {
    res.status(400).json({
      error: 'Cancellation window has closed (less than 1 hour before showtime).',
    });
    return;
  }

  const now = new Date().toISOString();
  const refundId = `ref-${crypto.randomUUID().slice(0, 8)}`;
  const stakeholders = getBookingStakeholderUserIds(String(booking.id));

  db.exec('BEGIN IMMEDIATE');
  db.prepare("UPDATE bookings SET status = 'CANCELLED', qr_status = 'CANCELLED' WHERE id = ?").run(String(booking.id));
  db.prepare("UPDATE show_seats SET status = 'AVAILABLE', booking_id = NULL WHERE booking_id = ?").run(String(booking.id));

  db.prepare(`
    INSERT INTO refunds (id, booking_id, user_id, original_amount, cancellation_fee, refund_amount, reason, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'PROCESSED', ?)
  `).run(
    refundId,
    String(booking.id),
    req.auth!.userId,
    refundCalc.originalAmount,
    refundCalc.cancellationFee,
    refundCalc.refundAmount,
    String(req.body?.reason ?? 'User requested cancellation'),
    now
  );

  for (const uid of stakeholders) {
    db.prepare(`
      INSERT INTO notifications (id, user_id, type, title, message, is_read, created_at)
      VALUES (?, ?, 'REFUND_PROCESSED', ?, ?, 0, ?)
    `).run(
      `notif-${crypto.randomUUID().slice(0, 8)}`,
      uid,
      uid === req.auth!.userId ? 'Booking Cancelled & Refund Processed' : `Shared Booking Cancelled (${booking.booking_code})`,
      uid === req.auth!.userId
        ? `Refund of ₹${refundCalc.refundAmount} initiated for booking ${booking.booking_code}.`
        : `${booking.movie_title} (${booking.booking_code}) was cancelled by the primary booker.`,
      now
    );
  }
  db.exec('COMMIT');

  if (booking.show_id) {
    publishToShow(String(booking.show_id), 'seats:updated', { showId: String(booking.show_id) });
  }
  publishToUsers(stakeholders, 'booking:updated', { bookingId: String(booking.id), status: 'CANCELLED' });
  publishToAdmins('booking:updated', { bookingId: String(booking.id), status: 'CANCELLED' });

  res.json({ cancelled: true, refund: refundCalc });
});

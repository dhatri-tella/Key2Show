import test from 'node:test';
import assert from 'node:assert/strict';
import { MOVIES } from '../data/movies';
import { THEATRES } from '../data/theatres';
import { LIVE_EVENTS } from '../data/events';
import {
  filterMovies,
  filterTheatres,
  filterEvents,
  calculateBookingTotal,
  calculateDetailedBookingTotal,
  validateCouponRule,
  calculateRefundAmount,
  generateTicketCode,
  normalizeIndianMobile,
  isValidMobile,
  normalizeQrGateStatus,
  markQrTicketAsUsed,
  markBookingQrAsUsed,
  resolveSingleBookingQr,
  canCancelBooking,
  canManageCompanions,
  canModifyFood,
  type CouponRule,
} from './bookingLogic';

test('filterMovies returns 6 featured movies by default and full list when showAll is true', () => {
  const featured = filterMovies(MOVIES, '', false);
  assert.equal(featured.length, 6);
  const all = filterMovies(MOVIES, '', true);
  assert.equal(all.length, MOVIES.length);
});

test('filterMovies matches title, cast, and genre case-insensitively', () => {
  const byTitle = filterMovies(MOVIES, 'kalki', false);
  assert.equal(byTitle.length, 1);
  assert.equal(byTitle[0].id, 'kalki-2898');

  const byCast = filterMovies(MOVIES, 'allu arjun', false);
  assert.equal(byCast.length, 1);
  assert.equal(byCast[0].id, 'pushpa-2');
});

test('filterTheatres returns 5 Hyderabad featured venues by default and switches on city change', () => {
  const hyd = filterTheatres(THEATRES, 'Hyderabad', '', false);
  assert.equal(hyd.length, 5);
  assert.equal(hyd[0].name, 'PVR Next Galleria');

  const blr = filterTheatres(THEATRES, 'Bengaluru', '', false);
  assert.ok(blr.length >= 2);
  assert.ok(blr.every((t) => t.city === 'Bengaluru'));
});

test('filterEvents narrows correctly by category and query', () => {
  const concerts = filterEvents(LIVE_EVENTS, 'Concerts', '');
  assert.ok(concerts.length >= 2);
  assert.ok(concerts.every((e) => e.category === 'Concerts'));

  const zakir = filterEvents(LIVE_EVENTS, 'Comedy Shows', 'Zakir');
  assert.equal(zakir.length, 1);
  assert.equal(zakir[0].id, 'zakir-khan-tathastu');
});

test('validateCouponRule enforces active flag, expiry, minimum amount, and max discount cap', () => {
  const activeFlat: CouponRule = {
    code: 'KEY2SHOW100',
    discountType: 'FLAT',
    discountValue: 100,
    minAmount: 400,
    maxDiscount: 100,
    expiryDate: '2027-12-31',
    active: true,
  };
  assert.equal(validateCouponRule(undefined, 500).valid, false);
  assert.equal(validateCouponRule(activeFlat, 300, { todayIso: '2026-11-22' }).valid, false);
  assert.deepEqual(validateCouponRule(activeFlat, 600, { todayIso: '2026-11-22' }), {
    valid: true,
    discount: 100,
  });

  const expired: CouponRule = { ...activeFlat, expiryDate: '2025-01-01' };
  const expiredRes = validateCouponRule(expired, 600, { todayIso: '2026-11-22' });
  assert.equal(expiredRes.valid, false);
  assert.match(expiredRes.reason ?? '', /expired/i);
});

test('calculateDetailedBookingTotal includes seats, food, fees, taxes, and discounts', () => {
  const res = calculateDetailedBookingTotal({
    seatPrices: [350, 350],
    foodTotal: 300,
    discount: 100,
  });
  assert.equal(res.seatsSubtotal, 700);
  assert.equal(res.foodSubtotal, 300);
  assert.equal(res.subtotal, 1000);
  assert.equal(res.convenienceFee, 56);
  assert.equal(res.taxes, Math.round((56 + 300) * 0.18));
  assert.equal(res.total, 1000 + 56 + res.taxes - 100);
});

test('calculateRefundAmount applies full, partial, and non-refundable tiers', () => {
  assert.equal(calculateRefundAmount(1000, 6).tier, 'FULL');
  assert.equal(calculateRefundAmount(1000, 6).refundAmount, 1000);

  const partial = calculateRefundAmount(1000, 2);
  assert.equal(partial.tier, 'PARTIAL');
  assert.equal(partial.refundAmount, 600);
  assert.equal(partial.cancellationFee, 400);

  const none = calculateRefundAmount(1000, 0.5);
  assert.equal(none.eligible, false);
  assert.equal(none.refundAmount, 0);
});

test('calculateBookingTotal & generateTicketCode remain backward compatible', () => {
  const discounted = calculateBookingTotal(['C4', 'C5'], 250, 'key2show100');
  assert.equal(discounted.discount, 100);
  assert.equal(discounted.total, 440);
  const code = generateTicketCode('pushpa-2', 'prasads-imax', ['D4', 'D5']);
  assert.match(code, /^K2S-PUS-PRA-D4-\d+$/);
});

test('mobile validation and normalization format Indian numbers cleanly', () => {
  assert.equal(isValidMobile('9848011111'), true);
  assert.equal(isValidMobile('+91 98480 11111'), true);
  assert.equal(isValidMobile('12345'), false);
  assert.equal(normalizeIndianMobile('9848011111'), '+91 98480 11111');
});

test('QR gate helpers normalize statuses and transition Active tickets to Used', () => {
  assert.equal(normalizeQrGateStatus('ACTIVE'), 'Active');
  assert.equal(normalizeQrGateStatus('used'), 'Used');
  assert.equal(normalizeQrGateStatus('CANCELLED'), 'Cancelled');

  const sample: { qrToken: string; status: 'Active' | 'Used' | 'Cancelled'; scannedAt?: string }[] = [
    { qrToken: 'K2SQ-111', status: 'Active' },
    { qrToken: 'K2SQ-222', status: 'Cancelled' },
  ];
  const updated = markQrTicketAsUsed(sample, 'k2sq-111', '2026-11-22T18:00:00Z');
  assert.equal(updated[0].status, 'Used');
  assert.equal(updated[0].scannedAt, '2026-11-22T18:00:00Z');
  assert.equal(updated[1].status, 'Cancelled');
});

test('ONE BOOKING = ONE QR CODE sharing and companion permission boundaries', () => {
  const bookingQr = 'K2SQ-FAMILY-001';
  // Primary always sees the single booking QR
  assert.equal(resolveSingleBookingQr(bookingQr, true, 'PENDING'), bookingQr);
  // Verified companion sees the EXACT SAME booking QR
  assert.equal(resolveSingleBookingQr(bookingQr, false, 'VERIFIED'), bookingQr);
  // Unverified companion cannot view the QR until OTP verified
  assert.equal(resolveSingleBookingQr(bookingQr, false, 'PENDING'), null);

  // Primary-only guards block companions from cancelling, modifying food, or removing companions
  assert.equal(canCancelBooking('user-father', 'user-father', 'CONFIRMED'), true);
  assert.equal(canCancelBooking('user-mother', 'user-father', 'CONFIRMED'), false);
  assert.equal(canManageCompanions('user-mother', 'user-father', 'CONFIRMED'), false);
  assert.equal(canModifyFood('user-mother', 'user-father', 'CONFIRMED'), false);

  // Marking the ONE booking QR as used transitions the entire booking
  const scanned = markBookingQrAsUsed(
    { qrToken: bookingQr, qrStatus: 'Active' as const },
    'k2sq-family-001',
    '2026-11-22T19:30:00Z'
  );
  assert.equal(scanned.qrStatus, 'Used');
});


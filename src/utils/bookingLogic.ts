import type { Movie } from '../data/movies';
import type { Theatre } from '../data/theatres';
import type { LiveEvent } from '../data/events';

export type CategoryFilter =
  | 'Movies'
  | 'Events'
  | 'Theatres'
  | 'Concerts'
  | 'Comedy Shows'
  | 'Sports'
  | 'Arts & Culture'
  | 'More';

export type SeatCategory = 'STANDARD' | 'PREMIUM' | 'RECLINER' | 'COUPLE' | 'DISABLED';

export interface CouponRule {
  code: string;
  discountType: 'PERCENT' | 'FLAT';
  discountValue: number;
  minAmount: number;
  maxDiscount: number;
  expiryDate: string; // YYYY-MM-DD
  applicableMovieId?: string | null;
  applicableTheatreId?: string | null;
  active: boolean;
}

export interface CouponValidationResult {
  valid: boolean;
  discount: number;
  reason?: string;
}

export interface CancellationPolicy {
  freeCancelHours: number;
  partialRefundPct: number;
}

export interface RefundCalculation {
  eligible: boolean;
  tier: 'FULL' | 'PARTIAL' | 'NONE';
  originalAmount: number;
  cancellationFee: number;
  refundAmount: number;
}

export function filterMovies(movies: Movie[], query: string, showAll: boolean): Movie[] {
  const q = query.trim().toLowerCase();
  const base = showAll || q.length > 0 ? movies : movies.filter((m) => m.featured);
  if (!q) return base;
  return base.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      m.genre.some((g) => g.toLowerCase().includes(q)) ||
      m.language.toLowerCase().includes(q) ||
      m.cast.some((c) => c.toLowerCase().includes(q))
  );
}

export function filterTheatres(
  theatres: Theatre[],
  city: string,
  query: string,
  showAll: boolean
): Theatre[] {
  const q = query.trim().toLowerCase();
  const cityMatches = theatres.filter(
    (t) => t.city.toLowerCase() === city.toLowerCase()
  );
  const pool = cityMatches.length > 0 ? cityMatches : theatres;

  const searched = q
    ? theatres.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.city.toLowerCase().includes(q) ||
          t.formats.some((f) => f.toLowerCase().includes(q))
      )
    : pool;

  if (showAll || q.length > 0) return searched;
  const featured = searched.filter((t) => t.featured);
  return featured.length > 0 ? featured.slice(0, 5) : searched.slice(0, 5);
}

export function filterEvents(
  events: LiveEvent[],
  category: CategoryFilter,
  query: string
): LiveEvent[] {
  const q = query.trim().toLowerCase();
  return events.filter((ev) => {
    const categoryOk =
      category === 'Events' ||
      category === 'Movies' ||
      category === 'Theatres' ||
      category === 'More'
        ? true
        : ev.category === category;

    if (!categoryOk) return false;
    if (!q) return true;
    return (
      ev.title.toLowerCase().includes(q) ||
      ev.category.toLowerCase().includes(q) ||
      ev.venue.toLowerCase().includes(q) ||
      ev.city.toLowerCase().includes(q)
    );
  });
}

export function validateCouponRule(
  coupon: CouponRule | undefined,
  subtotal: number,
  options: { movieId?: string; theatreId?: string; todayIso?: string } = {}
): CouponValidationResult {
  if (!coupon) {
    return { valid: false, discount: 0, reason: 'Coupon code not recognized.' };
  }
  if (!coupon.active) {
    return { valid: false, discount: 0, reason: 'This coupon is currently inactive.' };
  }
  const today = options.todayIso ?? new Date().toISOString().slice(0, 10);
  if (coupon.expiryDate < today) {
    return { valid: false, discount: 0, reason: `Coupon ${coupon.code} has expired.` };
  }
  if (subtotal < coupon.minAmount) {
    return {
      valid: false,
      discount: 0,
      reason: `Minimum booking amount of ₹${coupon.minAmount} required for ${coupon.code}.`,
    };
  }
  if (
    coupon.applicableMovieId &&
    options.movieId &&
    coupon.applicableMovieId !== options.movieId
  ) {
    return {
      valid: false,
      discount: 0,
      reason: `Coupon ${coupon.code} is not valid for the selected movie.`,
    };
  }
  if (
    coupon.applicableTheatreId &&
    options.theatreId &&
    coupon.applicableTheatreId !== options.theatreId
  ) {
    return {
      valid: false,
      discount: 0,
      reason: `Coupon ${coupon.code} is not valid at this theatre.`,
    };
  }

  let rawDiscount =
    coupon.discountType === 'FLAT'
      ? coupon.discountValue
      : Math.round((subtotal * coupon.discountValue) / 100);

  if (coupon.maxDiscount > 0) {
    rawDiscount = Math.min(rawDiscount, coupon.maxDiscount);
  }
  const discount = Math.min(subtotal, Math.max(0, rawDiscount));

  return { valid: true, discount };
}

export interface BookingPriceSummary {
  seatCount: number;
  seatsSubtotal: number;
  foodSubtotal: number;
  subtotal: number;
  convenienceFee: number;
  taxes: number;
  discount: number;
  total: number;
}

export function calculateDetailedBookingTotal(params: {
  seatPrices: number[];
  foodTotal?: number;
  discount?: number;
  convenienceRate?: number;
  taxRate?: number;
}): BookingPriceSummary {
  const seatCount = params.seatPrices.length;
  const seatsSubtotal = params.seatPrices.reduce((sum, p) => sum + p, 0);
  const foodSubtotal = Math.max(0, Math.round(params.foodTotal ?? 0));
  const subtotal = seatsSubtotal + foodSubtotal;
  const convenienceFee =
    subtotal > 0 ? Math.round(seatsSubtotal * (params.convenienceRate ?? 0.08)) : 0;
  const taxes = subtotal > 0 ? Math.round((convenienceFee + foodSubtotal) * (params.taxRate ?? 0.18)) : 0;
  const discount = Math.min(subtotal, Math.max(0, Math.round(params.discount ?? 0)));
  const total = Math.max(0, subtotal + convenienceFee + taxes - discount);

  return {
    seatCount,
    seatsSubtotal,
    foodSubtotal,
    subtotal,
    convenienceFee,
    taxes,
    discount,
    total,
  };
}

export function calculateBookingTotal(
  selectedSeats: string[],
  basePrice: number,
  promoCode = ''
): BookingPriceSummary & { convenienceFee: number } {
  const seatPrices = selectedSeats.map(() => basePrice);
  const seatsSubtotal = seatPrices.reduce((s, p) => s + p, 0);
  const code = promoCode.trim().toUpperCase();
  const discount =
    selectedSeats.length > 0 && code === 'KEY2SHOW100'
      ? Math.min(100, seatsSubtotal)
      : selectedSeats.length > 0 && code === 'FIRST20'
        ? Math.round(seatsSubtotal * 0.2)
        : 0;

  const convenienceFee = selectedSeats.length > 0 ? Math.round(seatsSubtotal * 0.08) : 0;
  return {
    seatCount: selectedSeats.length,
    seatsSubtotal,
    foodSubtotal: 0,
    subtotal: seatsSubtotal,
    convenienceFee,
    taxes: 0,
    discount,
    total: Math.max(0, seatsSubtotal + convenienceFee - discount),
  };
}

export function calculateRefundAmount(
  originalAmount: number,
  hoursUntilShow: number,
  policy: CancellationPolicy = { freeCancelHours: 4, partialRefundPct: 60 }
): RefundCalculation {
  if (hoursUntilShow >= policy.freeCancelHours) {
    return {
      eligible: true,
      tier: 'FULL',
      originalAmount,
      cancellationFee: 0,
      refundAmount: originalAmount,
    };
  }
  if (hoursUntilShow >= 1) {
    const refundAmount = Math.round((originalAmount * policy.partialRefundPct) / 100);
    return {
      eligible: true,
      tier: 'PARTIAL',
      originalAmount,
      cancellationFee: Math.max(0, originalAmount - refundAmount),
      refundAmount,
    };
  }
  return {
    eligible: false,
    tier: 'NONE',
    originalAmount,
    cancellationFee: originalAmount,
    refundAmount: 0,
  };
}

export function generateTicketCode(
  itemId: string,
  venueId: string,
  seats: string[]
): string {
  const prefix = itemId.slice(0, 3).toUpperCase();
  const venue = venueId.slice(0, 3).toUpperCase();
  const seatToken = seats.length > 0 ? seats[0] : 'GA';
  const hash = Array.from(`${itemId}:${venueId}:${seats.join(',')}`).reduce(
    (acc, ch) => ((acc * 31 + ch.charCodeAt(0)) % 9000) + 1000,
    1337
  );
  return `K2S-${prefix}-${venue}-${seatToken}-${hash}`;
}

export function normalizeIndianMobile(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  if (digits.length === 12 && digits.startsWith('91')) {
    const ten = digits.slice(2);
    return `+91 ${ten.slice(0, 5)} ${ten.slice(5)}`;
  }
  return input.trim();
}

export function isValidMobile(input: string): boolean {
  const digits = input.replace(/\D/g, '');
  return digits.length === 10 || (digits.length === 12 && digits.startsWith('91'));
}

export type QrGateTicketStatus = 'Active' | 'Used' | 'Cancelled';

export function normalizeQrGateStatus(raw: unknown): QrGateTicketStatus {
  const upper = String(raw ?? 'ACTIVE').toUpperCase();
  if (upper === 'USED') return 'Used';
  if (upper === 'CANCELLED') return 'Cancelled';
  return 'Active';
}

export function markQrTicketAsUsed<T extends { qrToken: string; status: QrGateTicketStatus; scannedAt?: string }>(
  tickets: T[],
  qrToken: string,
  scannedAtIso: string
): T[] {
  const needle = qrToken.trim().toUpperCase();
  return tickets.map((item) =>
    item.qrToken.toUpperCase() === needle && item.status === 'Active'
      ? { ...item, status: 'Used', scannedAt: scannedAtIso }
      : item
  );
}

export function markBookingQrAsUsed<T extends { qrToken: string; qrStatus: QrGateTicketStatus; scannedAt?: string }>(
  booking: T,
  qrToken: string,
  scannedAtIso: string
): T {
  const needle = qrToken.trim().toUpperCase();
  if (booking.qrToken.toUpperCase() === needle && booking.qrStatus === 'Active') {
    return { ...booking, qrStatus: 'Used', scannedAt: scannedAtIso };
  }
  return booking;
}

export function resolveSingleBookingQr(
  bookingQrToken: string | null | undefined,
  viewerIsPrimary: boolean,
  companionVerificationStatus: 'VERIFIED' | 'PENDING'
): string | null {
  if (!bookingQrToken) return null;
  if (viewerIsPrimary) return bookingQrToken;
  return companionVerificationStatus === 'VERIFIED' ? bookingQrToken : null;
}

export function canCancelBooking(viewerUserId: string, bookingOwnerUserId: string, status: string): boolean {
  return viewerUserId === bookingOwnerUserId && status === 'CONFIRMED';
}

export function canManageCompanions(viewerUserId: string, bookingOwnerUserId: string, status: string): boolean {
  return viewerUserId === bookingOwnerUserId && status === 'CONFIRMED';
}

export function canModifyFood(viewerUserId: string, bookingOwnerUserId: string, status: string): boolean {
  return viewerUserId === bookingOwnerUserId && status === 'CONFIRMED';
}



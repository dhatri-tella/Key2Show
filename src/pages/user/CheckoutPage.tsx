import React, { useEffect, useMemo, useState } from 'react';
import {
  Clock,
  ShieldCheck,
  Tag,
  AlertTriangle,
  Users,
  UtensilsCrossed,
  QrCode,
  Lock,
} from 'lucide-react';
import { api } from '../../utils/api';
import { calculateDetailedBookingTotal } from '../../utils/bookingLogic';
import type { CheckoutDraft, OfferItem, PaymentSession, SafeUser } from '../../types/platform';

interface CheckoutPageProps {
  draft: CheckoutDraft;
  offers: OfferItem[];
  currentUser: SafeUser | null;
  onEditFood: () => void;
  onEditCompanions: () => void;
  onProceedToPayment: (updatedDraft: CheckoutDraft, session: PaymentSession) => void;
  onBack: () => void;
  onRequireLogin: () => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  draft,
  offers,
  currentUser,
  onEditFood,
  onEditCompanions,
  onProceedToPayment,
  onBack,
  onRequireLogin,
}) => {
  const [remainingSec, setRemainingSec] = useState<number>(() =>
    draft.lockExpiresAt ? Math.max(0, Math.floor((draft.lockExpiresAt - Date.now()) / 1000)) : 600
  );

  useEffect(() => {
    if (!draft.lockExpiresAt) return;
    const timer = window.setInterval(() => {
      const secs = Math.max(0, Math.floor((draft.lockExpiresAt! - Date.now()) / 1000));
      setRemainingSec(secs);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [draft.lockExpiresAt]);

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMsg, setCouponMsg] = useState('');

  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  const foodTotal = draft.foodCart.reduce((s, f) => s + f.price * f.quantity, 0);
  const seatPrices = draft.selectedSeats.map((s) => s.price);

  const pricing = useMemo(
    () =>
      calculateDetailedBookingTotal({
        seatPrices,
        foodTotal,
        discount: couponDiscount,
        convenienceRate: draft.kind === 'EVENT' ? 0.06 : 0.08,
        taxRate: 0.18,
      }),
    [seatPrices, foodTotal, couponDiscount, draft.kind]
  );

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponMsg('');
    try {
      const res = await api.validateCoupon({
        code,
        subtotal: pricing.subtotal,
        movieId: draft.movie?.id,
        theatreId: draft.theatre?.id,
      });
      setAppliedCoupon(code);
      setCouponInput(code);
      setCouponDiscount(res.discount);
      setCouponMsg(`Applied ${code}: Saved ₹${res.discount}!`);
    } catch (err) {
      setAppliedCoupon('');
      setCouponDiscount(0);
      setCouponMsg((err as Error).message);
    }
  };

  const handleProceedToPayment = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (draft.kind === 'MOVIE' && draft.lockExpiresAt && remainingSec <= 0) {
      setError('Your 10-minute seat reservation expired. Please re-select seats.');
      return;
    }

    setPaying(true);
    setError('');
    try {
      const activeCompanions = (draft.companions ?? []).filter((c) => c.mobile.trim().length >= 10);
      const updatedDraft: CheckoutDraft = {
        ...draft,
        companions: activeCompanions,
        couponCode: appliedCoupon,
        isFamilyBooking: activeCompanions.length > 0,
      };

      const sessionRes = await api.createPaymentSession({ draft: updatedDraft });
      const newSession: PaymentSession = {
        sessionId: sessionRes.sessionId,
        amount: sessionRes.amount,
        currency: sessionRes.currency,
        expiresAt: sessionRes.expiresAt,
        summary: sessionRes.summary,
        razorpayOrderId: sessionRes.razorpayOrderId,
        razorpayKeyId: sessionRes.razorpayKeyId,
      };

      onProceedToPayment(updatedDraft, newSession);
    } catch (err) {
      setError((err as Error).message || 'Failed to initialize payment gateway.');
    } finally {
      setPaying(false);
    }
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');

  return (
    <div className="max-w-[1040px] mx-auto px-4 lg:px-8 py-5 pb-32 sm:pb-10 space-y-5">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <span className="text-emerald-400">1. Seats</span>
        <span>→</span>
        <span className="text-emerald-400">2. Food</span>
        <span>→</span>
        <span className="text-emerald-400">3. Companions</span>
        <span>→</span>
        <span className="text-[#FF3B42]">4. Checkout</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="text-xs font-semibold text-white/70 hover:text-white cursor-pointer"
          >
            ← Back to Previous Step
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
            Review &amp; Pay
          </h1>
        </div>

        {draft.kind === 'MOVIE' && draft.lockExpiresAt && (
          <div
            className={`px-4 py-2 rounded-full border text-xs font-bold flex items-center gap-2 tabular-nums ${
              remainingSec > 0
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                : 'bg-[#2a1014] border-[#FF242C] text-[#FF8A8F]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>
              {remainingSec > 0
                ? `Seats held for ${mm}:${ss}`
                : 'Reservation expired — please re-select seats'}
            </span>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/60 px-4 py-3 text-xs text-[#FF9296] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Clean Summary + Payment Method */}
        <div className="lg:col-span-7 space-y-4">
          {/* Compact Booking Overview Card */}
          <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase text-[#FF3B42]">
                  {draft.kind === 'EVENT' ? 'Live Event Pass' : 'Movie Booking'}
                </p>
                <h2 className="font-display text-xl font-extrabold text-white mt-0.5">
                  {draft.kind === 'EVENT'
                    ? draft.event?.title
                    : draft.movie?.title ?? String(draft.show?.movie_title ?? '')}
                </h2>
                <p className="text-xs text-white/65 mt-1">
                  {draft.kind === 'EVENT'
                    ? `${draft.event?.venue} · ${draft.eventTierName}`
                    : `${draft.theatre?.name ?? draft.show?.theatre_name} · ${draft.show?.show_date} · ${draft.show?.show_time}`}
                </p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">
                <QrCode className="w-3.5 h-3.5" /> 1 Booking QR
              </span>
            </div>

            <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-white/70">
                Seats ({draft.selectedSeats.length}):{' '}
                <strong className="text-white">
                  {draft.selectedSeats.map((s) => s.seatCode).join(', ')}
                </strong>
              </span>
            </div>

            {/* Food summary link */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-white/75">
                <UtensilsCrossed className="w-4 h-4 text-[#FF252E]" />
                <span>
                  {draft.foodCart.length > 0
                    ? draft.foodCart.map((f) => `${f.name} × ${f.quantity}`).join(', ')
                    : 'No snacks pre-ordered'}
                </span>
              </div>
              {draft.kind === 'MOVIE' && (
                <button
                  type="button"
                  onClick={onEditFood}
                  className="text-[#FF4A52] font-bold hover:underline cursor-pointer shrink-0"
                >
                  Edit Food
                </button>
              )}
            </div>

            {/* Companions summary link */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-white/75">
                <Users className="w-4 h-4 text-[#FF252E]" />
                <span>
                  {(draft.companions?.length ?? 0) > 0
                    ? `Shared with: ${draft.companions.map((c) => `${c.name || c.mobile} (${c.relation})`).join(', ')}`
                    : 'Solo booker access'}
                </span>
              </div>
              <button
                type="button"
                onClick={onEditCompanions}
                className="text-[#FF4A52] font-bold hover:underline cursor-pointer shrink-0"
              >
                Edit Companions
              </button>
            </div>
          </section>

          {/* Payment Method Selection */}
          <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
            <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#FF252E]" />
              <span>Secure Payment</span>
            </h2>
            <p className="text-sm text-white/65 leading-relaxed">
              You’ll complete payment in Razorpay’s secure checkout after confirming your booking. Available payment methods depend on your Razorpay account.
            </p>
          </section>
        </div>

        {/* Right: Coupons & Final Price Breakdown */}
        <aside className="lg:col-span-5 rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4 sticky top-20">
          {/* Coupon Input */}
          <div className="space-y-2">
            <p className="text-xs font-bold text-white flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Promo Code</span>
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="KEY2SHOW100"
                className="flex-1 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white uppercase min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => handleApplyCoupon()}
                className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
              >
                Apply
              </button>
            </div>
            {couponMsg && (
              <p className={`text-[11px] ${couponDiscount > 0 ? 'text-emerald-300' : 'text-[#FF8A8F]'}`}>
                {couponMsg}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              {offers.slice(0, 3).map((off) => (
                <button
                  key={off.id}
                  type="button"
                  onClick={() => handleApplyCoupon(off.code)}
                  className="px-2.5 py-1 rounded-lg bg-white/8 hover:bg-white/15 text-[10.5px] font-mono text-white/85 cursor-pointer"
                >
                  {off.code}
                </button>
              ))}
            </div>
          </div>

          {/* Price Breakdown */}
          <div className="pt-3 border-t border-white/10 space-y-2 text-xs">
            <div className="flex justify-between text-white/75">
              <span>Tickets ({pricing.seatCount})</span>
              <span className="tabular-nums">₹{pricing.seatsSubtotal}</span>
            </div>
            {pricing.foodSubtotal > 0 && (
              <div className="flex justify-between text-white/75">
                <span>Food &amp; Beverages</span>
                <span className="tabular-nums">₹{pricing.foodSubtotal}</span>
              </div>
            )}
            <div className="flex justify-between text-white/75">
              <span>Convenience Fee</span>
              <span className="tabular-nums">₹{pricing.convenienceFee}</span>
            </div>
            <div className="flex justify-between text-white/75">
              <span>Taxes (GST)</span>
              <span className="tabular-nums">₹{pricing.taxes}</span>
            </div>
            {pricing.discount > 0 && (
              <div className="flex justify-between text-emerald-300 font-semibold">
                <span>Coupon Discount ({appliedCoupon})</span>
                <span className="tabular-nums">-₹{pricing.discount}</span>
              </div>
            )}
            <div className="pt-2 border-t border-white/10 flex justify-between text-base font-extrabold text-white">
              <span>Total Payable</span>
              <span className="tabular-nums">₹{pricing.total}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={paying}
            onClick={handleProceedToPayment}
            className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold shadow-[0_6px_22px_rgba(229,9,20,0.45)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 min-h-[48px]"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {paying
                ? 'Connecting to Payment Gateway...'
                : `Confirm Booking & Proceed to Payment · ₹${pricing.total}`}
            </span>
          </button>
        </aside>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  Ticket,
  Users,
  Send,
  UtensilsCrossed,
  XCircle,
  CheckCircle2,
  ShieldAlert,
  UserPlus,
  ArrowRightLeft,
  Download,
  CalendarPlus,
  CreditCard,
  QrCode,
  Trash2,
  X,
} from 'lucide-react';
import { api } from '../../utils/api';
import { QrCodeView } from '../../components/QrCodeView';
import type {
  FoodItem,
  PrimaryBooking,
  SafeUser,
  SharedTicketItem,
} from '../../types/platform';

interface BookingsTicketsPageProps {
  initialTab?: 'upcoming' | 'completed' | 'shared-with-me' | 'cancelled';
  currentUser: SafeUser | null;
  primaryBookings: PrimaryBooking[];
  sharedWithMe: SharedTicketItem[];
  foodItems: FoodItem[];
  onRefresh: () => Promise<void>;
  onRequireLogin: () => void;
}

type BookingDetailSubTab = 'overview' | 'qr' | 'food' | 'companions' | 'payment';

export const BookingsTicketsPage: React.FC<BookingsTicketsPageProps> = ({
  initialTab = 'upcoming',
  currentUser,
  primaryBookings,
  sharedWithMe,
  foodItems,
  onRefresh,
  onRequireLogin,
}) => {
  const [tab, setTab] = useState<'upcoming' | 'completed' | 'shared-with-me' | 'cancelled'>(
    initialTab
  );
  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  // Expanded detail card & active sub-tab per card ID
  const [detailTabs, setDetailTabs] = useState<Record<string, BookingDetailSubTab>>({});
  const getDetailTab = (id: string): BookingDetailSubTab => detailTabs[id] ?? 'qr';
  const setDetailTab = (id: string, next: BookingDetailSubTab) =>
    setDetailTabs((prev) => ({ ...prev, [id]: next }));

  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Transfer Booking Access Modal (Primary Booker Only — rotates the ONE booking QR)
  const [transferTarget, setTransferTarget] = useState<{
    bookingId: string;
    bookingCode: string;
    movieTitle: string;
  } | null>(null);
  const [recipientName, setRecipientName] = useState('');
  const [recipientMobile, setRecipientMobile] = useState('');
  const [transferOtp, setTransferOtp] = useState('');
  const [transferSandboxOtp, setTransferSandboxOtp] = useState('');

  // Add Companion Post-Booking Modal (Primary Booker Only)
  const [addCompBookingId, setAddCompBookingId] = useState<string | null>(null);
  const [compName, setCompName] = useState('');
  const [compMobile, setCompMobile] = useState('');
  const [compRelation, setCompRelation] = useState('Mother');

  // Post-Booking Food Modal (Primary Booker Only)
  const [foodModalBookingId, setFoodModalBookingId] = useState<string | null>(null);
  const [foodQtys, setFoodQtys] = useState<Record<string, number>>({});

  // Cancel Confirmation Modal (Primary Booker Only)
  const [cancelTarget, setCancelTarget] = useState<PrimaryBooking | null>(null);

  // Pending Shared Booking OTP Verification
  const [pendingOtp, setPendingOtp] = useState<Record<string, { code: string; hint?: string }>>({});

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <Ticket className="w-12 h-12 mx-auto text-[#FF252E]" />
        <h1 className="font-display text-2xl font-extrabold text-white">
          Sign In to View Your Bookings &amp; Shared Tickets
        </h1>
        <p className="text-xs text-white/65">
          Access your single booking QR pass, family shared passes, food orders, and refunds.
        </p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold cursor-pointer min-h-[44px]"
        >
          Sign In / Switch Demo Family
        </button>
      </div>
    );
  }

  const upcomingPrimary = primaryBookings.filter(
    (b) => b.status === 'CONFIRMED' && b.qr_status !== 'USED'
  );
  const completedPrimary = primaryBookings.filter(
    (b) => b.status === 'CONFIRMED' && b.qr_status === 'USED'
  );
  const cancelledPrimary = primaryBookings.filter((b) => b.status === 'CANCELLED');

  const downloadPassFile = (params: {
    bookingCode: string;
    movieTitle: string;
    theatreName: string;
    screenName: string;
    showDate: string;
    showTime: string;
    format: string;
    seats: string[];
    qrToken: string;
    qrStatus: string;
  }) => {
    const lines = [
      'Key2Show Booking Pass (One Booking = One QR Code)',
      `Booking ID: ${params.bookingCode}`,
      `Movie / Event: ${params.movieTitle}`,
      `Theatre: ${params.theatreName} (${params.screenName})`,
      `Showtime: ${params.showDate} at ${params.showTime} (${params.format})`,
      `Seats (${params.seats.length} Tickets): ${params.seats.join(', ')}`,
      `Booking QR Token: ${params.qrToken}`,
      `QR Status: ${params.qrStatus}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.bookingCode}-pass.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addToCalendarWallet = (params: {
    bookingCode: string;
    movieTitle: string;
    theatreName: string;
    showDate: string;
    seats: string[];
  }) => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Key2Show — ${params.movieTitle}`,
      `DESCRIPTION:Booking ${params.bookingCode} · Seats ${params.seats.join(', ')}`,
      `LOCATION:${params.theatreName}`,
      `DTSTART:${params.showDate.replace(/-/g, '')}T190000`,
      `DTEND:${params.showDate.replace(/-/g, '')}T220000`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${params.bookingCode}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const sendTransferOtpProper = async () => {
    setErrorMsg('');
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: recipientMobile, purpose: 'TRANSFER' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send transfer OTP');
      if (data.sandboxOtp) {
        setTransferSandboxOtp(data.sandboxOtp);
        setTransferOtp(data.sandboxOtp);
      }
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleConfirmTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferTarget) return;
    setErrorMsg('');
    try {
      await api.transferBookingAccess(transferTarget.bookingId, {
        recipientName,
        recipientMobile,
        otpCode: transferOtp,
      });
      setStatusMsg(
        `Booking ${transferTarget.bookingCode} access transferred to ${recipientName} with a fresh single booking QR!`
      );
      setTransferTarget(null);
      setRecipientName('');
      setRecipientMobile('');
      setTransferOtp('');
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleConfirmAddCompanion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addCompBookingId) return;
    setErrorMsg('');
    try {
      await api.addCompanionToBooking(addCompBookingId, {
        name: compName,
        mobile: compMobile,
        relation: compRelation,
        verified: true,
      });
      setStatusMsg(`Shared exact same booking QR with ${compName}!`);
      setAddCompBookingId(null);
      setCompName('');
      setCompMobile('');
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleRemoveCompanion = async (bookingId: string, accessId: string, name: string) => {
    setErrorMsg('');
    try {
      await api.removeCompanionFromBooking(bookingId, accessId);
      setStatusMsg(`Removed ${name} from companion access.`);
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleAddPostFood = async () => {
    if (!foodModalBookingId) return;
    const cart = Object.entries(foodQtys)
      .filter(([, q]) => q > 0)
      .map(([foodItemId, quantity]) => ({ foodItemId, quantity }));
    if (cart.length === 0) return;
    setErrorMsg('');
    try {
      const res = await api.addPostBookingFood(foodModalBookingId, cart);
      setStatusMsg(`Added food & beverages (₹${res.total}) to booking!`);
      setFoodModalBookingId(null);
      setFoodQtys({});
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleCancelBooking = async () => {
    if (!cancelTarget) return;
    setErrorMsg('');
    try {
      const res = await api.cancelBooking(cancelTarget.id);
      setStatusMsg(
        `Booking ${cancelTarget.booking_code} cancelled. Refund of ₹${res.refund.refundAmount} (${res.refund.tier}) processed!`
      );
      setCancelTarget(null);
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleSendPendingCompanionOtp = async (st: SharedTicketItem) => {
    setErrorMsg('');
    try {
      const res = await api.sendCompanionOtp(currentUser.mobile);
      setPendingOtp((prev) => ({
        ...prev,
        [st.accessId]: {
          code: res.sandboxOtp ?? '',
          hint: res.sandboxOtp,
        },
      }));
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const handleVerifyPendingCompanion = async (st: SharedTicketItem) => {
    const code = pendingOtp[st.accessId]?.code ?? '';
    setErrorMsg('');
    try {
      await api.verifyCompanionOtp({
        mobile: currentUser.mobile,
        otpCode: code,
        accessId: st.accessId,
      });
      setStatusMsg(`Companion access verified! Your booking QR for ${st.movieTitle} is unlocked.`);
      await onRefresh();
    } catch (err) {
      setErrorMsg((err as Error).message);
    }
  };

  const renderPrimaryBookingCard = (b: PrimaryBooking) => {
    const seats =
      b.seats && b.seats.length > 0
        ? b.seats
        : Array.from(new Set(b.participants.map((p) => p.seat_code)));
    const activeSubTab = getDetailTab(b.id);
    const companions = b.companionAccess ?? [];

    return (
      <article
        key={b.id}
        className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 sm:p-5 space-y-4"
      >
        {/* Compact Summary Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white">
                {b.booking_code}
              </span>
              <span
                className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  b.status === 'CANCELLED'
                    ? 'bg-[#2a1014] text-[#FF8A8F]'
                    : b.qr_status === 'USED'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/15 text-emerald-300'
                }`}
              >
                {b.status === 'CANCELLED' ? 'CANCELLED' : `QR: ${b.qr_status}`}
              </span>
              {companions.length > 0 && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF545B]">
                  Shared ({companions.length})
                </span>
              )}
            </div>
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-white mt-1.5">
              {b.movie_title}
            </h2>
            <p className="text-xs text-white/65">
              {b.theatre_name} · {b.screen_name} · {b.show_date} at {b.show_time} ({b.format})
            </p>
            <p className="text-xs font-bold text-emerald-300 mt-1">
              Seats ({seats.length}): {seats.join(', ')}
            </p>
          </div>

          <div className="text-right">
            <p className="text-[11px] text-white/55">Total Paid</p>
            <p className="text-xl font-extrabold text-white tabular-nums">₹{b.total_amount}</p>
          </div>
        </div>

        {/* Clean Tabbed Detail Switcher (Avoids Crowding) */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" role="tablist" aria-label={`Booking ${b.booking_code} details`}>
          {([
            ['qr', 'Booking QR', QrCode],
            ['overview', 'Overview', Ticket],
            ['food', `Food (${b.foodItems.length})`, UtensilsCrossed],
            ['companions', `Companions (${companions.length})`, Users],
            ['payment', 'Payment', CreditCard],
          ] as const).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={activeSubTab === id}
              onClick={() => setDetailTab(b.id, id)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap border cursor-pointer min-h-[40px] ${
                activeSubTab === id
                  ? 'bg-[#E50914] border-[#FF242C] text-white'
                  : 'bg-[#15151c] border-white/10 text-white/75 hover:border-white/25'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* TAB: ONE SINGLE BOOKING QR CODE */}
        {activeSubTab === 'qr' && (
          <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="space-y-2 text-center sm:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-[#FF4A52]">
                One Booking = One Entry QR Code
              </p>
              <p className="text-sm font-bold text-white">
                Valid for all {seats.length} ticket{seats.length > 1 ? 's' : ''}: {seats.join(', ')}
              </p>
              <p className="text-xs text-white/60">
                Scan this single QR once at the theatre gate to admit everyone in your party.
              </p>
              <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    addToCalendarWallet({
                      bookingCode: b.booking_code,
                      movieTitle: b.movie_title,
                      theatreName: b.theatre_name,
                      showDate: b.show_date,
                      seats,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer min-h-[40px]"
                >
                  <CalendarPlus className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>Add to Wallet</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadPassFile({
                      bookingCode: b.booking_code,
                      movieTitle: b.movie_title,
                      theatreName: b.theatre_name,
                      screenName: b.screen_name,
                      showDate: b.show_date,
                      showTime: b.show_time,
                      format: b.format,
                      seats,
                      qrToken: b.qr_token,
                      qrStatus: b.qr_status,
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer min-h-[40px]"
                >
                  <Download className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>Download Pass</span>
                </button>
              </div>
            </div>

            {b.status === 'CONFIRMED' ? (
              <QrCodeView
                token={b.qr_token}
                size={132}
                label={`Booking QR ${b.booking_code}`}
              />
            ) : (
              <div className="px-4 py-3 rounded-xl bg-[#2a1014] border border-[#FF242C]/50 text-xs font-bold text-[#FF8A8F]">
                QR Voided (Cancelled)
              </div>
            )}
          </div>
        )}

        {/* TAB: OVERVIEW */}
        {activeSubTab === 'overview' && (
          <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-white/50">Movie &amp; Format</p>
              <p className="font-bold text-white mt-0.5">{b.movie_title} ({b.format})</p>
            </div>
            <div>
              <p className="text-white/50">Venue &amp; Screen</p>
              <p className="font-bold text-white mt-0.5">{b.theatre_name} · {b.screen_name}</p>
            </div>
            <div>
              <p className="text-white/50">Showtime</p>
              <p className="font-bold text-white mt-0.5">{b.show_date} at {b.show_time}</p>
            </div>
            <div>
              <p className="text-white/50">Seats &amp; Entry Status</p>
              <p className="font-bold text-emerald-300 mt-0.5">
                {seats.join(', ')} ({seats.length} Tickets) · {b.qr_status}
              </p>
            </div>
          </div>
        )}

        {/* TAB: FOOD */}
        {activeSubTab === 'food' && (
          <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 space-y-3">
            {b.foodItems.length === 0 ? (
              <p className="text-xs text-white/65">No snacks pre-ordered for this booking yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {b.foodItems.map((fi, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
                    {fi.name} × {fi.quantity} (₹{fi.total_price})
                  </span>
                ))}
              </div>
            )}
            {b.status === 'CONFIRMED' && b.qr_status === 'ACTIVE' && (
              <button
                type="button"
                onClick={() => setFoodModalBookingId(b.id)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#1a1a22] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer min-h-[40px]"
              >
                <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF252E]" />
                <span>Add Food to Booking</span>
              </button>
            )}
          </div>
        )}

        {/* TAB: COMPANIONS (Primary Booker Only) */}
        {activeSubTab === 'companions' && (
          <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-white/75">
                Verified companions below see the <strong>exact same booking QR</strong> in their Shared With Me tab.
              </p>
              {b.status === 'CONFIRMED' && b.qr_status === 'ACTIVE' && (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAddCompBookingId(b.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[40px]"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Add Companion</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransferTarget({
                        bookingId: b.id,
                        bookingCode: b.booking_code,
                        movieTitle: b.movie_title,
                      })
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold cursor-pointer min-h-[40px]"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                    <span>Transfer Access</span>
                  </button>
                </div>
              )}
            </div>

            {companions.length === 0 ? (
              <p className="text-xs text-white/55">No companions added yet. Click &ldquo;Add Companion&rdquo; to share this booking.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {companions.map((ca) => (
                  <div
                    key={ca.id}
                    className="rounded-xl bg-[#111116] border border-white/10 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">
                        {ca.companion_name} ({ca.relation})
                      </p>
                      <p className="text-[11px] font-mono text-white/55">{ca.companion_mobile}</p>
                      <span className="text-[10.5px] font-bold text-emerald-300">
                        {ca.verification_status}
                      </span>
                    </div>
                    {b.status === 'CONFIRMED' && (
                      <button
                        type="button"
                        aria-label={`Remove ${ca.companion_name}`}
                        onClick={() => handleRemoveCompanion(b.id, ca.id, ca.companion_name)}
                        className="p-2 rounded-lg bg-white/5 hover:bg-[#2a1014] text-white/60 hover:text-[#FF8A8F] cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB: PAYMENT & CANCELLATION (Strictly Primary Booker Only) */}
        {activeSubTab === 'payment' && (
          <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 space-y-3 text-xs">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <p className="text-white/50">Tickets Subtotal</p>
                <p className="font-bold text-white tabular-nums">₹{b.seats_subtotal}</p>
              </div>
              <div>
                <p className="text-white/50">Food &amp; Drinks</p>
                <p className="font-bold text-white tabular-nums">₹{b.food_subtotal}</p>
              </div>
              <div>
                <p className="text-white/50">Fees &amp; GST</p>
                <p className="font-bold text-white tabular-nums">₹{b.convenience_fee + b.taxes}</p>
              </div>
              <div>
                <p className="text-white/50">Total Paid ({b.payment_status})</p>
                <p className="font-bold text-emerald-300 tabular-nums">₹{b.total_amount}</p>
              </div>
            </div>

            {b.coupon_code && (
              <p className="text-emerald-300">
                Promo Code Applied: <strong>{b.coupon_code}</strong> (-₹{b.discount})
              </p>
            )}

            {b.refund && (
              <div className="rounded-xl bg-[#211114] border border-[#FF242C]/40 px-3.5 py-2.5 text-white/85 flex flex-wrap justify-between gap-2">
                <span>
                  Refund Status: <strong className="text-emerald-300">{b.refund.status}</strong>
                </span>
                <span>
                  Refunded ₹{b.refund.refund_amount} (Fee: ₹{b.refund.cancellation_fee})
                </span>
              </div>
            )}

            {b.status === 'CONFIRMED' && b.qr_status === 'ACTIVE' && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={() => setCancelTarget(b)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#2a1014] border border-[#FF242C]/50 hover:bg-[#3a141a] text-xs font-bold text-[#FF8A8F] cursor-pointer min-h-[40px]"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Booking</span>
                </button>
              </div>
            )}
          </div>
        )}
      </article>
    );
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-7 pb-24 sm:pb-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            Account &amp; Companion Hub
          </span>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white mt-1">
            My Bookings &amp; Shared Tickets
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Signed in as <strong className="text-white">{currentUser.name}</strong> ({currentUser.mobile})
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {([
            ['upcoming', `Upcoming (${upcomingPrimary.length})`],
            ['shared-with-me', `Shared With Me (${sharedWithMe.length})`],
            ['completed', `Completed (${completedPrimary.length})`],
            ['cancelled', `Cancelled (${cancelledPrimary.length})`],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-full text-xs font-bold border cursor-pointer min-h-[40px] ${
                tab === id
                  ? 'bg-[#E50914] border-[#FF242C] text-white'
                  : 'bg-[#141418] border-white/15 text-white/75'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {statusMsg && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-3 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-4 py-3 text-xs text-[#FF8A8F] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {tab === 'upcoming' && (
        <div className="space-y-4">
          {upcomingPrimary.length === 0 ? (
            <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-8 text-center text-sm text-white/65">
              No active upcoming bookings found. Check &ldquo;Shared With Me&rdquo; for shared family passes!
            </div>
          ) : (
            upcomingPrimary.map(renderPrimaryBookingCard)
          )}
        </div>
      )}

      {tab === 'completed' && (
        <div className="space-y-4">
          {completedPrimary.length === 0 ? (
            <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-8 text-center text-sm text-white/65">
              No completed shows checked in at the gate yet.
            </div>
          ) : (
            completedPrimary.map(renderPrimaryBookingCard)
          )}
        </div>
      )}

      {tab === 'cancelled' && (
        <div className="space-y-4">
          {cancelledPrimary.length === 0 ? (
            <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-8 text-center text-sm text-white/65">
              No cancelled bookings or refunds.
            </div>
          ) : (
            cancelledPrimary.map(renderPrimaryBookingCard)
          )}
        </div>
      )}

      {/* STRICTLY SCOPED COMPANION VIEW: SHARED WITH ME
          Companions see Movie, Theatre, Screen, Date/Time, Format, ALL Seats, Ticket Count, Shared By,
          Shared With list, EXACT SAME 1 Booking QR, Read-only Food summary, and Download / Add to Wallet.
          NO payment details, NO cancel, NO add food, NO add/remove companions, NO transfer! */}
      {tab === 'shared-with-me' && (
        <div className="space-y-4">
          {sharedWithMe.length === 0 ? (
            <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-8 text-center text-sm text-white/65">
              No shared bookings were found for your mobile ({currentUser.mobile}).
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sharedWithMe.map((st) => (
                <article
                  key={st.accessId}
                  className="rounded-2xl bg-[#0e0e13] border border-[#FF1822]/40 p-5 space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF4A52] text-[11px] font-bold">
                        <Users className="w-3 h-3" />
                        <span>Shared by: {st.sharedByName} ({st.relation})</span>
                      </span>
                      <h2 className="font-display text-xl font-extrabold text-white mt-2">
                        {st.movieTitle}
                      </h2>
                      <p className="text-xs text-white/65 mt-0.5">
                        {st.theatreName} · {st.screenName}
                      </p>
                      <p className="text-xs text-white/80 font-semibold mt-1">
                        {st.showDate} at {st.showTime} · {st.format}
                      </p>
                      <p className="text-xs font-bold text-emerald-300 mt-1">
                        Seats ({st.ticketCount}): {st.allSeats.join(', ')}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="px-3 py-1 rounded-xl bg-[#E50914] text-white text-xs font-extrabold">
                        {st.ticketCount} Ticket{st.ticketCount > 1 ? 's' : ''}
                      </span>
                      <p className="text-[10.5px] font-mono text-white/55 mt-1.5">{st.bookingCode}</p>
                    </div>
                  </div>

                  {/* Shared With Summary */}
                  {st.sharedWith && st.sharedWith.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 text-[11px] text-white/75">
                      <span className="text-white/50">Shared with:</span>
                      {st.sharedWith.map((sw, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-full bg-white/8">
                          {sw.companion_name} ({sw.relation})
                        </span>
                      ))}
                    </div>
                  )}

                  {/* EXACT SAME SINGLE QR CODE or OTP Unlock Gate */}
                  {st.verificationStatus === 'VERIFIED' && st.qrToken ? (
                    <div className="rounded-xl bg-[#15151c] border border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div className="space-y-2 text-center sm:text-left">
                        <p className="text-xs font-bold text-emerald-300">
                          Shared Booking Verified · QR {st.qrStatus}
                        </p>
                        <p className="text-[11px] text-white/60">
                          Same booking QR as primary booker. Present once at theatre entry for seats{' '}
                          <strong className="text-white">{st.allSeats.join(', ')}</strong>.
                        </p>
                        <div className="flex flex-wrap justify-center sm:justify-start gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              addToCalendarWallet({
                                bookingCode: st.bookingCode,
                                movieTitle: st.movieTitle,
                                theatreName: st.theatreName,
                                showDate: st.showDate,
                                seats: st.allSeats,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
                          >
                            <CalendarPlus className="w-3 h-3 text-[#FF252E]" />
                            <span>Add to Wallet</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              downloadPassFile({
                                bookingCode: st.bookingCode,
                                movieTitle: st.movieTitle,
                                theatreName: st.theatreName,
                                screenName: st.screenName,
                                showDate: st.showDate,
                                showTime: st.showTime,
                                format: st.format,
                                seats: st.allSeats,
                                qrToken: st.qrToken!,
                                qrStatus: st.qrStatus,
                              })
                            }
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white cursor-pointer"
                          >
                            <Download className="w-3 h-3 text-[#FF252E]" />
                            <span>Download Pass</span>
                          </button>
                        </div>
                      </div>
                      <QrCodeView
                        token={st.qrToken}
                        size={116}
                        label={`Shared Booking QR ${st.bookingCode}`}
                      />
                    </div>
                  ) : (
                    <div className="rounded-xl bg-[#1d1416] border border-amber-500/40 p-4 space-y-2.5">
                      <p className="text-xs font-bold text-amber-300">
                        OTP Verification Required to Unlock Shared Booking QR
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleSendPendingCompanionOtp(st)}
                          className="px-3 py-1.5 rounded-lg bg-white/10 text-xs font-bold text-white cursor-pointer"
                        >
                          Send OTP to {currentUser.mobile}
                        </button>
                        <input
                          type="text"
                          value={pendingOtp[st.accessId]?.code ?? ''}
                          onChange={(e) =>
                            setPendingOtp((prev) => ({
                              ...prev,
                              [st.accessId]: {
                                ...prev[st.accessId],
                                code: e.target.value,
                              },
                            }))
                          }
                          placeholder={
                            pendingOtp[st.accessId]?.hint
                              ? `Preview: ${pendingOtp[st.accessId].hint}`
                              : 'Enter OTP'
                          }
                          className="w-32 px-2.5 py-1.5 rounded-lg bg-[#141418] border border-white/15 text-xs text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleVerifyPendingCompanion(st)}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white cursor-pointer"
                        >
                          Verify
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Read-only Food Summary (Companion cannot modify or see pricing!) */}
                  {st.foodSummary.length > 0 && (
                    <div className="rounded-xl bg-[#14141a] border border-white/10 px-3.5 py-2.5 text-xs text-white/80">
                      <p className="font-semibold text-[11px] text-white/60 mb-1 flex items-center gap-1.5">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF252E]" />
                        <span>Food included in this booking (Read-only):</span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {st.foodSummary.map((fs, idx) => (
                          <span key={idx} className="px-2.5 py-0.5 rounded-full bg-white/8 text-[11px]">
                            {fs.name} × {fs.quantity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Primary Booker: Transfer Booking Access Modal */}
      {transferTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Transfer Booking Access"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleConfirmTransfer}
            className="relative w-full max-w-md rounded-2xl bg-[#0e0e12] border border-white/15 p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setTransferTarget(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-white">
              Transfer Booking {transferTarget.bookingCode} ({transferTarget.movieTitle})
            </h3>
            <p className="text-xs text-white/65">
              Grants verified companion access via OTP and rotates the single booking QR securely.
            </p>
            <input
              type="text"
              required
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder="Recipient Full Name"
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <div className="flex gap-2">
              <input
                type="tel"
                required
                value={recipientMobile}
                onChange={(e) => setRecipientMobile(e.target.value)}
                placeholder="Recipient 10-digit Mobile"
                className="flex-1 px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
              />
              <button
                type="button"
                onClick={sendTransferOtpProper}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer min-h-[44px]"
              >
                Send OTP
              </button>
            </div>
            <input
              type="text"
              required
              value={transferOtp}
              onChange={(e) => setTransferOtp(e.target.value)}
              placeholder={transferSandboxOtp ? `Preview OTP: ${transferSandboxOtp}` : 'Enter Transfer OTP'}
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Confirm Booking Transfer</span>
            </button>
          </form>
        </div>
      )}

      {/* Primary Booker: Add Companion Modal */}
      {addCompBookingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share Booking with Companion"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleConfirmAddCompanion}
            className="relative w-full max-w-md rounded-2xl bg-[#0e0e12] border border-white/15 p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setAddCompBookingId(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-white">
              Add Companion to Booking QR
            </h3>
            <p className="text-xs text-white/65">
              They will receive instant access to the exact same booking QR in their Shared With Me tab.
            </p>
            <input
              type="text"
              required
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Companion Name (e.g. Lakshmi Sharma)"
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <input
              type="tel"
              required
              value={compMobile}
              onChange={(e) => setCompMobile(e.target.value)}
              placeholder="Mobile Number (+91 98480 22222)"
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <select
              value={compRelation}
              onChange={(e) => setCompRelation(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            >
              <option value="Mother">Mother</option>
              <option value="Father">Father</option>
              <option value="Daughter">Daughter</option>
              <option value="Sister">Sister</option>
              <option value="Friend">Friend</option>
            </select>
            <button
              type="submit"
              className="w-full py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Grant Shared Booking Access
            </button>
          </form>
        </div>
      )}

      {/* Primary Booker: Post-Booking Food Modal */}
      {foodModalBookingId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Add Food to Booking"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-lg rounded-2xl bg-[#0e0e12] border border-white/15 p-6 space-y-4">
            <button
              type="button"
              onClick={() => setFoodModalBookingId(null)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-white">
              Add Snacks to Confirmed Booking
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
              {foodItems.map((fi) => (
                <div
                  key={fi.id}
                  className="rounded-xl bg-[#15151b] border border-white/10 p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs font-bold text-white">{fi.name}</p>
                    <p className="text-[11px] text-white/55">₹{fi.price}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFoodQtys((p) => ({
                          ...p,
                          [fi.id]: Math.max(0, (p[fi.id] ?? 0) - 1),
                        }))
                      }
                      className="w-7 h-7 rounded-full bg-white/10 text-white text-xs font-bold cursor-pointer"
                    >
                      -
                    </button>
                    <span className="text-xs font-bold text-white w-4 text-center">
                      {foodQtys[fi.id] ?? 0}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFoodQtys((p) => ({ ...p, [fi.id]: (p[fi.id] ?? 0) + 1 }))
                      }
                      className="w-7 h-7 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={handleAddPostFood}
              className="w-full py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Confirm Food Order
            </button>
          </div>
        </div>
      )}

      {/* Primary Booker: Cancel Booking Confirmation */}
      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Cancel Booking"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-md rounded-2xl bg-[#0e0e12] border border-white/15 p-6 space-y-4">
            <h3 className="font-display text-lg font-bold text-white">
              Cancel Booking {cancelTarget.booking_code}?
            </h3>
            <p className="text-xs text-white/75">
              Cancelling this booking releases all seats and voids the booking QR pass for both you and shared companions.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="px-4 py-2 rounded-full bg-white/10 text-xs font-bold text-white cursor-pointer min-h-[40px]"
              >
                Keep Booking
              </button>
              <button
                type="button"
                onClick={handleCancelBooking}
                className="px-5 py-2 rounded-full bg-[#E50914] text-xs font-bold text-white cursor-pointer min-h-[40px]"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

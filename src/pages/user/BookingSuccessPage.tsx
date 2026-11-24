import React, { useState } from 'react';
import {
  CheckCircle2,
  CalendarPlus,
  Download,
  Ticket,
  Users,
  UtensilsCrossed,
  Share2,
  X,
} from 'lucide-react';
import { QrCodeView } from '../../components/QrCodeView';
import { SkeletonBookingConfirmation } from '../../components/skeletons/LoadingSkeletons';
import { api } from '../../utils/api';
import type { PrimaryBooking } from '../../types/platform';

interface BookingSuccessPageProps {
  booking: PrimaryBooking | null;
  onRefresh: () => Promise<void>;
  onGoToBookings: () => void;
  onGoHome: () => void;
}

export const BookingSuccessPage: React.FC<BookingSuccessPageProps> = ({
  booking,
  onRefresh,
  onGoToBookings,
  onGoHome,
}) => {
  const [shareOpen, setShareOpen] = useState(false);
  const [compName, setCompName] = useState('');
  const [compMobile, setCompMobile] = useState('');
  const [compRelation, setCompRelation] = useState('Mother');
  const [shareStatus, setShareStatus] = useState('');
  const [shareError, setShareError] = useState('');

  if (!booking) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 space-y-4">
        <SkeletonBookingConfirmation />
        <div className="text-center pt-2">
          <button
            type="button"
            onClick={onGoToBookings}
            className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold cursor-pointer min-h-[44px]"
          >
            Go to My Bookings
          </button>
        </div>
      </div>
    );
  }

  const seatsList = booking.seats && booking.seats.length > 0
    ? booking.seats
    : Array.from(new Set(booking.participants.map((p) => p.seat_code)));

  const handleDownloadPass = () => {
    const lines = [
      `Key2Show Confirmed Booking Pass (1 Booking = 1 QR Code)`,
      `Booking ID: ${booking.booking_code}`,
      `Movie / Event: ${booking.movie_title}`,
      `Theatre: ${booking.theatre_name} (${booking.screen_name})`,
      `Showtime: ${booking.show_date} at ${booking.show_time} (${booking.format})`,
      `Seats (${seatsList.length} Tickets): ${seatsList.join(', ')}`,
      `Booking QR Token: ${booking.qr_token}`,
      `Status: ${booking.qr_status}`,
      `Total Paid: ₹${booking.total_amount}`,
      ``,
      `Shared With:`,
      ...booking.companionAccess.map(
        (c) => `- ${c.companion_name} (${c.relation}) · ${c.companion_mobile} · ${c.verification_status}`
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.booking_code}-pass.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddToCalendar = () => {
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'BEGIN:VEVENT',
      `SUMMARY:Key2Show — ${booking.movie_title}`,
      `DESCRIPTION:Booking ${booking.booking_code} · Seats ${seatsList.join(', ')}`,
      `LOCATION:${booking.theatre_name}`,
      `DTSTART:${booking.show_date.replace(/-/g, '')}T190000`,
      `DTEND:${booking.show_date.replace(/-/g, '')}T220000`,
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${booking.booking_code}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShareError('');
    setShareStatus('');
    try {
      await api.addCompanionToBooking(booking.id, {
        name: compName,
        mobile: compMobile,
        relation: compRelation,
        verified: true,
      });
      setShareStatus(`Shared exact same booking QR with ${compName}!`);
      setCompName('');
      setCompMobile('');
      setShareOpen(false);
      await onRefresh();
    } catch (err) {
      setShareError((err as Error).message);
    }
  };

  return (
    <div className="max-w-[780px] mx-auto px-4 lg:px-8 py-7 space-y-5">
      {/* Confirmation + ONE SINGLE BOOKING QR CODE */}
      <div className="rounded-3xl bg-[#0c0c10] border border-emerald-500/40 p-6 sm:p-8 text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Booking Confirmed!
          </h1>
          <p className="text-xs text-white/70 mt-1">
            Booking ID:{' '}
            <span className="font-mono font-bold text-white text-sm">{booking.booking_code}</span>
          </p>
        </div>

        {/* Single Booking QR Block */}
        <div className="mx-auto max-w-sm rounded-2xl bg-[#14141b] border border-white/15 p-5 flex flex-col items-center gap-3">
          <span className="px-3 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-bold uppercase tracking-wider">
            One Booking · {seatsList.length} Ticket{seatsList.length > 1 ? 's' : ''}
          </span>
          <QrCodeView
            token={booking.qr_token}
            size={168}
            label={`Booking QR for ${booking.booking_code}`}
          />
          <div className="space-y-1">
            <p className="text-sm font-extrabold text-white">{booking.movie_title}</p>
            <p className="text-xs text-white/65">
              {booking.theatre_name} · {booking.screen_name}
            </p>
            <p className="text-xs text-white/80 font-semibold">
              {booking.show_date} · {booking.show_time} · {booking.format}
            </p>
            <p className="text-xs font-bold text-emerald-300 pt-1">
              Seats: {seatsList.join(', ')}
            </p>
          </div>
        </div>

        {shareStatus && (
          <p className="text-xs font-bold text-emerald-300">{shareStatus}</p>
        )}

        {/* Primary Action Buttons */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap justify-center gap-2.5 pt-2">
          <button
            type="button"
            onClick={handleAddToCalendar}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#181820] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer min-h-[44px]"
          >
            <CalendarPlus className="w-3.5 h-3.5 text-[#FF252E]" />
            <span>Add to Wallet</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPass}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#181820] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer min-h-[44px]"
          >
            <Download className="w-3.5 h-3.5 text-[#FF252E]" />
            <span>Download Pass</span>
          </button>
          <button
            type="button"
            onClick={() => setShareOpen(true)}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#181820] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer min-h-[44px]"
          >
            <Share2 className="w-3.5 h-3.5 text-[#FF252E]" />
            <span>Share Access</span>
          </button>
          <button
            type="button"
            onClick={onGoToBookings}
            className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-xs font-bold text-white cursor-pointer min-h-[44px]"
          >
            <Ticket className="w-3.5 h-3.5" />
            <span>View Booking</span>
          </button>
        </div>
      </div>

      {/* Shared Companions List */}
      {booking.companionAccess && booking.companionAccess.length > 0 && (
        <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-2.5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-[#FF252E]" />
            <span>Shared With ({booking.companionAccess.length}) — Same Booking QR</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {booking.companionAccess.map((c) => (
              <span
                key={c.id}
                className="px-3 py-1.5 rounded-xl bg-[#16161d] border border-white/10 text-xs text-white/85"
              >
                {c.companion_name} ({c.relation}) ·{' '}
                <span className="text-emerald-300 font-semibold">{c.verification_status}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {booking.foodItems.length > 0 && (
        <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-2">
            <UtensilsCrossed className="w-4 h-4 text-[#FF252E]" />
            <span>Pre-Ordered Food &amp; Beverages</span>
          </h3>
          <div className="flex flex-wrap gap-2">
            {booking.foodItems.map((fi, idx) => (
              <span
                key={idx}
                className="px-3 py-1.5 rounded-xl bg-[#16161d] border border-white/10 text-xs text-white/85"
              >
                {fi.name} × {fi.quantity}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="text-center">
        <button
          type="button"
          onClick={onGoHome}
          className="text-xs font-semibold text-white/65 hover:text-white underline cursor-pointer"
        >
          Return to Key2Show Home
        </button>
      </div>

      {/* Share Access Modal */}
      {shareOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Share Booking Access"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
        >
          <form
            onSubmit={handleShareSubmit}
            className="relative w-full max-w-md rounded-2xl bg-[#0e0e12] border border-white/15 p-6 space-y-4"
          >
            <button
              type="button"
              onClick={() => setShareOpen(false)}
              className="absolute right-4 top-4 p-1.5 rounded-full bg-white/10 text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <h3 className="font-display text-lg font-bold text-white">
              Share Booking QR ({booking.booking_code})
            </h3>
            <p className="text-xs text-white/65">
              Grants verified companion access to view the exact same single booking QR in their account.
            </p>
            {shareError && <p className="text-xs text-[#FF8A8F]">{shareError}</p>}
            <input
              type="text"
              required
              value={compName}
              onChange={(e) => setCompName(e.target.value)}
              placeholder="Companion Name (e.g. Lakshmi Sharma)"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <input
              type="tel"
              required
              value={compMobile}
              onChange={(e) => setCompMobile(e.target.value)}
              placeholder="+91 98480 22222"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            />
            <select
              value={compRelation}
              onChange={(e) => setCompRelation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
            >
              <option value="Mother">Mother</option>
              <option value="Daughter">Daughter</option>
              <option value="Sister">Sister</option>
              <option value="Father">Father</option>
              <option value="Friend">Friend</option>
            </select>
            <button
              type="submit"
              className="w-full py-3 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
            >
              Grant Companion Access
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

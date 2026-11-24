import React, { useState, useMemo } from 'react';
import {
  X,
  Star,
  Clock,
  MapPin,
  Ticket,
  CheckCircle2,
  QrCode,
  Tag,
} from 'lucide-react';
import type { Movie } from '../../data/movies';
import type { Theatre } from '../../data/theatres';
import { calculateBookingTotal, generateTicketCode } from '../../utils/bookingLogic';

export interface ConfirmedTicket {
  id: string;
  ticketCode: string;
  title: string;
  venue: string;
  dateLabel: string;
  showtime: string;
  format: string;
  seats: string[];
  totalPaid: number;
}

interface MovieDetailsModalProps {
  movie: Movie;
  theatres: Theatre[];
  initialTheatreId?: string;
  onClose: () => void;
  onConfirmBooking: (ticket: ConfirmedTicket) => void;
}

const SEAT_ROWS = ['A', 'B', 'C', 'D', 'E'] as const;
const SEATS_PER_ROW = 8;
const OCCUPIED_SEATS = new Set(['A3', 'A4', 'B5', 'C2', 'C6', 'D4']);

export const MovieDetailsModal: React.FC<MovieDetailsModalProps> = ({
  movie,
  theatres,
  initialTheatreId,
  onClose,
  onConfirmBooking,
}) => {
  const defaultTheatre =
    theatres.find((t) => t.id === initialTheatreId) ?? theatres[0];

  const [selectedTheatreId, setSelectedTheatreId] = useState(
    defaultTheatre?.id ?? 'pvr-next-galleria'
  );
  const [selectedFormat, setSelectedFormat] = useState(movie.formats[0] ?? '2D');
  const [selectedShowtime, setSelectedShowtime] = useState(
    defaultTheatre?.showtimes?.[1] ?? '01:30 PM'
  );
  const [selectedSeats, setSelectedSeats] = useState<string[]>(['C4', 'C5']);
  const [promoCode, setPromoCode] = useState('');
  const [promoApplied, setPromoApplied] = useState('');
  const [confirmedTicket, setConfirmedTicket] = useState<ConfirmedTicket | null>(
    null
  );

  const activeTheatre = useMemo(
    () => theatres.find((t) => t.id === selectedTheatreId) ?? defaultTheatre,
    [theatres, selectedTheatreId, defaultTheatre]
  );

  const pricePerSeat = useMemo(() => {
    const formatMultiplier = selectedFormat.includes('IMAX')
      ? 120
      : selectedFormat.includes('4DX')
        ? 140
        : selectedFormat.includes('3D')
          ? 60
          : 0;
    return movie.basePrice + formatMultiplier;
  }, [movie.basePrice, selectedFormat]);

  const summary = useMemo(
    () => calculateBookingTotal(selectedSeats, pricePerSeat, promoApplied),
    [selectedSeats, pricePerSeat, promoApplied]
  );

  const toggleSeat = (seatId: string) => {
    if (OCCUPIED_SEATS.has(seatId)) return;
    setSelectedSeats((prev) =>
      prev.includes(seatId)
        ? prev.filter((s) => s !== seatId)
        : prev.length < 6
          ? [...prev, seatId]
          : prev
    );
  };

  const handleApplyPromo = () => {
    setPromoApplied(promoCode.trim().toUpperCase());
  };

  const handleConfirm = () => {
    if (selectedSeats.length === 0 || !activeTheatre) return;
    const code = generateTicketCode(movie.id, activeTheatre.id, selectedSeats);
    const ticket: ConfirmedTicket = {
      id: `${Date.now()}`,
      ticketCode: code,
      title: movie.title,
      venue: `${activeTheatre.name} (${activeTheatre.location})`,
      dateLabel: 'Today',
      showtime: selectedShowtime,
      format: selectedFormat,
      seats: [...selectedSeats].sort(),
      totalPaid: summary.total,
    };
    setConfirmedTicket(ticket);
    onConfirmBooking(ticket);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Book tickets for ${movie.title}`}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[#0e0e12] border border-white/15 shadow-[0_24px_80px_rgba(0,0,0,0.95)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close booking dialog"
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {confirmedTicket ? (
          <div className="p-6 sm:p-8 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-[#E50914]/20 border border-[#FF1822] flex items-center justify-center text-[#FF252E]">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="font-display text-2xl font-bold text-white mt-4">
              Booking Confirmed!
            </h3>
            <p className="text-sm text-white/75 mt-1">
              Show this QR pass at the theatre entrance for instant validation.
            </p>

            <div className="mt-6 w-full max-w-md rounded-2xl bg-[#141419] border border-white/15 p-5 text-left space-y-3">
              <div className="flex items-start justify-between gap-4 border-b border-dashed border-white/15 pb-4">
                <div>
                  <span className="text-[11px] font-semibold text-[#FF3B42] uppercase tracking-wider">
                    {confirmedTicket.format}
                  </span>
                  <h4 className="font-display text-xl font-bold text-white mt-0.5">
                    {confirmedTicket.title}
                  </h4>
                  <p className="text-xs text-white/75 mt-1 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-[#FF1822]" />
                    <span>{confirmedTicket.venue}</span>
                  </p>
                </div>
                <div className="p-2.5 rounded-xl bg-white text-black shrink-0">
                  <QrCode className="w-14 h-14" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <span className="text-white/55 block">Showtime</span>
                  <strong className="text-white font-semibold mt-0.5 block">
                    {confirmedTicket.dateLabel}, {confirmedTicket.showtime}
                  </strong>
                </div>
                <div>
                  <span className="text-white/55 block">Seats</span>
                  <strong className="text-white font-semibold mt-0.5 block">
                    {confirmedTicket.seats.join(', ')}
                  </strong>
                </div>
                <div>
                  <span className="text-white/55 block">Total Paid</span>
                  <strong className="text-[#FF3B42] font-bold tabular-nums mt-0.5 block">
                    ₹{confirmedTicket.totalPaid}
                  </strong>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/60">
                <span>Booking ID</span>
                <code className="font-mono text-white/90">{confirmedTicket.ticketCode}</code>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-8 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white font-bold text-sm k2s-red-glow cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-[260px_1fr]">
            {/* Left Poster + Meta */}
            <div className="bg-[#09090c] p-5 border-b md:border-b-0 md:border-r border-white/10 flex flex-col gap-4">
              <div className="rounded-xl overflow-hidden border border-white/15 aspect-[170/190] bg-[#141418]">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-top"
                />
              </div>
              <div>
                <h3 className="font-display text-xl font-bold text-white leading-tight">
                  {movie.title}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/75">
                  <span className="inline-flex items-center gap-1 text-white font-semibold">
                    <Star className="w-3.5 h-3.5 text-[#F5B81D] fill-[#F5B81D]" />
                    <span className="tabular-nums">{movie.rating}/10</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{movie.certification}</span>
                  <span aria-hidden="true">·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {movie.duration}
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-1.5">
                  {movie.genre.join(' / ')} · {movie.language}
                </p>
                <p className="text-xs text-white/80 mt-3 leading-relaxed">
                  {movie.synopsis}
                </p>
                <p className="text-[11px] text-white/55 mt-3">
                  <strong className="text-white/80">Cast:</strong> {movie.cast.join(', ')}
                </p>
              </div>
            </div>

            {/* Right Interactive Showtime & Seat Picker */}
            <div className="p-5 sm:p-6 space-y-5">
              {/* Theatre & Format */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label
                    htmlFor="theatre-select"
                    className="block text-xs font-semibold text-white/75 mb-1.5"
                  >
                    Select Theatre
                  </label>
                  <select
                    id="theatre-select"
                    value={selectedTheatreId}
                    onChange={(e) => setSelectedTheatreId(e.target.value)}
                    className="w-full rounded-xl bg-[#16161b] border border-white/15 px-3 py-2 text-sm text-white focus:outline-none focus:border-[#FF1822]"
                  >
                    {theatres.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.location})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <span className="block text-xs font-semibold text-white/75 mb-1.5">
                    Select Format
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {movie.formats.map((fmt) => (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => setSelectedFormat(fmt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          selectedFormat === fmt
                            ? 'bg-[#E50914] border-[#FF3B42] text-white'
                            : 'bg-[#16161b] border-white/15 text-white/80 hover:border-white/40'
                        }`}
                      >
                        {fmt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Showtimes */}
              <div>
                <span className="block text-xs font-semibold text-white/75 mb-2">
                  Showtimes Today
                </span>
                <div className="flex flex-wrap gap-2">
                  {(activeTheatre?.showtimes ?? ['10:30 AM', '01:45 PM', '05:15 PM', '08:45 PM']).map(
                    (time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedShowtime(time)}
                        className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all cursor-pointer tabular-nums ${
                          selectedShowtime === time
                            ? 'bg-[#E50914] border-[#FF3B42] text-white shadow-[0_0_12px_rgba(229,9,20,0.45)]'
                            : 'bg-[#16161b] border-white/15 text-white/85 hover:border-[#FF1822]/60'
                        }`}
                      >
                        {time}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Interactive Seat Grid */}
              <div className="rounded-xl bg-[#09090c] border border-white/10 p-4">
                <div className="flex items-center justify-between text-xs text-white/70 mb-3">
                  <span>Select Seats (max 6)</span>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#1f1f27] border border-white/25 inline-block" />
                      Available
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-[#E50914] inline-block" />
                      Selected
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-sm bg-white/10 inline-block" />
                      Sold
                    </span>
                  </div>
                </div>

                <div className="w-full h-1.5 rounded-full bg-gradient-to-r from-transparent via-[#FF1822]/60 to-transparent mb-1" />
                <p className="text-[10px] text-center text-white/45 tracking-widest uppercase mb-3">
                  Screen This Way
                </p>

                <div className="space-y-1.5 flex flex-col items-center">
                  {SEAT_ROWS.map((row) => (
                    <div key={row} className="flex items-center gap-1.5">
                      <span className="w-4 text-[11px] font-semibold text-white/50 text-right mr-1">
                        {row}
                      </span>
                      {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
                        const seatId = `${row}${i + 1}`;
                        const occupied = OCCUPIED_SEATS.has(seatId);
                        const selected = selectedSeats.includes(seatId);
                        return (
                          <button
                            key={seatId}
                            type="button"
                            disabled={occupied}
                            onClick={() => toggleSeat(seatId)}
                            aria-label={`Seat ${seatId} ${occupied ? 'sold' : selected ? 'selected' : 'available'}`}
                            className={`w-7 h-7 rounded-md text-[10px] font-bold tabular-nums transition-all ${
                              occupied
                                ? 'bg-white/10 text-white/25 cursor-not-allowed'
                                : selected
                                  ? 'bg-[#E50914] text-white border border-[#FF585E] shadow-[0_0_10px_rgba(229,9,20,0.5)] cursor-pointer'
                                  : 'bg-[#1a1a22] text-white/80 border border-white/15 hover:border-[#FF1822] cursor-pointer'
                            }`}
                          >
                            {i + 1}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Promo Code & Summary */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 border-t border-white/10">
                <div className="flex-1">
                  <label
                    htmlFor="promo-input"
                    className="flex items-center gap-1.5 text-[11.5px] text-white/75 mb-1.5"
                  >
                    <Tag className="w-3.5 h-3.5 text-[#FF1822]" />
                    <span>Promo Code (try KEY2SHOW100)</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="promo-input"
                      type="text"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      placeholder="Enter code..."
                      className="flex-1 rounded-lg bg-[#16161b] border border-white/15 px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#FF1822]"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                <div className="sm:text-right">
                  <div className="text-xs text-white/65 tabular-nums">
                    {summary.seatCount} seat(s) × ₹{pricePerSeat} + ₹{summary.convenienceFee} fee
                    {summary.discount > 0 && (
                      <span className="text-emerald-400 ml-1">(-₹{summary.discount})</span>
                    )}
                  </div>
                  <div className="flex items-center sm:justify-end gap-3 mt-1.5">
                    <span className="text-lg font-extrabold text-white tabular-nums">
                      ₹{summary.total}
                    </span>
                    <button
                      type="button"
                      disabled={selectedSeats.length === 0}
                      onClick={handleConfirm}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] disabled:opacity-40 text-white font-bold text-sm k2s-red-glow cursor-pointer hover:brightness-110"
                    >
                      <Ticket className="w-4 h-4" />
                      <span>Confirm Booking</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

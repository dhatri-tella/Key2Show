import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Monitor, ShieldAlert, Armchair, ArrowRight, Wifi } from 'lucide-react';
import { api } from '../../utils/api';
import type {
  CatalogMovie,
  CatalogTheatre,
  CheckoutDraft,
  SafeUser,
  ShowItem,
  ShowSeat,
} from '../../types/platform';

interface SeatSelectionPageProps {
  showId: string;
  movies: CatalogMovie[];
  theatres: CatalogTheatre[];
  currentUser: SafeUser | null;
  onRequireLogin: () => void;
  onProceedToFoodStep: (draft: CheckoutDraft) => void;
  onBack: () => void;
}

const ROWS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const SeatSelectionPage: React.FC<SeatSelectionPageProps> = ({
  showId,
  movies,
  theatres,
  currentUser,
  onRequireLogin,
  onProceedToFoodStep,
  onBack,
}) => {
  const [showInfo, setShowInfo] = useState<(ShowItem & Record<string, unknown>) | null>(null);
  const [seats, setSeats] = useState<ShowSeat[]>([]);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState('');

  const loadSeats = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.getShowSeats(showId);
      setShowInfo(res.show);
      setSeats(res.seats);
      // Deselect any seat that was just booked by someone else
      setSelectedCodes((prev) =>
        prev.filter((code) => {
          const match = res.seats.find((s) => s.seat_code === code);
          return match && (match.status === 'AVAILABLE' || (match.status === 'LOCKED' && match.locked_by_user_id === currentUser?.id));
        })
      );
    } catch (err) {
      if (!silent) setError((err as Error).message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (!showId) return;
    void loadSeats(false);

    // Real-time SSE seat availability stream
    const es = new EventSource(api.getRealtimeStreamUrl({ showId }));
    const onSeatsUpdated = () => {
      void loadSeats(true);
    };
    es.addEventListener('seats:updated', onSeatsUpdated);
    return () => {
      es.removeEventListener('seats:updated', onSeatsUpdated);
      es.close();
    };
  }, [showId, currentUser?.id]);

  const toggleSeat = (seat: ShowSeat) => {
    const lockedByOther =
      seat.status === 'LOCKED' && seat.locked_by_user_id !== currentUser?.id;
    if (seat.status === 'BOOKED' || seat.status === 'UNAVAILABLE' || lockedByOther) {
      return;
    }
    setError('');
    setSelectedCodes((prev) => {
      if (prev.includes(seat.seat_code)) {
        return prev.filter((c) => c !== seat.seat_code);
      }
      if (prev.length >= 8) {
        setError('Maximum 8 seats can be selected per booking.');
        return prev;
      }
      return [...prev, seat.seat_code];
    });
  };

  const selectedSeatObjects = seats.filter((s) => selectedCodes.includes(s.seat_code));
  const seatSubtotal = selectedSeatObjects.reduce((sum, s) => sum + s.price, 0);

  const handleLockAndContinue = async () => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    if (selectedCodes.length === 0) {
      setError('Select at least one seat to continue.');
      return;
    }
    setLocking(true);
    setError('');
    try {
      const lockRes = await api.lockSeats(showId, selectedCodes);
      const movie = movies.find((m) => m.id === showInfo?.movie_id);
      const theatre = theatres.find((t) => t.id === showInfo?.theatre_id);
      onProceedToFoodStep({
        kind: 'MOVIE',
        show: showInfo ?? undefined,
        movie,
        theatre,
        selectedSeats: selectedSeatObjects.map((s) => ({
          seatCode: s.seat_code,
          price: s.price,
          category: s.category,
        })),
        lockExpiresAt: lockRes.expiresAt,
        foodCart: [],
        companions: [],
      });
    } catch (err) {
      setError((err as Error).message);
      void loadSeats(true);
    } finally {
      setLocking(false);
    }
  };

  const getSeatButtonStyle = (seat: ShowSeat) => {
    const isSelected = selectedCodes.includes(seat.seat_code);
    const isLockedOther = seat.status === 'LOCKED' && seat.locked_by_user_id !== currentUser?.id;
    if (seat.status === 'BOOKED' || isLockedOther) {
      return 'bg-[#2a2a33] border-[#3b3b47] text-white/30 cursor-not-allowed';
    }
    if (seat.status === 'UNAVAILABLE') {
      return 'bg-transparent border-dashed border-white/15 text-white/20 cursor-not-allowed';
    }
    if (isSelected) {
      return 'bg-gradient-to-br from-[#D90913] to-[#FF242C] border-[#FF5A60] text-white shadow-[0_0_12px_rgba(229,9,20,0.65)] scale-105';
    }
    if (seat.category === 'RECLINER') {
      return 'bg-[#1c141d] border-purple-400/50 text-purple-200 hover:border-[#FF1822]';
    }
    if (seat.category === 'COUPLE') {
      return 'bg-[#1f1318] border-pink-400/50 text-pink-200 hover:border-[#FF1822]';
    }
    if (seat.category === 'PREMIUM') {
      return 'bg-[#191612] border-amber-400/50 text-amber-200 hover:border-[#FF1822]';
    }
    if (seat.category === 'DISABLED') {
      return 'bg-[#121a20] border-sky-400/50 text-sky-200 hover:border-[#FF1822]';
    }
    return 'bg-[#14141a] border-white/20 text-white/85 hover:border-[#FF1822]';
  };

  return (
    <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-5 pb-28 sm:pb-8 space-y-5">
      {/* Stepper Indicator */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <span className="text-[#FF3B42]">1. Select Seats</span>
        <span>→</span>
        <span>2. Food &amp; Drinks</span>
        <span>→</span>
        <span>3. Companions</span>
        <span>→</span>
        <span>4. Checkout</span>
      </div>

      {/* Focused Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#14141a] border border-white/10 text-xs font-semibold text-white/80 hover:text-white cursor-pointer min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Show</span>
        </button>

        {showInfo && (
          <div className="text-left sm:text-right">
            <h1 className="font-display text-lg sm:text-2xl font-extrabold text-white">
              {String(showInfo.movie_title ?? 'Seat Selection')}
            </h1>
            <p className="text-xs text-white/65 flex sm:justify-end items-center gap-1.5 flex-wrap">
              <span>{String(showInfo.theatre_name)} ({String(showInfo.theatre_location)})</span>
              <span>·</span>
              <span>{showInfo.show_date}</span>
              <span>·</span>
              <span className="text-white font-semibold">{showInfo.show_time}</span>
              <span className="inline-flex items-center gap-1 text-emerald-300 font-semibold ml-1">
                <Wifi className="w-3 h-3" /> Live
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Seat Legend */}
      <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-3.5 flex flex-wrap items-center justify-center gap-3.5 text-[11px]">
        <span className="flex items-center gap-1.5 text-white/80">
          <span className="w-3.5 h-3.5 rounded border border-white/30 bg-[#14141a]" /> Standard
        </span>
        <span className="flex items-center gap-1.5 text-amber-200">
          <span className="w-3.5 h-3.5 rounded border border-amber-400/60 bg-[#191612]" /> Premium
        </span>
        <span className="flex items-center gap-1.5 text-purple-200">
          <span className="w-3.5 h-3.5 rounded border border-purple-400/60 bg-[#1c141d]" /> Recliner
        </span>
        <span className="flex items-center gap-1.5 text-pink-200">
          <span className="w-3.5 h-3.5 rounded border border-pink-400/60 bg-[#1f1318]" /> Couple
        </span>
        <span className="flex items-center gap-1.5 text-white font-semibold">
          <span className="w-3.5 h-3.5 rounded bg-[#E50914] border border-[#FF5A60]" /> Selected
        </span>
        <span className="flex items-center gap-1.5 text-white/45">
          <span className="w-3.5 h-3.5 rounded bg-[#2a2a33] border border-[#3b3b47]" /> Booked
        </span>
      </div>

      {error && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/60 px-4 py-3 text-xs text-[#FF9296] flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Cinema Screen & Seat Grid */}
      <div className="rounded-3xl bg-[#0c0c10] border border-white/15 p-4 sm:p-7 overflow-x-auto">
        <div className="max-w-lg mx-auto mb-7 text-center">
          <div className="h-2 rounded-t-full bg-gradient-to-r from-transparent via-[#FF252E] to-transparent shadow-[0_0_20px_rgba(255,37,46,0.6)]" />
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/55 mt-2 flex items-center justify-center gap-1.5">
            <Monitor className="w-3.5 h-3.5 text-[#FF252E]" />
            <span>Screen · {String(showInfo?.projection ?? '4K Laser')}</span>
          </p>
        </div>

        {loading ? (
          <p className="text-center text-sm text-white/60 py-10">Loading live seat availability...</p>
        ) : (
          <div className="space-y-2.5 min-w-[540px] max-w-2xl mx-auto">
            {ROWS.map((row) => {
              const rowSeats = seats
                .filter((s) => s.seat_code.startsWith(row))
                .sort((a, b) => Number(a.seat_code.slice(1)) - Number(b.seat_code.slice(1)));

              return (
                <div key={row} className="flex items-center justify-center gap-2">
                  <span className="w-5 text-xs font-bold text-white/50 text-center">{row}</span>
                  <div className="grid grid-cols-10 gap-1.5 sm:gap-2 flex-1">
                    {rowSeats.map((seat) => {
                      const lockedByOther =
                        seat.status === 'LOCKED' && seat.locked_by_user_id !== currentUser?.id;
                      const disabled =
                        seat.status === 'BOOKED' ||
                        seat.status === 'UNAVAILABLE' ||
                        lockedByOther;
                      return (
                        <button
                          key={seat.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleSeat(seat)}
                          aria-label={`Seat ${seat.seat_code}, ${seat.category}, ₹${seat.price}, ${seat.status}`}
                          title={`${seat.seat_code} · ${seat.category} · ₹${seat.price}`}
                          className={`min-h-[40px] sm:min-h-[38px] rounded-lg border text-[11px] font-bold transition-all cursor-pointer flex items-center justify-center ${getSeatButtonStyle(seat)}`}
                        >
                          {seat.seat_code}
                        </button>
                      );
                    })}
                  </div>
                  <span className="w-5 text-xs font-bold text-white/50 text-center">{row}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="sticky bottom-14 md:bottom-3 z-30 rounded-2xl bg-[#111116]/95 backdrop-blur-md border border-white/15 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xl">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 text-xs text-white/70">
            <Armchair className="w-4 h-4 text-[#FF252E] shrink-0" />
            <span>
              {selectedCodes.length > 0
                ? `${selectedCodes.length} Seat${selectedCodes.length > 1 ? 's' : ''}: ${selectedCodes.join(', ')}`
                : 'Tap seats to select (max 8)'}
            </span>
          </div>
          <p className="text-lg font-extrabold text-white tabular-nums">
            Seats Subtotal: ₹{seatSubtotal}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-flex items-center gap-1.5 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-400/25 px-3 py-1.5 rounded-full">
            <Clock className="w-3.5 h-3.5" />
            <span>10-min seat lock</span>
          </span>
          <button
            type="button"
            disabled={locking || selectedCodes.length === 0}
            onClick={handleLockAndContinue}
            className="w-full sm:w-auto px-7 py-3 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] disabled:opacity-45 text-white text-xs sm:text-sm font-bold shadow-[0_4px_18px_rgba(229,9,20,0.45)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
          >
            <span>{locking ? 'Locking Seats...' : 'Continue to Food & Drinks'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

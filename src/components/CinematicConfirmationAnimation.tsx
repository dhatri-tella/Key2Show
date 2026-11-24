import React, { useEffect, useState } from 'react';
import { Film, CheckCircle2, Ticket, ArrowRight } from 'lucide-react';

interface CinematicConfirmationAnimationProps {
  movieTitle: string;
  theatreName?: string;
  showTime?: string;
  showDate?: string;
  seats: string[];
  bookingCode?: string;
  onFinish: () => void;
}

export const CinematicConfirmationAnimation: React.FC<CinematicConfirmationAnimationProps> = ({
  movieTitle,
  theatreName,
  showTime,
  showDate,
  seats,
  bookingCode,
  onFinish,
}) => {
  // Phase: 'clapper' (0 to 1.1s) -> 'confirmed' (1.1s onward)
  const [phase, setPhase] = useState<'clapper' | 'confirmed'>('clapper');

  useEffect(() => {
    const clapperTimer = window.setTimeout(() => {
      setPhase('confirmed');
    }, 1100);

    // Auto-advance after 3.8s total so user doesn't get stuck if they don't click
    const autoAdvanceTimer = window.setTimeout(() => {
      onFinish();
    }, 4200);

    return () => {
      window.clearTimeout(clapperTimer);
      window.clearTimeout(autoAdvanceTimer);
    };
  }, [onFinish]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Booking Confirmation"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-300"
    >
      {phase === 'clapper' ? (
        <div className="flex flex-col items-center justify-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-300">
          {/* Animated Clapperboard */}
          <div className="relative w-40 h-32 sm:w-48 sm:h-36 bg-[#161616] rounded-xl border border-white/20 shadow-2xl shadow-[#E50914]/40 overflow-hidden flex flex-col">
            {/* Clapper Top Bar */}
            <div className="h-10 bg-[#0A0A0A] border-b-2 border-[#E50914] flex items-center justify-center overflow-hidden relative">
              <div
                className="w-full h-full flex"
                style={{
                  background:
                    'repeating-linear-gradient(45deg, #0A0A0A, #0A0A0A 12px, #E50914 12px, #E50914 24px)',
                }}
              />
            </div>
            {/* Clapper Body */}
            <div className="flex-1 p-3 flex flex-col justify-between text-left font-mono">
              <div className="flex justify-between items-center text-[10px] tracking-widest text-white/60">
                <span>SCENE: KEY2SHOW</span>
                <span>TAKE: 01</span>
              </div>
              <div className="text-center font-black tracking-widest text-[#E50914] text-lg animate-pulse">
                ACTION!
              </div>
              <div className="text-[9px] text-white/40 text-center tracking-wider">
                CONFIRMING SEATS...
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-white text-xl font-black uppercase tracking-wider flex items-center justify-center gap-2">
              <Film className="w-5 h-5 text-[#E50914] animate-spin" />
              Rolling the Reel...
            </h3>
            <p className="text-white/60 text-xs">Securing your tickets & single QR pass</p>
          </div>
        </div>
      ) : (
        /* Confirmed Modal Card */
        <div className="w-full max-w-md bg-[#101010] border border-[#E50914]/40 rounded-2xl p-6 sm:p-7 shadow-2xl shadow-[#E50914]/30 space-y-5 animate-in fade-in zoom-in-95 duration-400">
          <div className="text-center space-y-2">
            <div className="inline-flex p-3 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 mb-1">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="inline-block px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF3B42] text-[10px] font-bold tracking-widest uppercase">
              🎬 TAKE 1 — CUT!
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">BOOKING CONFIRMED</h2>
            {bookingCode && (
              <p className="text-xs font-mono text-emerald-400">
                Booking ID: <span className="font-bold">{bookingCode}</span>
              </p>
            )}
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3 text-xs">
            <div className="flex justify-between items-start gap-2">
              <span className="text-white/50">Movie / Event</span>
              <span className="font-bold text-white text-right">{movieTitle}</span>
            </div>
            {theatreName && (
              <div className="flex justify-between items-start gap-2">
                <span className="text-white/50">Theatre</span>
                <span className="font-semibold text-white/90 text-right">{theatreName}</span>
              </div>
            )}
            {(showDate || showTime) && (
              <div className="flex justify-between items-center gap-2">
                <span className="text-white/50">Showtime</span>
                <span className="font-semibold text-white/90">
                  {showDate ? `${showDate} • ` : ''}
                  {showTime || ''}
                </span>
              </div>
            )}
            {seats.length > 0 && (
              <div className="flex justify-between items-center gap-2 border-t border-white/10 pt-2">
                <span className="text-white/50">Seats ({seats.length})</span>
                <span className="font-mono font-bold text-emerald-400">{seats.join(', ')}</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-white/50 text-center flex items-center justify-center gap-1.5">
            <Ticket className="w-3.5 h-3.5 text-[#E50914]" />
            <span>1 Booking = 1 QR Code generated for your party</span>
          </div>

          <button
            type="button"
            onClick={onFinish}
            className="w-full py-3.5 px-5 rounded-xl bg-[#E50914] hover:bg-[#FF1822] text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-[#E50914]/30 flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
          >
            <span>View Ticket Pass</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

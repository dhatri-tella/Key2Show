import React from 'react';
import { AlertOctagon, RotateCcw, Home, HelpCircle } from 'lucide-react';
import { navigate } from '../../utils/router';

interface BookingFailurePageProps {
  reason?: string;
  onRetry?: () => void;
  onGoHome?: () => void;
  onGoBookings?: () => void;
}

export const BookingFailurePage: React.FC<BookingFailurePageProps> = ({
  reason,
  onRetry,
  onGoHome,
  onGoBookings,
}) => {
  const failureMessage =
    reason ||
    'The bank gateway declined the transaction or the session timed out. No amount has been deducted from your account. If deducted, it will be automatically refunded within 24 hours.';

  const handleRetry = () => {
    if (onRetry) {
      onRetry();
    } else {
      navigate('/checkout');
    }
  };

  const handleHome = () => {
    if (onGoHome) {
      onGoHome();
    } else {
      navigate('/');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
        <AlertOctagon className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold tracking-widest uppercase">
          Transaction Failed
        </span>
        <h1 className="text-2xl font-black text-white">Payment Unsuccessful</h1>
        <p className="text-xs text-white/60 leading-relaxed px-2">{failureMessage}</p>
      </div>

      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-left space-y-2.5 text-xs">
        <div className="flex items-center gap-2 text-white/70 font-semibold">
          <HelpCircle className="w-4 h-4 text-red-400" />
          <span>Troubleshooting Tips</span>
        </div>
        <ul className="text-white/50 space-y-1.5 list-disc list-inside">
          <li>Ensure UPI ID or Card details are typed correctly.</li>
          <li>Check that your daily online transaction limit has not been exceeded.</li>
          <li>Complete the OTP / UPI PIN prompt within 5 minutes.</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          onClick={handleRetry}
          className="flex-1 py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#FF1822] text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition min-h-[44px]"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Try Again</span>
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition min-h-[44px]"
        >
          <Home className="w-4 h-4" />
          <span>Return Home</span>
        </button>
        {onGoBookings && (
          <button
            type="button"
            onClick={onGoBookings}
            className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-bold text-xs uppercase tracking-wider flex items-center justify-center min-h-[44px]"
          >
            My Bookings
          </button>
        )}
      </div>
    </div>
  );
};

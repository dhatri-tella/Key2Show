import React, { useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Clock, Lock, ShieldCheck } from 'lucide-react';
import { api } from '../../utils/api';
import { CinematicConfirmationAnimation } from '../../components/CinematicConfirmationAnimation';
import { SkeletonCard } from '../../components/skeletons/LoadingSkeletons';
import type { CheckoutDraft, PaymentSession, SafeUser } from '../../types/platform';

interface RazorpayPaymentResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpayPaymentResponse) => void;
  modal: { ondismiss: () => void };
}

interface RazorpayCheckoutInstance {
  open: () => void;
  on: (event: 'payment.failed', handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

function loadRazorpayCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      reject(new Error('Could not load Razorpay checkout. Check your connection and try again.'));
    };
    document.head.appendChild(script);
  });
}

interface PaymentPageProps {
  draft: CheckoutDraft;
  paymentSession: PaymentSession | null;
  currentUser: SafeUser | null;
  onPaymentSuccess: (bookingId: string, bookingCode: string) => void;
  onPaymentFailure: (reason: string) => void;
  onBack: () => void;
}

export const PaymentPage: React.FC<PaymentPageProps> = ({
  draft,
  paymentSession,
  currentUser,
  onPaymentSuccess,
  onPaymentFailure,
  onBack,
}) => {
  const [session, setSession] = useState<PaymentSession | null>(paymentSession);
  const [initLoading, setInitLoading] = useState(!paymentSession);
  const [initError, setInitError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [simulateDecline, setSimulateDecline] = useState(false);
  const [remainingSec, setRemainingSec] = useState(600);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingId: string;
    bookingCode: string;
  } | null>(null);
  const [idempotencyKey] = useState(
    () => `k2s-${crypto.randomUUID()}`
  );

  useEffect(() => {
    if (session) {
      setRemainingSec(Math.max(0, Math.floor((session.expiresAt - Date.now()) / 1000)));
      return;
    }

    let active = true;
    (async () => {
      try {
        setInitLoading(true);
        const res = await api.createPaymentSession({ draft, idempotencyKey });
        if (active) {
          setSession({
            sessionId: res.sessionId,
            amount: res.amount,
            currency: res.currency,
            expiresAt: res.expiresAt,
            summary: res.summary,
            razorpayOrderId: res.razorpayOrderId,
            razorpayKeyId: res.razorpayKeyId,
          });
        }
      } catch (err) {
        if (active) {
          setInitError((err as Error).message || 'Failed to initialize Razorpay checkout.');
        }
      } finally {
        if (active) setInitLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session, draft]);

  useEffect(() => {
    if (remainingSec <= 0) return;
    const interval = window.setInterval(() => {
      setRemainingSec((previous) => Math.max(0, previous - 1));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [remainingSec]);

  const verifyPayment = async (response: RazorpayPaymentResponse) => {
    if (!session) return;
    setProcessing(true);
    setErrorMessage('');
    try {
      const result = await api.verifyPaymentAndBook({
        sessionId: session.sessionId,
        razorpayOrderId: response.razorpay_order_id,
        razorpayPaymentId: response.razorpay_payment_id,
        razorpaySignature: response.razorpay_signature,
      });

      if (!result.verified || result.status !== 'SUCCESS') {
        throw new Error(result.reason || 'Razorpay could not verify the payment.');
      }
      if (!result.bookingId || !result.bookingCode) {
        throw new Error('Payment was verified, but booking confirmation was incomplete. Please contact support.');
      }

      setConfirmedBooking({ bookingId: result.bookingId, bookingCode: result.bookingCode });
    } catch (err) {
      const message = (err as Error).message || 'Payment verification failed.';
      setProcessing(false);
      setErrorMessage(message);
      onPaymentFailure(message);
    }
  };

  const handlePay = async () => {
    if (!session) return;
    if (remainingSec <= 0) {
      setErrorMessage('Payment session expired. Please return to checkout and refresh your reservation.');
      return;
    }

    setProcessing(true);
    setErrorMessage('');

    if (import.meta.env.DEV && simulateDecline) {
      try {
        await api.verifyPaymentAndBook({
          sessionId: session.sessionId,
          razorpayOrderId: session.razorpayOrderId,
          razorpayPaymentId: '',
          razorpaySignature: '',
          simulateFailure: true,
        });
      } catch (err) {
        const message = (err as Error).message || 'Simulated payment decline.';
        setProcessing(false);
        setErrorMessage(message);
        onPaymentFailure(message);
      }
      return;
    }

    try {
      await loadRazorpayCheckout();
      const Razorpay = window.Razorpay;
      if (!Razorpay) throw new Error('Razorpay checkout did not initialize. Please try again.');

      const checkout = new Razorpay({
        key: session.razorpayKeyId,
        amount: Math.round(session.amount * 100),
        currency: session.currency,
        name: 'Key2Show',
        description: session.summary.title || 'Ticket booking',
        order_id: session.razorpayOrderId,
        prefill: {
          name: currentUser?.name ?? '',
          email: currentUser?.email ?? '',
          contact: currentUser?.mobile ?? '',
        },
        theme: { color: '#E50914' },
        handler: (response) => void verifyPayment(response),
        modal: {
          ondismiss: () => {
            setProcessing(false);
            setErrorMessage('Payment was cancelled and no booking was confirmed.');
            onPaymentFailure('Payment cancelled. No booking was confirmed.');
          },
        },
      });
      checkout.on('payment.failed', (response) => {
        const message = response.error?.description || 'Razorpay could not complete the payment.';
        setProcessing(false);
        setErrorMessage(message);
        onPaymentFailure(message);
      });
      checkout.open();
    } catch (err) {
      setProcessing(false);
      setErrorMessage((err as Error).message || 'Unable to open Razorpay checkout.');
    }
  };

  const mm = String(Math.floor(remainingSec / 60)).padStart(2, '0');
  const ss = String(remainingSec % 60).padStart(2, '0');
  const seats = draft.selectedSeats.map((seat) => seat.seatCode);

  if (initLoading) {
    return (
      <div className="max-w-[800px] mx-auto px-4 py-8 space-y-4">
        <div className="flex items-center gap-2 text-white/50 text-xs">
          <ArrowLeft className="w-4 h-4 cursor-pointer" onClick={onBack} />
          <span>Creating secure Razorpay order...</span>
        </div>
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (initError || !session) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-white">Razorpay Checkout Unavailable</h2>
        <p className="text-xs text-white/60">{initError || 'Unable to start the payment session.'}</p>
        <button
          type="button"
          onClick={onBack}
          className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
        >
          Return to Checkout
        </button>
      </div>
    );
  }

  return (
    <>
      {confirmedBooking && (
        <CinematicConfirmationAnimation
          movieTitle={session.summary.title || draft.movie?.title || 'Event Booking'}
          theatreName={session.summary.venue || draft.theatre?.name}
          showTime={draft.show?.show_time}
          showDate={draft.show?.show_date}
          seats={seats}
          bookingCode={confirmedBooking.bookingCode}
          onFinish={() => onPaymentSuccess(confirmedBooking.bookingId, confirmedBooking.bookingCode)}
        />
      )}

      <div className="max-w-[800px] mx-auto px-4 lg:px-8 py-6 pb-28 sm:pb-12 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
          <button
            type="button"
            onClick={onBack}
            disabled={processing}
            className="flex items-center gap-2 text-xs font-bold text-white/70 hover:text-white transition disabled:opacity-40 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Checkout
          </button>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            Payment hold: {mm}:{ss}
          </div>
        </div>

        <section className="p-5 sm:p-6 rounded-2xl bg-[#0F0F0F] border border-white/10 space-y-5">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-400" />
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">Razorpay Secure Checkout</h1>
          </div>
          <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Order</p>
              <h2 className="text-base font-black text-white">{session.summary.title || 'Selected Experience'}</h2>
              <p className="text-xs text-white/60">
                {session.summary.venue || draft.theatre?.name || 'Venue'} · {session.summary.ticketCount} ticket(s)
                {seats.length > 0 ? ` (${seats.join(', ')})` : ''}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold tracking-widest text-white/40 uppercase">Total Payable</p>
              <p className="text-2xl font-black text-white">₹{session.amount}</p>
            </div>
          </div>

          <p className="text-xs text-white/55 leading-relaxed">
            UPI, cards, net banking, and other supported payment methods are completed securely on Razorpay. Key2Show does not collect or store your card details.
          </p>

          {import.meta.env.DEV && (
            <label className="flex items-center gap-2 text-xs text-amber-300/80 cursor-pointer">
              <input
                type="checkbox"
                checked={simulateDecline}
                onChange={(event) => setSimulateDecline(event.target.checked)}
                disabled={processing}
                className="accent-amber-500"
              />
              Simulate a declined payment (development only)
            </label>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handlePay}
            disabled={processing || remainingSec <= 0}
            className="w-full py-4 rounded-xl bg-[#E50914] hover:bg-[#FF1822] text-white font-bold text-sm uppercase tracking-wider shadow-lg shadow-[#E50914]/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2 min-h-[48px]"
          >
            <ShieldCheck className="w-4 h-4" />
            {processing ? 'Opening secure payment...' : `Pay ₹${session.amount} with Razorpay`}
          </button>
        </section>
      </div>
    </>
  );
};

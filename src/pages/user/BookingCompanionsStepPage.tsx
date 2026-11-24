import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  CheckCircle2,
  QrCode,
  Plus,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api';
import type { CheckoutDraft, CompanionDraft, SafeUser } from '../../types/platform';

interface BookingCompanionsStepPageProps {
  draft: CheckoutDraft;
  currentUser: SafeUser | null;
  onUpdateCompanions: (companions: CompanionDraft[], isFamilyBooking: boolean) => void;
  onContinueToCheckout: () => void;
  onBack: () => void;
  onRequireLogin: () => void;
}

const FAMILY_PRESETS = [
  { name: 'Lakshmi Sharma', mobile: '+91 98480 22222', relation: 'Mother' },
  { name: 'Ananya Sharma', mobile: '+91 98480 33333', relation: 'Daughter' },
  { name: 'Arjun Reddy', mobile: '+91 98480 44444', relation: 'Friend' },
];

export const BookingCompanionsStepPage: React.FC<BookingCompanionsStepPageProps> = ({
  draft,
  currentUser,
  onUpdateCompanions,
  onContinueToCheckout,
  onBack,
  onRequireLogin,
}) => {
  const [companions, setCompanions] = useState<CompanionDraft[]>(() => draft.companions ?? []);
  const [otpInputs, setOtpInputs] = useState<Record<number, string>>({});
  const [error, setError] = useState('');

  const seatsList = draft.selectedSeats.map((s) => s.seatCode);
  const maxCompanions = Math.max(1, seatsList.length);

  const syncUp = (next: CompanionDraft[]) => {
    setCompanions(next);
    onUpdateCompanions(next, next.some((c) => c.mobile.trim().length >= 10));
  };

  const addEmptyCompanion = () => {
    if (companions.length >= maxCompanions) return;
    const nextSeat = seatsList[companions.length] ?? seatsList[0] ?? 'A1';
    syncUp([
      ...companions,
      {
        seatCode: nextSeat,
        name: '',
        mobile: '',
        relation: companions.length === 0 ? 'Mother' : 'Family',
        verified: false,
      },
    ]);
  };

  const addPresetCompanion = (preset: (typeof FAMILY_PRESETS)[number]) => {
    if (companions.some((c) => c.mobile === preset.mobile)) return;
    if (companions.length >= maxCompanions) return;
    const nextSeat = seatsList[companions.length] ?? seatsList[0] ?? 'A1';
    syncUp([
      ...companions,
      {
        seatCode: nextSeat,
        name: preset.name,
        mobile: preset.mobile,
        relation: preset.relation,
        verified: true,
      },
    ]);
  };

  const updateRow = (idx: number, patch: Partial<CompanionDraft>) => {
    const next = companions.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    syncUp(next);
  };

  const removeRow = (idx: number) => {
    syncUp(companions.filter((_, i) => i !== idx));
  };

  const handleSendOtp = async (idx: number, mobile: string) => {
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    setError('');
    try {
      const res = await api.sendCompanionOtp(mobile);
      updateRow(idx, { sandboxOtp: res.sandboxOtp });
      if (res.sandboxOtp) {
        setOtpInputs((prev) => ({ ...prev, [idx]: res.sandboxOtp! }));
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleVerifyOtp = async (idx: number, mobile: string) => {
    const otpCode = otpInputs[idx] ?? '';
    setError('');
    try {
      await api.verifyCompanionOtp({ mobile, otpCode });
      updateRow(idx, { verified: true });
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 lg:px-8 py-5 pb-32 sm:pb-10 space-y-5">
      {/* Stepper */}
      <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-white/50">
        <span className="text-emerald-400">1. Seats</span>
        <span>→</span>
        <span className="text-emerald-400">2. Food</span>
        <span>→</span>
        <span className="text-[#FF3B42]">3. Companions</span>
        <span>→</span>
        <span>4. Checkout</span>
      </div>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-white/70 hover:text-white cursor-pointer mb-1 min-h-[36px]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Food &amp; Drinks</span>
          </button>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#FF252E]" />
            <span>Who Else Is Attending?</span>
          </h1>
          <p className="text-xs text-white/65 mt-1">
            Booking {seatsList.length} seat{seatsList.length > 1 ? 's' : ''}:{' '}
            <strong className="text-white">{seatsList.join(', ')}</strong>. Share access by mobile number even if you are not attending yourself.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            syncUp([]);
            onContinueToCheckout();
          }}
          className="px-5 py-2.5 rounded-full bg-[#17171f] border border-white/20 hover:border-white/40 text-xs font-bold text-white cursor-pointer min-h-[44px]"
        >
          Skip Sharing →
        </button>
      </div>

      {/* Single QR Rule Banner */}
      <div className="rounded-2xl bg-[#191014] border border-[#FF1822]/40 p-4 flex items-start gap-3">
        <QrCode className="w-5 h-5 text-[#FF3B43] shrink-0 mt-0.5" />
        <div className="text-xs text-white/85 space-y-0.5">
          <p className="font-bold text-white">One Booking = One Shared QR Code</p>
          <p className="text-white/70">
            Key2Show generates <strong>1 booking QR code</strong> for all {seatsList.length} tickets. Every verified companion added below receives instant real-time access to the exact same QR pass in their &ldquo;Shared With Me&rdquo; tab.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/60 px-4 py-3 text-xs text-[#FF9296]">
          {error}
        </div>
      )}

      {/* Quick Family Presets */}
      <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 space-y-2.5">
        <p className="text-xs font-bold text-white">Quick Add Saved Family &amp; Companions</p>
        <div className="flex flex-wrap gap-2">
          {FAMILY_PRESETS.map((preset) => (
            <button
              key={preset.mobile}
              type="button"
              disabled={companions.some((c) => c.mobile === preset.mobile) || companions.length >= maxCompanions}
              onClick={() => addPresetCompanion(preset)}
              className="px-3.5 py-2 rounded-full bg-[#171720] border border-white/15 hover:border-[#FF1822] disabled:opacity-40 text-xs font-semibold text-white cursor-pointer min-h-[40px]"
            >
              + {preset.relation}: {preset.name}
            </button>
          ))}
          {companions.length < maxCompanions && (
            <button
              type="button"
              onClick={addEmptyCompanion}
              className="px-4 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Companion Mobile</span>
            </button>
          )}
        </div>
      </div>

      {/* Companion Rows */}
      <div className="space-y-3">
        {companions.map((comp, idx) => (
          <div
            key={idx}
            className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">
                Attendee #{idx + 1} · Shared Booking Access
              </span>
              <button
                type="button"
                aria-label={`Remove attendee ${idx + 1}`}
                onClick={() => removeRow(idx)}
                className="p-2 rounded-lg bg-white/5 hover:bg-[#2a1014] text-white/60 hover:text-[#FF4A52] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={comp.name}
                onChange={(e) => updateRow(idx, { name: e.target.value })}
                placeholder="Name (e.g. Lakshmi Sharma)"
                className="px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
              />
              <input
                type="tel"
                value={comp.mobile}
                onChange={(e) => updateRow(idx, { mobile: e.target.value, verified: false })}
                placeholder="+91 98480 22222"
                className="px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
              />
              <select
                aria-label={`Relation for attendee ${idx + 1}`}
                value={comp.relation}
                onChange={(e) => updateRow(idx, { relation: e.target.value })}
                className="px-3.5 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[44px]"
              >
                <option value="Mother">Mother</option>
                <option value="Daughter">Daughter</option>
                <option value="Sister">Sister</option>
                <option value="Father">Father</option>
                <option value="Spouse">Spouse</option>
                <option value="Friend">Friend</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {comp.verified ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Verified — Instant Shared QR Access Ready</span>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={!comp.mobile.trim()}
                    onClick={() => handleSendOtp(idx, comp.mobile)}
                    className="px-3.5 py-2 rounded-xl bg-[#252530] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer disabled:opacity-40 min-h-[40px]"
                  >
                    Send OTP
                  </button>
                  <input
                    type="text"
                    value={otpInputs[idx] ?? ''}
                    onChange={(e) => setOtpInputs((prev) => ({ ...prev, [idx]: e.target.value }))}
                    placeholder={comp.sandboxOtp ? `OTP: ${comp.sandboxOtp}` : 'Enter OTP'}
                    className="w-32 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white min-h-[40px]"
                  />
                  <button
                    type="button"
                    disabled={!otpInputs[idx]}
                    onClick={() => handleVerifyOtp(idx, comp.mobile)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white cursor-pointer disabled:opacity-40 min-h-[40px]"
                  >
                    Verify
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom CTA */}
      <div className="sticky bottom-14 md:bottom-3 z-30 rounded-2xl bg-[#111116]/95 backdrop-blur-md border border-white/15 p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shadow-2xl">
        <p className="text-xs text-white/75">
          {companions.length > 0
            ? `${companions.length} companion${companions.length > 1 ? 's' : ''} added · All share 1 Booking QR`
            : 'Booking only for yourself (you can add companions after checkout too)'}
        </p>

        <button
          type="button"
          onClick={onContinueToCheckout}
          className="px-7 py-3 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs sm:text-sm font-bold shadow-[0_4px_18px_rgba(229,9,20,0.45)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
        >
          <span>Continue to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

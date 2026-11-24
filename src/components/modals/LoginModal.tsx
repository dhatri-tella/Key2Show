import React, { useState } from 'react';
import { X, User, Ticket, LogOut, QrCode } from 'lucide-react';
import { Logo } from '../Logo';
import type { ConfirmedTicket } from './MovieDetailsModal';

interface LoginModalProps {
  mode: 'auth' | 'bookings';
  userName: string | null;
  bookings: ConfirmedTicket[];
  onClose: () => void;
  onLoginSuccess: (name: string) => void;
  onLogout: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  mode,
  userName,
  bookings,
  onClose,
  onLoginSuccess,
  onLogout,
}) => {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim() || !passwordInput.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (tab === 'signup' && !nameInput.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const derivedName =
      tab === 'signup'
        ? nameInput.trim()
        : emailInput.split('@')[0].replace(/[^a-zA-Z0-9 ]/g, ' ').trim() || 'Guest';
    onLoginSuccess(derivedName);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'bookings' ? 'My Bookings' : 'Account Sign In'}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute right-4 top-4 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="mb-5">
          <Logo compact showTagline={false} />
        </div>

        {mode === 'bookings' || userName ? (
          <div className="space-y-4">
            {userName && (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-[#15151a] border border-white/10">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[#E50914] text-white flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">{userName}</p>
                    <p className="text-[11px] text-white/60">Key2Show Member</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-xs font-semibold text-white cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            <div>
              <h3 className="font-display text-base font-bold text-white flex items-center gap-2 mb-3">
                <Ticket className="w-4 h-4 text-[#FF1822]" />
                <span>Your Tickets ({bookings.length})</span>
              </h3>

              {bookings.length === 0 ? (
                <p className="text-xs text-white/65 py-6 text-center rounded-xl border border-white/10 bg-[#121216]">
                  No tickets booked yet. Select any movie or event to book instant QR tickets.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {bookings.map((b) => (
                    <div
                      key={b.id}
                      className="rounded-xl bg-[#141419] border border-white/15 p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-white truncate">{b.title}</h4>
                        <p className="text-[11px] text-white/70 truncate">{b.venue}</p>
                        <p className="text-[11px] text-white/60 mt-0.5">
                          {b.dateLabel} · {b.showtime} · Seats: {b.seats.join(', ')}
                        </p>
                        <code className="text-[10px] text-[#FF3B42] block mt-1">
                          {b.ticketCode}
                        </code>
                      </div>
                      <div className="p-1.5 rounded-lg bg-white text-black shrink-0">
                        <QrCode className="w-9 h-9" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <div className="flex rounded-full bg-[#15151a] p-1 border border-white/10 mb-5">
              <button
                type="button"
                onClick={() => {
                  setTab('login');
                  setError('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'login' ? 'bg-[#E50914] text-white' : 'text-white/70'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('signup');
                  setError('');
                }}
                className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  tab === 'signup' ? 'bg-[#E50914] text-white' : 'text-white/70'
                }`}
              >
                Create Account
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {tab === 'signup' && (
                <div>
                  <label htmlFor="auth-name" className="block text-xs text-white/75 mb-1">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Dhatri Rao"
                    className="w-full rounded-xl bg-[#16161b] border border-white/15 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF1822]"
                  />
                </div>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs text-white/75 mb-1">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-xl bg-[#16161b] border border-white/15 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF1822]"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs text-white/75 mb-1">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl bg-[#16161b] border border-white/15 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-[#FF1822]"
                />
              </div>

              {error && <p className="text-xs text-[#FF4750]">{error}</p>}

              <button
                type="submit"
                className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white font-bold text-sm k2s-red-glow cursor-pointer hover:brightness-110"
              >
                {tab === 'login' ? 'Sign In to Key2Show' : 'Create Key2Show Account'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

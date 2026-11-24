import React, { useEffect, useState } from 'react';
import {
  Camera,
  CheckCircle2,
  QrCode,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Users,
  UtensilsCrossed,
  XCircle,
} from 'lucide-react';
import { api } from '../../utils/api';
import {
  markBookingQrAsUsed,
  normalizeQrGateStatus,
  type QrGateTicketStatus,
} from '../../utils/bookingLogic';

export type TicketGateStatus = QrGateTicketStatus;

export interface ScannableBookingItem {
  qrToken: string;
  bookingCode: string;
  movieTitle: string;
  theatreName: string;
  screenName: string;
  showDate: string;
  showTime: string;
  seats: string[];
  ticketCount: number;
  bookerName: string;
  companions: { name: string; relation: string; verification_status: string }[];
  foodItems: { name: string; quantity: number }[];
  paymentStatus: string;
  qrStatus: TicketGateStatus;
  scannedAt?: string;
}

interface ScanOutcome {
  valid: boolean;
  status: TicketGateStatus | 'Invalid';
  reason: string;
  booking?: ScannableBookingItem;
}

const FALLBACK_SIMULATED_BOOKINGS: ScannableBookingItem[] = [
  {
    qrToken: 'K2SQ-FAMILY-2026-DEMO',
    bookingCode: 'K2S2026100421',
    movieTitle: 'Pushpa: The Rule',
    theatreName: 'PVR Next Galleria (Panjagutta)',
    screenName: 'Audi 1 - IMAX Laser',
    showDate: '2026-11-22',
    showTime: '07:30 PM',
    seats: ['B4', 'B5', 'B6'],
    ticketCount: 3,
    bookerName: 'Ramesh Sharma',
    companions: [
      { name: 'Lakshmi Sharma', relation: 'Mother', verification_status: 'VERIFIED' },
      { name: 'Ananya Sharma', relation: 'Daughter', verification_status: 'VERIFIED' },
    ],
    foodItems: [{ name: 'Cheese Popcorn Tub + 2 Coke', quantity: 1 }],
    paymentStatus: 'PAID',
    qrStatus: 'Active',
  },
];

export const AdminQrScannerView: React.FC = () => {
  const [tokenInput, setTokenInput] = useState('');
  const [bookingsQueue, setBookingsQueue] = useState<ScannableBookingItem[]>([]);
  const [scanResult, setScanResult] = useState<ScanOutcome | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [error, setError] = useState('');
  const [entryMessage, setEntryMessage] = useState('');

  const loadIssuedBookings = async () => {
    try {
      const res = await api.adminGetBookings('');
      const loaded: ScannableBookingItem[] = res.bookings
        .filter((b) => Boolean(b.qr_token))
        .map((b) => {
          const seats = Array.isArray(b.seats) ? (b.seats as string[]) : [];
          const companions = Array.isArray(b.companionAccess)
            ? (b.companionAccess as Record<string, unknown>[]).map((c) => ({
                name: String(c.companion_name ?? c.name ?? 'Companion'),
                relation: String(c.relation ?? 'Companion'),
                verification_status: String(c.verification_status ?? 'VERIFIED'),
              }))
            : [];
          const foodItems = Array.isArray(b.foodItems)
            ? (b.foodItems as { name: string; quantity: number }[])
            : [];

          return {
            qrToken: String(b.qr_token),
            bookingCode: String(b.booking_code),
            movieTitle: String(b.movie_title),
            theatreName: String(b.theatre_name ?? 'Key2Show Venue'),
            screenName: String(b.screen_name ?? 'Screen 1'),
            showDate: String(b.show_date ?? ''),
            showTime: String(b.show_time ?? ''),
            seats,
            ticketCount: seats.length || 1,
            bookerName: String(b.booker_name ?? 'Patron'),
            companions,
            foodItems,
            paymentStatus: String(b.payment_status ?? 'PAID'),
            qrStatus:
              b.status === 'CANCELLED' ? 'Cancelled' : normalizeQrGateStatus(b.qr_status),
            scannedAt: b.scanned_at ? String(b.scanned_at) : undefined,
          };
        });
      setBookingsQueue(loaded.length > 0 ? loaded.slice(0, 16) : FALLBACK_SIMULATED_BOOKINGS);
    } catch {
      setBookingsQueue((prev) => (prev.length > 0 ? prev : FALLBACK_SIMULATED_BOOKINGS));
    }
  };

  useEffect(() => {
    void loadIssuedBookings();

    const es = new EventSource(api.getRealtimeStreamUrl({ asAdmin: true }));
    const onLiveChange = () => {
      void loadIssuedBookings();
    };
    es.addEventListener('booking:created', onLiveChange);
    es.addEventListener('booking:checked_in', onLiveChange);
    return () => {
      es.removeEventListener('booking:created', onLiveChange);
      es.removeEventListener('booking:checked_in', onLiveChange);
      es.close();
    };
  }, []);

  const validateToken = async (overrideToken?: string) => {
    const tk = (overrideToken ?? tokenInput).trim();
    if (!tk) return;

    setTokenInput(tk);
    setError('');
    setEntryMessage('');

    const localMatch = bookingsQueue.find(
      (item) => item.qrToken.toUpperCase() === tk.toUpperCase()
    );

    try {
      const res = await api.adminScanQr(tk);
      const apiBooking = res.booking;
      const mapped: ScannableBookingItem | undefined = apiBooking
        ? {
            qrToken: tk,
            bookingCode: String(apiBooking.booking_code ?? localMatch?.bookingCode ?? ''),
            movieTitle: String(apiBooking.movie_title ?? localMatch?.movieTitle ?? ''),
            theatreName: String(apiBooking.theatre_name ?? localMatch?.theatreName ?? ''),
            screenName: String(apiBooking.screen_name ?? localMatch?.screenName ?? ''),
            showDate: String(apiBooking.show_date ?? localMatch?.showDate ?? ''),
            showTime: String(apiBooking.show_time ?? localMatch?.showTime ?? ''),
            seats: Array.isArray(apiBooking.seats)
              ? (apiBooking.seats as string[])
              : localMatch?.seats ?? [],
            ticketCount: Number(apiBooking.ticketCount ?? localMatch?.ticketCount ?? 1),
            bookerName: String(apiBooking.booker_name ?? localMatch?.bookerName ?? ''),
            companions: Array.isArray(apiBooking.companionAccess)
              ? (apiBooking.companionAccess as { name: string; relation: string; verification_status: string }[])
              : localMatch?.companions ?? [],
            foodItems: Array.isArray(apiBooking.foodItems)
              ? (apiBooking.foodItems as { name: string; quantity: number }[])
              : localMatch?.foodItems ?? [],
            paymentStatus: String(apiBooking.payment_status ?? 'PAID'),
            qrStatus: normalizeQrGateStatus(res.status),
            scannedAt: apiBooking.scanned_at ? String(apiBooking.scanned_at) : undefined,
          }
        : localMatch;

      setScanResult({
        valid: res.valid,
        status: res.valid ? 'Active' : normalizeQrGateStatus(res.status),
        reason: res.reason,
        booking: mapped,
      });
    } catch (err) {
      if (localMatch) {
        const isValid = localMatch.qrStatus === 'Active';
        setScanResult({
          valid: isValid,
          status: localMatch.qrStatus,
          reason: isValid
            ? `Valid Booking QR (${localMatch.ticketCount} Tickets) — Ready for Gate Entry`
            : `Entry Rejected — Booking QR status is ${localMatch.qrStatus}`,
          booking: localMatch,
        });
      } else {
        setScanResult({
          valid: false,
          status: 'Invalid',
          reason: (err as Error).message || 'Unrecognized booking QR token',
        });
      }
    }
  };

  const handleSimulatedScan = () => {
    setIsScanning(true);
    setError('');
    setEntryMessage('');

    const candidate =
      bookingsQueue.find((b) => b.qrStatus === 'Active') ??
      bookingsQueue[0] ??
      FALLBACK_SIMULATED_BOOKINGS[0];

    window.setTimeout(() => {
      setIsScanning(false);
      if (candidate) {
        void validateToken(candidate.qrToken);
      }
    }, 450);
  };

  const handleMarkEntry = async () => {
    const activeToken = (scanResult?.booking?.qrToken ?? tokenInput).trim();
    if (!activeToken) return;

    setError('');
    const nowIso = new Date().toISOString();

    setBookingsQueue((prev) =>
      prev.map((item) => markBookingQrAsUsed(item, activeToken, nowIso))
    );

    try {
      const res = await api.adminMarkQrEntry(activeToken);
      setEntryMessage(
        `Booking ${res.bookingCode ?? ''} marked Entered (Used) at ${new Date(res.scannedAt).toLocaleTimeString()}`
      );
      await validateToken(activeToken);
      await loadIssuedBookings();
    } catch (err) {
      if (scanResult?.booking && scanResult.booking.qrStatus === 'Active') {
        setEntryMessage(`Booking marked Used at ${new Date(nowIso).toLocaleTimeString()}`);
        setScanResult((prev) =>
          prev?.booking
            ? {
                valid: false,
                status: 'Used',
                reason: 'Entry Rejected — Booking QR status is Used',
                booking: markBookingQrAsUsed(prev.booking, activeToken, nowIso),
              }
            : prev
        );
      } else {
        setError((err as Error).message);
      }
    }
  };

  const activeCount = bookingsQueue.filter((b) => b.qrStatus === 'Active').length;
  const usedCount = bookingsQueue.filter((b) => b.qrStatus === 'Used').length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
            <QrCode className="w-7 h-7 text-[#FF252E]" />
            <span>Booking Gate QR Scanner (1 Booking = 1 QR)</span>
          </h1>
          <p className="text-xs text-white/60 mt-1">
            Validates one unified QR per booking across all seats and companions, then transitions Active → Used to prevent duplicate entry.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold tabular-nums">
            Active: {activeCount}
          </span>
          <span className="px-3 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold tabular-nums">
            Used: {usedCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-5 items-start">
        {/* Left: Simulated Optical Camera QR Scanner */}
        <section
          aria-label="Simulated QR Camera Scanner"
          className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 space-y-4"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-[#FF252E]" />
              <span>Optical Gate Camera</span>
            </span>
            <button
              type="button"
              onClick={() => setCameraActive((prev) => !prev)}
              className="text-[11px] font-semibold text-white/65 hover:text-white cursor-pointer"
            >
              {cameraActive ? 'Pause Feed' : 'Resume Feed'}
            </button>
          </div>

          <div className="relative aspect-square rounded-2xl bg-[#060609] border border-white/10 overflow-hidden flex flex-col items-center justify-center p-5">
            <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-[#FF252E] rounded-tl-md" />
            <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-[#FF252E] rounded-tr-md" />
            <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-[#FF252E] rounded-bl-md" />
            <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-[#FF252E] rounded-br-md" />

            {cameraActive && (
              <div
                aria-hidden="true"
                className={`absolute inset-x-6 h-0.5 bg-gradient-to-r from-transparent via-[#FF252E] to-transparent shadow-[0_0_12px_#FF252E] transition-all duration-500 ${
                  isScanning ? 'top-1/2 opacity-100 scale-x-105' : 'top-1/3 opacity-70 animate-pulse'
                }`}
              />
            )}

            <QrCode
              className={`w-20 h-20 transition-transform duration-300 ${
                isScanning
                  ? 'text-[#FF3B42] scale-110'
                  : cameraActive
                    ? 'text-white/25'
                    : 'text-white/10'
              }`}
            />
            <p className="mt-3 text-[11px] font-medium text-white/70 text-center">
              {isScanning
                ? 'Decoding Single Booking QR...'
                : cameraActive
                  ? 'Align patron Booking QR inside the frame'
                  : 'Camera viewfinder paused'}
            </p>
          </div>

          <button
            type="button"
            disabled={isScanning}
            onClick={handleSimulatedScan}
            className="w-full py-2.5 px-4 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold shadow-[0_4px_16px_rgba(229,9,20,0.4)] hover:brightness-110 disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
          >
            {isScanning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Scanning Booking QR...</span>
              </>
            ) : (
              <>
                <ScanLine className="w-4 h-4" />
                <span>Simulate Camera QR Scan</span>
              </>
            )}
          </button>
        </section>

        {/* Right: Validator + Unified Booking Outcome */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    void validateToken();
                  }
                }}
                placeholder="Paste or scan K2SQ-... booking QR token"
                aria-label="Booking QR token"
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-xs font-mono text-white focus:border-[#FF1822] focus:outline-none min-h-[44px]"
              />
              <button
                type="button"
                onClick={() => void validateToken()}
                className="px-6 py-2.5 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer hover:brightness-110 min-h-[44px]"
              >
                Validate Booking QR
              </button>
            </div>

            {error && <p className="text-xs text-[#FF8A8F]">{error}</p>}
            {entryMessage && (
              <p className="text-xs text-emerald-300 font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4" />
                <span>{entryMessage}</span>
              </p>
            )}

            {scanResult ? (
              <div
                className={`rounded-2xl border p-5 space-y-4 ${
                  scanResult.valid
                    ? 'bg-emerald-950/35 border-emerald-500/50'
                    : 'bg-[#2a1014] border-[#FF242C]/60'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {scanResult.valid ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-6 h-6 text-[#FF4A52] shrink-0" />
                    )}
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-white">
                          {scanResult.valid
                            ? 'VALID — ADMIT PARTY'
                            : `REJECTED (${scanResult.status.toUpperCase()})`}
                        </p>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            scanResult.status === 'Active'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          Status: {scanResult.status}
                        </span>
                      </div>
                      <p className="text-xs text-white/75 mt-0.5">{scanResult.reason}</p>
                    </div>
                  </div>

                  {scanResult.valid && scanResult.status === 'Active' && (
                    <button
                      type="button"
                      onClick={handleMarkEntry}
                      className="px-5 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer shadow-lg min-h-[44px]"
                    >
                      Mark Booking as Entered
                    </button>
                  )}
                </div>

                {scanResult.booking && (
                  <div className="space-y-3 pt-3 border-t border-white/10 text-xs">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <div>
                        <span className="text-white/50 block">Booking ID</span>
                        <span className="font-mono font-bold text-white">
                          {scanResult.booking.bookingCode}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 block">Movie / Event</span>
                        <span className="font-bold text-white">
                          {scanResult.booking.movieTitle}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 block">Venue &amp; Showtime</span>
                        <span className="font-bold text-white">
                          {scanResult.booking.theatreName} ({scanResult.booking.showTime})
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 block">All Seats ({scanResult.booking.ticketCount} Tickets)</span>
                        <span className="font-bold text-emerald-300">
                          {scanResult.booking.seats.join(', ')}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 block">Primary Booker</span>
                        <span className="font-bold text-white">
                          {scanResult.booking.bookerName}
                        </span>
                      </div>
                      <div>
                        <span className="text-white/50 block">Payment Status</span>
                        <span className="font-bold text-emerald-300">
                          {scanResult.booking.paymentStatus}
                        </span>
                      </div>
                    </div>

                    {scanResult.booking.companions.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <Users className="w-3.5 h-3.5 text-[#FF3B43]" />
                        <span className="text-white/60 font-semibold">Shared Companions:</span>
                        {scanResult.booking.companions.map((c, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-white">
                            {c.name} ({c.relation})
                          </span>
                        ))}
                      </div>
                    )}

                    {scanResult.booking.foodItems.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                        <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF3B43]" />
                        <span className="text-white/60 font-semibold">Pre-Ordered Food:</span>
                        {scanResult.booking.foodItems.map((fi, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded-full bg-white/10 text-white">
                            {fi.name} × {fi.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl bg-[#14141a] border border-white/10 p-4 flex items-center gap-3 text-xs text-white/60">
                <Sparkles className="w-4 h-4 text-[#FF3B42] shrink-0" />
                <span>
                  Click <strong className="text-white">Simulate Camera QR Scan</strong> or choose a booking below to validate entry.
                </span>
              </div>
            )}
          </div>

          {/* Issued Bookings Queue (1 Entry = 1 Booking QR) */}
          <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/60">
                Active Booking QRs (Click to Scan)
              </h2>
              <button
                type="button"
                onClick={() => void loadIssuedBookings()}
                className="text-[11px] text-white/65 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {bookingsQueue.map((bk) => (
                <button
                  key={bk.qrToken}
                  type="button"
                  onClick={() => void validateToken(bk.qrToken)}
                  className={`p-3 rounded-xl bg-[#15151c] border text-left cursor-pointer flex items-center justify-between gap-2 transition-colors ${
                    scanResult?.booking?.qrToken === bk.qrToken
                      ? 'border-[#FF1822]'
                      : 'border-white/10 hover:border-[#FF1822]/70'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">
                      {bk.bookingCode} · {bk.ticketCount} Ticket{bk.ticketCount > 1 ? 's' : ''} ({bk.seats.join(', ')})
                    </p>
                    <p className="text-[10.5px] text-white/60 truncate">
                      {bk.bookerName} · {bk.movieTitle}
                    </p>
                    <p className="text-[10px] font-mono text-white/40 truncate">
                      {bk.qrToken}
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                      bk.qrStatus === 'Active'
                        ? 'bg-emerald-500/15 text-emerald-300'
                        : bk.qrStatus === 'Used'
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-red-500/15 text-red-300'
                    }`}
                  >
                    {bk.qrStatus}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminQrScannerView;

import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Film,
  Landmark,
  Armchair,
  CalendarClock,
  Ticket,
  Users,
  UtensilsCrossed,
  Star,
  Tag,
  RotateCcw,
  QrCode,
  Settings,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { Logo } from '../../components/Logo';
import { api } from '../../utils/api';
import type { AdminOverview, AdminUser } from '../../types/platform';

interface AdminLayoutProps {
  currentPage: string;
  adminUser: AdminUser;
  onNavigate: (path: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

const ADMIN_NAV = [
  { id: 'admin-dashboard', path: '/admin', label: 'Dashboard & Analytics', icon: LayoutDashboard },
  { id: 'admin-qr-scanner', path: '/admin/qr-scanner', label: 'QR Gate Scanner', icon: QrCode },
  { id: 'admin-movies', path: '/admin/movies', label: 'Movies Catalog', icon: Film },
  { id: 'admin-theatres', path: '/admin/theatres', label: 'Theatres & Screens', icon: Landmark },
  { id: 'admin-seats', path: '/admin/seats', label: 'Seat Layout Editor', icon: Armchair },
  { id: 'admin-shows', path: '/admin/shows', label: 'Shows Scheduler', icon: CalendarClock },
  { id: 'admin-bookings', path: '/admin/bookings', label: 'Bookings Lookup', icon: Ticket },
  { id: 'admin-users', path: '/admin/users', label: 'Users & Accounts', icon: Users },
  { id: 'admin-food', path: '/admin/food', label: 'Food & Beverages', icon: UtensilsCrossed },
  { id: 'admin-events', path: '/admin/events', label: 'Live Events', icon: Star },
  { id: 'admin-coupons', path: '/admin/coupons', label: 'Coupons & Offers', icon: Tag },
  { id: 'admin-refunds', path: '/admin/refunds', label: 'Refunds Ledger', icon: RotateCcw },
  { id: 'admin-settings', path: '/admin/settings', label: 'Platform Settings', icon: Settings },
];

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  currentPage,
  adminUser,
  onNavigate,
  onLogout,
  children,
}) => {
  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col lg:flex-row">
      <aside className="lg:w-64 bg-[#0b0b0f] border-b lg:border-b-0 lg:border-r border-white/12 p-4 flex flex-col justify-between gap-4 shrink-0">
        <div className="space-y-4">
          <div className="flex items-center justify-between lg:block">
            <Logo compact onClick={() => onNavigate('/admin')} />
            <span className="mt-1 inline-block px-2 py-0.5 rounded bg-[#E50914]/20 text-[#FF4A52] text-[10px] font-bold uppercase tracking-wider">
              Admin Operations
            </span>
          </div>

          <nav className="flex lg:flex-col gap-1 overflow-x-auto no-scrollbar pb-1 lg:pb-0" aria-label="Admin navigation">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const active =
                currentPage === item.id ||
                (item.id === 'admin-dashboard' && currentPage === 'admin-analytics') ||
                (item.id === 'admin-theatres' && currentPage === 'admin-screens') ||
                (item.id === 'admin-coupons' && currentPage === 'admin-offers');

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#E50914] text-white'
                      : 'text-white/70 hover:text-white hover:bg-white/8'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div className="pt-3 border-t border-white/10 space-y-2">
          <div className="px-2">
            <p className="text-[11px] font-bold text-white truncate">{adminUser.name}</p>
            <p className="text-[10px] text-white/50 truncate">{adminUser.email}</p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-white/8 hover:bg-white/15 text-xs font-semibold text-white cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-[#2a1014] hover:bg-[#3a151a] text-xs font-semibold text-[#FF8A8F] cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out Admin</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-x-hidden">{children}</main>
    </div>
  );
};

export const AdminDashboardView: React.FC<{ onNavigate: (p: string) => void }> = ({
  onNavigate,
}) => {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getAdminOverview()
      .then(setOverview)
      .catch((err) => setError((err as Error).message));
  }, []);

  if (error) {
    return <p className="text-xs text-[#FF8A8F]">{error}</p>;
  }
  if (!overview) {
    return <p className="text-xs text-white/60">Loading live platform telemetry...</p>;
  }

  const { kpis, revenueByMovie } = overview;
  const maxRev = Math.max(1, ...revenueByMovie.map((r) => r.revenue));

  const cards = [
    { label: 'Total Revenue', value: `₹${kpis.todayRevenue.toLocaleString()}`, accent: 'text-emerald-300' },
    { label: 'Total Bookings', value: kpis.totalBookings, accent: 'text-white' },
    { label: 'Active Shows', value: kpis.activeShows, accent: 'text-amber-300' },
    { label: 'Companion Tickets', value: kpis.companionTicketsCount, accent: 'text-[#FF4A52]' },
    { label: 'Registered Users', value: kpis.totalUsers, accent: 'text-white' },
    { label: 'Movies / Events', value: `${kpis.totalMovies} / ${kpis.totalEvents}`, accent: 'text-white' },
    { label: 'Food Orders', value: kpis.foodOrdersCount, accent: 'text-white' },
    { label: 'Refunds Processed', value: `₹${kpis.refundsTotal}`, accent: 'text-[#FF8A8F]' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-white">
            Platform Overview & Analytics
          </h1>
          <p className="text-xs text-white/60">
            Real-time SQLite operational metrics across tickets, companions, F&B, and refunds.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onNavigate('/admin/qr-scanner')}
          className="px-4 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer flex items-center gap-1.5"
        >
          <QrCode className="w-4 h-4" />
          <span>Open QR Gate Scanner</span>
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-[#0e0e13] border border-white/12 p-4">
            <p className="text-[11px] text-white/55">{c.label}</p>
            <p className={`text-2xl font-extrabold mt-1 tabular-nums ${c.accent}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl bg-[#0e0e13] border border-white/12 p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white">
          Revenue by Title
        </h2>
        {revenueByMovie.length === 0 ? (
          <p className="text-xs text-white/60">No confirmed revenue data yet.</p>
        ) : (
          <div className="space-y-3">
            {revenueByMovie.map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-white">{row.label}</span>
                  <span className="text-white/75 tabular-nums">
                    ₹{row.revenue} ({row.bookings} booking{row.bookings === 1 ? '' : 's'})
                  </span>
                </div>
                <div className="h-2.5 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D90913] to-[#FF3B42]"
                    style={{ width: `${Math.max(8, Math.round((row.revenue / maxRev) * 100))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export { AdminQrScannerView } from './AdminQrScannerView';

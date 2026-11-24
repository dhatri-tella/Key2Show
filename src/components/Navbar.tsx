import React, { useState, useRef, useEffect } from 'react';
import {
  Home,
  Clapperboard,
  Star,
  Landmark,
  MapPin,
  ChevronDown,
  User,
  Menu,
  X,
  Ticket,
  Bell,
  Users,
  Heart,
  LogOut,
  ShieldCheck,
  UtensilsCrossed,
  Sparkles,
} from 'lucide-react';
import { Logo } from './Logo';
import { PWAInstallButton } from './PWAInstallBanner';
import { CITIES, type CityName } from '../data/events';

export type NavSection = 'Home' | 'Movies' | 'Events' | 'Theatres' | 'About Us' | 'Contact';

interface NavbarProps {
  activeNav: NavSection | null;
  onSelectNav: (nav: NavSection) => void;
  selectedCity: CityName;
  onSelectCity: (city: CityName) => void;
  userName: string | null;
  bookingCount: number;
  sharedCount?: number;
  unreadNotifications?: number;
  onOpenLogin: () => void;
  onOpenBookings: () => void;
  onNavigate?: (path: string) => void;
  onLogout?: () => void;
}

const NAV_ITEMS: { id: NavSection; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'Home', label: 'Home', icon: Home },
  { id: 'Movies', label: 'Movies', icon: Clapperboard },
  { id: 'Events', label: 'Events', icon: Star },
  { id: 'Theatres', label: 'Theatres', icon: Landmark },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeNav,
  onSelectNav,
  selectedCity,
  onSelectCity,
  userName,
  bookingCount,
  sharedCount = 0,
  unreadNotifications = 0,
  onOpenLogin,
  onOpenBookings,
  onNavigate,
  onLogout,
}) => {
  const [cityOpen, setCityOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cityRef = useRef<HTMLDivElement>(null);
  const mobileCityRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (cityRef.current && !cityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
      if (mobileCityRef.current && !mobileCityRef.current.contains(e.target as Node)) {
        setCityOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const totalBadge = bookingCount + sharedCount;

  return (
    <header className="bg-[#060606]/95 border-b border-white/15 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-[1460px] mx-auto px-4 lg:px-6 h-[58px] flex items-center justify-between gap-2 xl:gap-3">
        {/* Left: Brand Logo + vertical divider */}
        <div className="flex items-center gap-4 shrink-0">
          <Logo showTagline onClick={() => onSelectNav('Home')} />
          <div className="hidden 2xl:block h-9 w-px bg-white/15" aria-hidden="true" />
        </div>

        {/* Center: Primary Navigation */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5" aria-label="Main navigation">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const isActive = activeNav === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectNav(id)}
                aria-current={isActive ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap shrink-0 transition-all duration-200 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white font-semibold shadow-[0_0_18px_rgba(229,9,20,0.5)]'
                    : 'text-white/90 hover:text-[#FF333B] hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: Location + Notifications + Tickets + Login/User */}
        <div className="hidden lg:flex items-center gap-2 shrink-0">
          <div className="relative" ref={cityRef}>
            <button
              type="button"
              onClick={() => setCityOpen((o) => !o)}
              aria-expanded={cityOpen}
              aria-label={`Location ${selectedCity}`}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[13.5px] font-medium text-white/90 hover:text-white hover:bg-white/5 transition-colors whitespace-nowrap cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#FF1822] shrink-0" />
              <span>{selectedCity}</span>
              <ChevronDown className="w-3.5 h-3.5 text-white/70 shrink-0" />
            </button>

            {cityOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-44 rounded-xl bg-[#121216] border border-white/15 shadow-2xl py-1.5 z-50"
              >
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectCity(city);
                      setCityOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${
                      city === selectedCity
                        ? 'bg-[#E50914] text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/ai-concierge')}
              title="AI Show Guide"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#151218] border border-white/15 hover:border-[#FF1822] text-[12px] font-semibold text-white/90 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#FF3B42]" />
              <span className="hidden xl:inline">AI Guide</span>
            </button>
          )}

          <PWAInstallButton />

          {userName && onNavigate && (
            <button
              type="button"
              onClick={() => onNavigate('/notifications')}
              aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ''}`}
              className="relative p-2 rounded-full bg-[#121217] border border-white/15 hover:border-[#FF1822] text-white/85 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#FF1822] text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadNotifications}
                </span>
              )}
            </button>
          )}

          {totalBadge > 0 && (
            <button
              type="button"
              onClick={onOpenBookings}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#191012] border border-[#FF1822]/50 text-white text-[12.5px] font-semibold hover:bg-[#2a1216] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Ticket className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Tickets ({totalBadge})</span>
            </button>
          )}

          <div className="relative" ref={userMenuRef}>
            <button
              type="button"
              onClick={() => {
                if (!userName) {
                  onOpenLogin();
                } else {
                  setUserMenuOpen((o) => !o);
                }
              }}
              aria-expanded={userName ? userMenuOpen : undefined}
              className="inline-flex items-center gap-2 pl-2 pr-3.5 py-1.5 rounded-full bg-[#101014] border border-white/25 hover:border-[#FF1822] text-white text-[13px] font-semibold transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span className="w-6 h-6 rounded-full bg-white text-[#0d0d0f] flex items-center justify-center shrink-0">
                <User className="w-3.5 h-3.5" />
              </span>
              <span className="max-w-[100px] truncate">{userName ? userName : 'Login / Sign Up'}</span>
              {userName && <ChevronDown className="w-3.5 h-3.5 text-white/60" />}
            </button>

            {userName && userMenuOpen && (
              <div
                role="menu"
                aria-label="User account menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-2xl bg-[#121216] border border-white/15 shadow-2xl py-2 z-50"
              >
                <div className="px-4 py-2 border-b border-white/10">
                  <p className="text-[11px] text-white/50">Signed in as</p>
                  <p className="text-xs font-bold text-white truncate">{userName}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.('/my-bookings');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/85 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <Ticket className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>My Bookings & Tickets</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.('/shared-tickets');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/85 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>My Shared Tickets ({sharedCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.('/profile');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/85 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <Heart className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>Profile & Wishlist</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.('/food');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/85 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>Food & Beverages</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onOpenLogin();
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/85 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-amber-400" />
                  <span>Switch Demo Family Account</span>
                </button>
                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  onClick={() => {
                    setUserMenuOpen(false);
                    onNavigate?.('/admin/login');
                  }}
                  className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-white/75 hover:bg-white/10 hover:text-white text-left cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Admin Portal</span>
                </button>
                {onLogout && (
                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-[12.5px] text-[#FF4A52] hover:bg-white/10 text-left cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Hamburger */}
        <div className="flex lg:hidden items-center gap-2">
          <div className="relative" ref={mobileCityRef}>
            <button
              type="button"
              onClick={() => setCityOpen((o) => !o)}
              aria-expanded={cityOpen}
              aria-label={`Location ${selectedCity}`}
              className="inline-flex items-center gap-1 min-h-[44px] px-1.5 sm:px-2 rounded-lg text-[12px] sm:text-[13px] font-semibold text-white/90 hover:bg-white/5 transition-colors cursor-pointer"
            >
              <MapPin className="w-4 h-4 text-[#FF1822] shrink-0" />
              <span className="inline max-w-[62px] truncate">{selectedCity}</span>
              <ChevronDown className="w-3 h-3 text-white/65 shrink-0" />
            </button>
            {cityOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full mt-1 w-40 rounded-xl bg-[#121216] border border-white/15 shadow-2xl py-1.5 z-50"
              >
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectCity(city);
                      setCityOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 text-[13px] transition-colors cursor-pointer ${
                      city === selectedCity
                        ? 'bg-[#E50914] text-white font-semibold'
                        : 'text-white/80 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onOpenLogin}
            aria-label={userName ? `Open ${userName} account` : 'Login or sign up'}
            className="inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-2 rounded-lg bg-white text-[#0b0b0e] hover:bg-white/90 transition-colors cursor-pointer"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline ml-1.5 text-[12px] font-bold">
              {userName ? 'Account' : 'Login'}
            </span>
          </button>
          {totalBadge > 0 && (
            <button
              type="button"
              onClick={onOpenBookings}
              aria-label={`View ${totalBadge} tickets`}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-[#1c1012] border border-[#FF1822]/50 text-white text-[12px] font-semibold"
            >
              <Ticket className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>{totalBadge}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            className="p-2 rounded-lg bg-[#141418] border border-white/15 text-white hover:border-[#FF1822] transition-colors cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0b0b0e] border-t border-white/10 px-4 py-4 space-y-3">
          <nav className="grid grid-cols-2 gap-2" aria-label="Mobile navigation">
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = activeNav === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onSelectNav(id);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-[#E50914] text-white font-semibold'
                      : 'bg-[#141419] text-white/85 border border-white/10 hover:border-[#FF1822]/50'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>

          {onNavigate && (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/shared-tickets');
                }}
                className="px-3 py-2 rounded-xl bg-[#141419] border border-white/10 text-xs text-white/85 text-left"
              >
                Shared Tickets
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/offers');
                }}
                className="px-3 py-2 rounded-xl bg-[#141419] border border-white/10 text-xs text-white/85 text-left"
              >
                Offers & Coupons
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/food');
                }}
                className="px-3 py-2.5 rounded-xl bg-[#141419] border border-white/10 text-xs text-white/85 text-left min-h-[44px]"
              >
                Food & Beverages
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/ai-concierge');
                }}
                className="px-3 py-2.5 rounded-xl bg-[#1a1014] border border-[#FF1822]/40 text-xs text-[#FF8A8F] font-semibold text-left min-h-[44px] flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>AI Show Guide</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onNavigate('/admin/login');
                }}
                className="px-3 py-2.5 rounded-xl bg-[#141419] border border-white/10 text-xs text-emerald-300 text-left min-h-[44px] col-span-2"
              >
                Admin Portal
              </button>
            </div>
          )}

          <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {CITIES.map((city) => (
                <button
                  key={city}
                  type="button"
                  onClick={() => onSelectCity(city)}
                  className={`px-2.5 py-1 rounded-full text-[12px] font-medium transition-colors cursor-pointer ${
                    city === selectedCity
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#16161b] text-white/75 border border-white/10'
                  }`}
                >
                  {city}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenLogin();
              }}
              className="w-full mt-1 inline-flex items-center justify-center gap-2 py-2.5 rounded-full bg-white text-[#0b0b0e] font-bold text-[13.5px] cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>{userName ? `${userName} (Account)` : 'Login / Sign Up'}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

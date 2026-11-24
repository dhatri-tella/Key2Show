import { useState, useEffect } from 'react';

export function navigate(to: string) {
  if (window.location.pathname === to) return;
  window.history.pushState({}, '', to);
  window.dispatchEvent(new PopStateEvent('popstate'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

export function usePathname(): string {
  const [pathname, setPathname] = useState<string>(() => window.location.pathname || '/');

  useEffect(() => {
    const onPop = () => setPathname(window.location.pathname || '/');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  return pathname;
}

export interface ParsedRoute {
  area: 'user' | 'admin';
  page:
    | 'home'
    | 'movies'
    | 'movie-details'
    | 'events'
    | 'event-details'
    | 'theatres'
    | 'theatre-details'
    | 'seat-selection'
    | 'booking-food'
    | 'booking-companions'
    | 'checkout'
    | 'booking-success'
    | 'my-bookings'
    | 'my-tickets'
    | 'shared-tickets'
    | 'profile'
    | 'offers'
    | 'food'
    | 'notifications'
    | 'ai-concierge'
    | 'search'
    | 'payment'
    | 'booking-failure'
    | 'about'
    | 'contact'
    | 'help'
    | 'admin-login'
    | 'admin-dashboard'
    | 'admin-movies'
    | 'admin-theatres'
    | 'admin-screens'
    | 'admin-shows'
    | 'admin-seats'
    | 'admin-bookings'
    | 'admin-users'
    | 'admin-food'
    | 'admin-events'
    | 'admin-offers'
    | 'admin-coupons'
    | 'admin-refunds'
    | 'admin-analytics'
    | 'admin-qr-scanner'
    | 'admin-settings';
  paramId?: string;
}

export function parseRoute(pathname: string): ParsedRoute {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/admin/login') return { area: 'admin', page: 'admin-login' };
  if (clean === '/admin') return { area: 'admin', page: 'admin-dashboard' };
  if (clean === '/admin/movies') return { area: 'admin', page: 'admin-movies' };
  if (clean === '/admin/theatres') return { area: 'admin', page: 'admin-theatres' };
  if (clean === '/admin/screens') return { area: 'admin', page: 'admin-screens' };
  if (clean === '/admin/shows') return { area: 'admin', page: 'admin-shows' };
  if (clean === '/admin/seats') return { area: 'admin', page: 'admin-seats' };
  if (clean === '/admin/bookings') return { area: 'admin', page: 'admin-bookings' };
  if (clean === '/admin/users') return { area: 'admin', page: 'admin-users' };
  if (clean === '/admin/food') return { area: 'admin', page: 'admin-food' };
  if (clean === '/admin/events') return { area: 'admin', page: 'admin-events' };
  if (clean === '/admin/offers') return { area: 'admin', page: 'admin-offers' };
  if (clean === '/admin/coupons') return { area: 'admin', page: 'admin-coupons' };
  if (clean === '/admin/refunds') return { area: 'admin', page: 'admin-refunds' };
  if (clean === '/admin/analytics') return { area: 'admin', page: 'admin-analytics' };
  if (clean === '/admin/qr-scanner') return { area: 'admin', page: 'admin-qr-scanner' };
  if (clean === '/admin/settings') return { area: 'admin', page: 'admin-settings' };

  if (clean === '/') return { area: 'user', page: 'home' };
  if (clean === '/movies') return { area: 'user', page: 'movies' };
  if (clean.startsWith('/movies/')) return { area: 'user', page: 'movie-details', paramId: clean.slice(8) };
  if (clean === '/events') return { area: 'user', page: 'events' };
  if (clean.startsWith('/events/')) return { area: 'user', page: 'event-details', paramId: clean.slice(8) };
  if (clean === '/theatres') return { area: 'user', page: 'theatres' };
  if (clean.startsWith('/theatres/')) return { area: 'user', page: 'theatre-details', paramId: clean.slice(10) };
  if (clean === '/seat-selection') return { area: 'user', page: 'seat-selection' };
  if (clean.startsWith('/show/')) return { area: 'user', page: 'seat-selection', paramId: clean.slice(6) };
  if (clean === '/booking/food') return { area: 'user', page: 'booking-food' };
  if (clean === '/booking/companions') return { area: 'user', page: 'booking-companions' };
  if (clean === '/checkout') return { area: 'user', page: 'checkout' };
  if (clean === '/booking-success') return { area: 'user', page: 'booking-success' };
  if (clean === '/my-bookings') return { area: 'user', page: 'my-bookings' };
  if (clean === '/my-tickets') return { area: 'user', page: 'my-tickets' };
  if (clean === '/shared-tickets' || clean === '/shared-bookings') return { area: 'user', page: 'shared-tickets' };
  if (clean === '/profile') return { area: 'user', page: 'profile' };
  if (clean === '/offers') return { area: 'user', page: 'offers' };
  if (clean === '/food') return { area: 'user', page: 'food' };
  if (clean === '/notifications') return { area: 'user', page: 'notifications' };
  if (clean === '/ai-concierge') return { area: 'user', page: 'ai-concierge' };
  if (clean === '/search') return { area: 'user', page: 'search' };
  if (clean === '/payment') return { area: 'user', page: 'payment' };
  if (clean === '/booking-failure') return { area: 'user', page: 'booking-failure' };
  if (clean === '/about') return { area: 'user', page: 'about' };
  if (clean === '/contact') return { area: 'user', page: 'contact' };
  if (clean === '/help') return { area: 'user', page: 'help' };

  return { area: 'user', page: 'home' };
}

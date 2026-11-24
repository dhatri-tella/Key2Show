import React from 'react';
import { Home, Clapperboard, Ticket, Star, User } from 'lucide-react';

interface MobileBottomNavProps {
  currentPage: string;
  onNavigate: (path: string) => void;
  onOpenAuthOrProfile: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentPage,
  onNavigate,
  onOpenAuthOrProfile,
}) => {
  const items = [
    { id: 'home', label: 'Home', path: '/', icon: Home },
    { id: 'movies', label: 'Movies', path: '/movies', icon: Clapperboard },
    { id: 'bookings', label: 'Bookings', path: '/my-bookings', icon: Ticket },
    { id: 'events', label: 'Events', path: '/events', icon: Star },
    { id: 'profile', label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile bottom navigation"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#08080b]/95 backdrop-blur-lg border-t border-white/15 px-2 py-1.5"
    >
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            (item.id === 'home' && currentPage === 'home') ||
            (item.id === 'movies' && (currentPage === 'movies' || currentPage === 'movie-details')) ||
            (item.id === 'bookings' &&
              (currentPage === 'my-bookings' ||
                currentPage === 'my-tickets' ||
                currentPage === 'shared-tickets')) ||
            (item.id === 'events' && (currentPage === 'events' || currentPage === 'event-details')) ||
            (item.id === 'profile' && currentPage === 'profile');

          return (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                item.id === 'profile' ? onOpenAuthOrProfile() : onNavigate(item.path)
              }
              className={`flex flex-col items-center justify-center min-h-[44px] py-1 rounded-xl text-[10.5px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[#FF242C]' : 'text-white/70 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

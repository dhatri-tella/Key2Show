import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { CITIES, type CityName } from '../data/events';

interface TopBarProps {
  selectedCity: CityName;
  onSelectCity: (city: CityName) => void;
  onOpenInfo: (topic: 'help' | 'offers') => void;
  onOpenOffersPage?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  selectedCity,
  onSelectCity,
  onOpenInfo,
  onOpenOffersPage,
}) => {
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCityMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  return (
    <div className="bg-[#050505] border-b border-white/10 text-[12px] text-white/85 relative z-50">
      <div className="max-w-[1460px] mx-auto px-4 lg:px-8 h-8 flex items-center justify-between gap-3">
        {/* Left: Welcome + Location */}
        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <span className="font-medium text-white/90 whitespace-nowrap">
            <span className="hidden sm:inline">Welcome to Key2Show!</span>
            <span className="sm:hidden">Welcome!</span>
          </span>
          <span className="text-white/25 select-none" aria-hidden="true">
            |
          </span>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setCityMenuOpen((prev) => !prev)}
              aria-expanded={cityMenuOpen}
              aria-label={`Change city, current city ${selectedCity}`}
              className="flex items-center gap-1 text-white/90 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
            >
              <MapPin className="w-3.5 h-3.5 text-white/80 shrink-0" />
              <span>{selectedCity}</span>
              <ChevronDown className="w-3 h-3 text-white/70 shrink-0" />
            </button>

            {cityMenuOpen && (
              <div
                role="menu"
                aria-label="Select city"
                className="absolute left-0 top-full mt-1.5 w-40 rounded-xl bg-[#121216] border border-white/15 shadow-2xl py-1.5 z-50"
              >
                {CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      onSelectCity(city);
                      setCityMenuOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-1.5 text-[12px] transition-colors cursor-pointer ${
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
        </div>

        {/* Right: Help, Offers, Social Icons */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onOpenInfo('help')}
            className="text-white/85 hover:text-[#FF3B42] transition-colors whitespace-nowrap cursor-pointer"
          >
            Help ?
          </button>
          <span className="text-white/25 select-none" aria-hidden="true">
            |
          </span>
          <button
            type="button"
            onClick={() => (onOpenOffersPage ? onOpenOffersPage() : onOpenInfo('offers'))}
            className="text-white/85 hover:text-[#FF3B42] transition-colors whitespace-nowrap cursor-pointer"
          >
            Offers
          </button>
          <span className="hidden sm:inline text-white/25 select-none" aria-hidden="true">
            |
          </span>

          {/* Social Links */}
          <div className="hidden sm:flex items-center gap-2">
            <a
              href="#facebook"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('offers');
              }}
              aria-label="Key2Show on Facebook"
              className="w-4 h-4 rounded-full bg-[#1877F2] text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
              </svg>
            </a>
            <a
              href="#instagram"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('offers');
              }}
              aria-label="Key2Show on Instagram"
              className="w-4 h-4 rounded-full bg-gradient-to-tr from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-none stroke-current" strokeWidth="2.4" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="4.5" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </a>
            <a
              href="#youtube"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('offers');
              }}
              aria-label="Key2Show on YouTube"
              className="w-4 h-4 rounded bg-[#FF0000] text-white flex items-center justify-center hover:scale-110 transition-transform"
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
                <polygon points="9,7 18,12 9,17" />
              </svg>
            </a>
            <a
              href="#x"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('offers');
              }}
              aria-label="Key2Show on X"
              className="w-4 h-4 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

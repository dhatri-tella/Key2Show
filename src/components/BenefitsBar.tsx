import React from 'react';
import { Zap, ShieldCheck, QrCode, Headphones } from 'lucide-react';
import { Logo } from './Logo';

interface BenefitsBarProps {
  onLogoClick: () => void;
  onOpenInfo: (topic: 'help' | 'offers' | 'terms' | 'privacy' | 'refund' | 'faq' | 'contact') => void;
}

const BENEFITS = [
  { label: 'Instant Booking', icon: Zap },
  { label: 'Secure Payments', icon: ShieldCheck },
  { label: 'QR Ticket Validation', icon: QrCode },
  { label: '24/7 Support', icon: Headphones },
];

export const BenefitsBar: React.FC<BenefitsBarProps> = ({ onLogoClick, onOpenInfo }) => {
  return (
    <section
      aria-label="Key2Show Guarantees"
      className="bg-[#070709] border-t border-white/12 py-3.5"
    >
      <div className="max-w-[1460px] mx-auto px-4 lg:px-8 flex flex-col lg:flex-row items-center justify-between gap-4">
        {/* Left: Compact Logo */}
        <div className="shrink-0">
          <Logo compact showTagline onClick={onLogoClick} />
        </div>

        {/* Center: 4 Trust Indicators */}
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 xl:gap-x-9">
          {BENEFITS.map(({ label, icon: Icon }) => (
            <div key={label} className="flex items-center gap-2 text-[13px] font-medium text-white/90">
              <Icon className="w-4 h-4 text-[#FF1822] shrink-0" aria-hidden="true" />
              <span className="whitespace-nowrap">{label}</span>
            </div>
          ))}
        </div>

        {/* Right: Follow Us */}
        <div className="flex items-center gap-2.5 shrink-0">
          <span className="text-[12.5px] font-medium text-white/85 whitespace-nowrap">
            Follow Us:
          </span>
          <div className="flex items-center gap-2">
            <a
              href="#facebook"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('contact');
              }}
              aria-label="Follow Key2Show on Facebook"
              className="w-6 h-6 rounded-full bg-white text-[#0b0b0e] flex items-center justify-center hover:bg-[#FF1822] hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M14 13.5h2.5l1-4H14v-2c0-1.03 0-2 2-2h1.5V2.14c-.326-.043-1.557-.14-2.857-.14C11.928 2 10 3.657 10 6.7v2.8H7v4h3V22h4v-8.5Z" />
              </svg>
            </a>
            <a
              href="#instagram"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('contact');
              }}
              aria-label="Follow Key2Show on Instagram"
              className="w-6 h-6 rounded-full bg-white text-[#0b0b0e] flex items-center justify-center hover:bg-[#FF1822] hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-none stroke-current" strokeWidth="2.2" aria-hidden="true">
                <rect x="4" y="4" width="16" height="16" rx="4.5" />
                <circle cx="12" cy="12" r="3.5" />
              </svg>
            </a>
            <a
              href="#youtube"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('contact');
              }}
              aria-label="Follow Key2Show on YouTube"
              className="w-6 h-6 rounded-full bg-[#E50914] text-white flex items-center justify-center hover:brightness-125 transition-all"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <polygon points="9,7 18,12 9,17" />
              </svg>
            </a>
            <a
              href="#x"
              onClick={(e) => {
                e.preventDefault();
                onOpenInfo('contact');
              }}
              aria-label="Follow Key2Show on X"
              className="w-6 h-6 rounded-full bg-white text-[#0b0b0e] flex items-center justify-center hover:bg-[#FF1822] hover:text-white transition-colors"
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

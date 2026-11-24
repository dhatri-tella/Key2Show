import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface HeroProps {
  onBookNow: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onBookNow }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section
      aria-label="Key2Show Featured Showcase"
      className="relative w-full overflow-hidden bg-[#060102] pt-5 pb-12 md:pt-7 md:pb-14 lg:h-[248px] lg:py-0 flex items-center"
    >
      {/* Dramatic crimson/black radial backdrop */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 72% 95% at 50% 48%, rgba(225, 14, 24, 0.46) 0%, rgba(135, 6, 16, 0.32) 45%, #070102 85%)',
        }}
      />

      {/* Left diagonal crimson spotlight + subtle filmstrip curve */}
      <div
        className="absolute -left-20 -top-14 w-[460px] h-[340px] pointer-events-none opacity-80"
        style={{
          background:
            'radial-gradient(circle at 24% 25%, rgba(255, 22, 32, 0.52) 0%, rgba(180, 0, 12, 0.2) 45%, transparent 74%)',
        }}
      />

      <svg
        viewBox="0 0 180 260"
        className="hidden sm:block absolute left-0 top-0 h-full w-32 opacity-45 pointer-events-none"
        aria-hidden="true"
      >
        <g transform="rotate(-18 20 130)" fill="none" stroke="rgba(255,140,145,0.45)" strokeWidth="2">
          <path d="M-20,10 Q45,120 10,260" strokeWidth="26" stroke="rgba(160,15,25,0.35)" />
          <path d="M-20,10 Q45,120 10,260" strokeDasharray="8 10" strokeWidth="18" stroke="rgba(255,210,210,0.4)" />
        </g>
      </svg>

      {/* Right-aligned cinematic cast + reel artwork */}
      {!imgError && (
        <div className="hidden md:block absolute right-0 top-0 bottom-0 w-[66%] lg:w-[63%] pointer-events-none">
          <img
            src="/assets/images/hero-cast.jpg"
            alt="Cinema stars, film reel, and live performers"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-[18%_18%]"
          />
          {/* Smooth left-to-right gradient mask blending without darkening the film reel */}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, #0a0102 0%, rgba(22,2,5,0.8) 9%, rgba(22,2,5,0.28) 22%, transparent 40%)',
            }}
          />
          {/* Bottom dark fade for search bar overlap */}
          <div
            className="absolute inset-x-0 bottom-0 h-14"
            style={{
              background:
                'linear-gradient(to top, rgba(5,5,5,0.88) 0%, rgba(5,5,5,0.2) 55%, transparent 100%)',
            }}
          />
        </div>
      )}

      {/* Subtle red-lit crowd silhouettes along bottom */}
      <svg
        viewBox="0 0 1440 60"
        preserveAspectRatio="none"
        className="absolute inset-x-0 bottom-0 w-full h-11 opacity-80 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="crowdGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#260205" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#050505" stopOpacity="0.96" />
          </linearGradient>
        </defs>
        <path
          d="M0,60 L0,40 Q18,26 32,38 T64,34 T98,42 T130,30 T165,38 T200,26 T235,39 T275,32 T312,41 T352,28 T390,40 T430,31 T472,38 T510,27 T555,40 L555,60 Z"
          fill="#0b0203"
        />
        <rect x="0" y="34" width="1440" height="26" fill="url(#crowdGrad)" />
      </svg>

      {/* Left Foreground Copy */}
      <div className="relative z-10 w-full max-w-[1460px] mx-auto px-4 lg:px-8">
        <div className="max-w-[480px] lg:ml-6 flex flex-col items-center text-center">
          <h1 className="font-display italic font-extrabold tracking-tight text-[42px] sm:text-[52px] lg:text-[58px] leading-none text-white relative inline-flex items-baseline drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
            <span>Key</span>
            <span className="text-[#FF141D]">2</span>
            <span>Show</span>
            {/* Crimson star accent perched cleanly at top-right shoulder */}
            <svg
              viewBox="0 0 24 24"
              className="w-6 h-6 text-[#FF1822] fill-current -ml-2.5 -mt-2 self-start drop-shadow-[0_0_10px_rgba(255,20,29,0.9)]"
              aria-hidden="true"
            >
              <polygon points="12,2 14.9,8.6 22,9.3 16.6,14 18.2,21 12,17.3 5.8,21 7.4,14 2,9.3 9.1,8.6" />
            </svg>
          </h1>

          <p className="mt-1.5 text-[15px] sm:text-[18px] italic text-white/95 tracking-[0.01em] drop-shadow-sm">
            Your <span className="text-[#FF252E] font-semibold">Entertainment.</span>{' '}
            Your <span className="text-[#FF252E] font-semibold">Ticket.</span>{' '}
            Your <span className="text-[#FF252E] font-semibold">Show.</span>
          </p>

          <div className="mt-2 flex items-center gap-3 w-full max-w-[330px]">
            <span className="flex-1 h-px bg-white/35" aria-hidden="true" />
            <span className="text-[13px] font-medium text-white/90 tracking-wide whitespace-nowrap">
              Movies &nbsp;•&nbsp; Events &nbsp;•&nbsp; More
            </span>
            <span className="flex-1 h-px bg-white/35" aria-hidden="true" />
          </div>

          <button
            type="button"
            onClick={onBookNow}
            className="mt-3.5 inline-flex items-center gap-2 bg-gradient-to-r from-[#D90913] to-[#FF1F28] hover:brightness-110 active:scale-[0.98] text-white font-bold text-[15px] px-7 py-2 rounded-full k2s-red-glow transition-all duration-200 cursor-pointer"
          >
            <span>Book Now</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </section>
  );
};

import React, { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';

interface EventPromoCardProps {
  onExploreEvents: () => void;
}

export const EventPromoCard: React.FC<EventPromoCardProps> = ({ onExploreEvents }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="relative rounded-xl overflow-hidden border border-[#FF1822]/50 bg-[#0b0204] h-[226px] lg:h-[204px] xl:h-[214px] w-[300px] sm:w-[330px] lg:w-auto shrink-0 snap-start k2s-card-hover group flex flex-col justify-between p-4 xl:p-5">
      {/* Right-aligned concert crowd & lighting backdrop */}
      {!imgError && (
        <img
          src="/assets/images/live-events-bg.jpg"
          alt="Live concert stage and cheering crowd"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className="absolute right-0 top-0 bottom-0 w-[56%] h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
        />
      )}

      {/* Left-to-right crimson/dark vignette scrim ensuring high text contrast */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #0b0204 0%, #140307 46%, rgba(18,3,6,0.62) 70%, rgba(18,3,6,0.16) 100%)',
        }}
      />

      {/* Top crimson ambient glow */}
      <div
        className="absolute -left-10 -top-10 w-44 h-36 rounded-full pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(229,9,20,0.34) 0%, transparent 72%)',
        }}
      />

      {/* Foreground Copy */}
      <div className="relative z-10">
        <h3 className="font-display italic font-extrabold text-[21px] xl:text-[23px] leading-[1.12] tracking-tight text-white">
          Live Events
          <span className="block text-[#FF1C24]">&amp; Entertainment</span>
        </h3>

        <ul className="mt-2.5 space-y-1 text-[12.5px] font-medium text-white/95">
          {['Concerts', 'Comedy Shows', 'Sports & More...'].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#E50914] text-white flex items-center justify-center shrink-0">
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              </span>
              <span className="whitespace-nowrap">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Explore Events CTA */}
      <div className="relative z-10">
        <button
          type="button"
          onClick={onExploreEvents}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-[#D90913] to-[#FF1F28] hover:brightness-110 active:scale-[0.98] text-white text-[13px] font-bold px-5 py-1.5 rounded-full k2s-red-glow transition-all whitespace-nowrap cursor-pointer"
        >
          <span>Explore Events</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </article>
  );
};

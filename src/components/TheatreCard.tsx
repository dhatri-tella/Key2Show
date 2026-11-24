import React, { useState } from 'react';
import { Star, Landmark } from 'lucide-react';
import type { Theatre } from '../data/theatres';

interface TheatreCardProps {
  theatre: Theatre;
  onSelect: (theatre: Theatre) => void;
}

export const TheatreCard: React.FC<TheatreCardProps> = ({ theatre, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <button
      type="button"
      onClick={() => onSelect(theatre)}
      aria-label={`${theatre.name} in ${theatre.location}, rated ${theatre.rating}`}
      className="bg-[#0e0e12] border border-white/15 hover:border-[#FF1822]/70 rounded-xl p-2 flex items-center gap-3 text-left w-[268px] sm:w-[276px] lg:w-auto shrink-0 snap-start k2s-card-hover cursor-pointer group"
    >
      <div className="w-[96px] h-[58px] rounded-lg overflow-hidden bg-[#18181f] shrink-0 border border-white/10">
        {!imgError ? (
          <img
            src={theatre.image}
            alt={theatre.name}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-[#1c1014]">
            <Landmark className="w-5 h-5 text-[#FF1822]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 h-[58px] flex flex-col justify-between py-0.5">
        <div className="min-w-0">
          <h3 className="text-[13px] font-bold text-white leading-tight truncate group-hover:text-[#FF3B42] transition-colors">
            {theatre.name}
          </h3>
          <p className="text-[11.5px] text-white/75 leading-tight mt-0.5 truncate">
            ( {theatre.location} )
          </p>
        </div>

        <div className="flex items-center justify-end gap-1">
          <span className="text-[12px] font-semibold text-white/95 tabular-nums">
            {theatre.rating.toFixed(1)}
          </span>
          <Star className="w-3.5 h-3.5 text-[#F5B81D] fill-[#F5B81D] shrink-0" aria-hidden="true" />
        </div>
      </div>
    </button>
  );
};

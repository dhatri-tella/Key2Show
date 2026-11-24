import React, { useState } from 'react';
import { Film } from 'lucide-react';
import type { Movie } from '../data/movies';

interface MovieCardProps {
  movie: Movie;
  onBook: (movie: Movie) => void;
  onSelect: (movie: Movie) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({ movie, onBook, onSelect }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <article className="relative rounded-xl overflow-hidden border border-white/20 hover:border-[#FF1822]/80 bg-[#0b0b0e] h-[226px] lg:h-[204px] xl:h-[214px] w-[166px] sm:w-[174px] lg:w-auto shrink-0 snap-start k2s-card-hover group flex flex-col">
      <button
        type="button"
        onClick={() => onSelect(movie)}
        aria-label={`View details for ${movie.title}`}
        className="relative flex-1 w-full overflow-hidden text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF141D]"
      >
        {!imgError ? (
          <img
            src={movie.poster}
            alt={movie.title}
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#2a070b] via-[#12090d] to-[#0a0a0c] flex flex-col items-center justify-center p-3 text-center">
            <Film className="w-8 h-8 text-[#FF1822] mb-2" />
            <span className="font-display font-bold text-sm text-white leading-tight">
              {movie.title}
            </span>
          </div>
        )}

        {/* Smooth bottom edge transition into the Book Now action footer */}
        <div
          className="absolute inset-x-0 bottom-0 h-5 pointer-events-none"
          style={{
            background:
              'linear-gradient(to top, #0b0b0e 0%, rgba(11,11,14,0.6) 60%, transparent 100%)',
          }}
        />
      </button>

      {/* Book Now Pill Button below poster title */}
      <div className="bg-[#0b0b0e] pt-1 pb-2.5 flex justify-center px-2 shrink-0">
        <button
          type="button"
          onClick={() => onBook(movie)}
          aria-label={`Book tickets for ${movie.title}`}
          className="bg-gradient-to-r from-[#D90913] to-[#FF1F28] hover:brightness-115 active:scale-[0.97] text-white text-[12px] font-bold px-5 py-1 rounded-full shadow-[0_4px_14px_rgba(229,9,20,0.55)] transition-all whitespace-nowrap cursor-pointer"
        >
          Book Now
        </button>
      </div>
    </article>
  );
};

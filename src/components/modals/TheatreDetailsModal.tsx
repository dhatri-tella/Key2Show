import React from 'react';
import { X, Star, MapPin, Monitor, ShieldCheck } from 'lucide-react';
import type { Theatre } from '../../data/theatres';
import type { Movie } from '../../data/movies';

interface TheatreDetailsModalProps {
  theatre: Theatre;
  movies: Movie[];
  onClose: () => void;
  onBookMovieAtTheatre: (movie: Movie, theatreId: string) => void;
}

export const TheatreDetailsModal: React.FC<TheatreDetailsModalProps> = ({
  theatre,
  movies,
  onClose,
  onBookMovieAtTheatre,
}) => {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${theatre.name} details`}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close theatre details"
          className="absolute right-4 top-4 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col sm:flex-row gap-4 items-start">
          <img
            src={theatre.image}
            alt={theatre.name}
            referrerPolicy="no-referrer"
            className="w-full sm:w-44 h-28 rounded-xl object-cover border border-white/15 shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display text-2xl font-bold text-white">
                {theatre.name}
              </h3>
              <span className="inline-flex items-center gap-1 text-sm font-bold text-[#F5B81D] tabular-nums">
                {theatre.rating.toFixed(1)}
                <Star className="w-4 h-4 fill-[#F5B81D]" />
              </span>
            </div>
            <p className="text-sm text-white/75 flex items-center gap-1.5 mt-1">
              <MapPin className="w-4 h-4 text-[#FF1822] shrink-0" />
              <span>{theatre.address}</span>
            </p>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-white/80">
              <span className="inline-flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-[#FF1822]" />
                {theatre.screens} Screens · {theatre.formats.join(' / ')}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#FF1822]" />
                {theatre.amenities.join(' · ')}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10">
          <h4 className="font-display text-base font-bold text-white mb-3">
            Now Playing at {theatre.name}
          </h4>
          <div className="space-y-3">
            {movies.slice(0, 4).map((movie) => (
              <div
                key={movie.id}
                className="rounded-xl bg-[#15151a] border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <h5 className="font-semibold text-sm text-white">{movie.title}</h5>
                  <p className="text-xs text-white/60">
                    {movie.language} · {movie.duration}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {(theatre.showtimes ?? ['10:30 AM', '01:45 PM', '05:15 PM', '08:45 PM']).slice(0, 4).map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => onBookMovieAtTheatre(movie, theatre.id)}
                      className="px-3 py-1 rounded-full bg-[#1f1f26] hover:bg-[#E50914] border border-white/15 hover:border-[#FF3B42] text-xs font-semibold text-white transition-colors tabular-nums cursor-pointer"
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

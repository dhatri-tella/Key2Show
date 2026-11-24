import React from 'react';
import { Calendar, MapPin, RotateCcw } from 'lucide-react';
import { SectionHeader } from './SectionHeader';
import { MovieCard } from './MovieCard';
import { EventPromoCard } from './EventPromoCard';
import type { Movie } from '../data/movies';
import type { LiveEvent } from '../data/events';
import type { MovieSyncStatus } from '../types/platform';
import type { CategoryFilter } from '../utils/bookingLogic';

interface MovieSectionProps {
  movies: Movie[];
  events: LiveEvent[];
  activeCategory: CategoryFilter;
  searchQuery: string;
  showAllMovies: boolean;
  syncStatus?: MovieSyncStatus | null;
  onToggleViewAll: () => void;
  onBookMovie: (movie: Movie) => void;
  onSelectMovie: (movie: Movie) => void;
  onExploreEvents: () => void;
  onBookEvent: (event: LiveEvent) => void;
  onResetFilters: () => void;
}

export const MovieSection: React.FC<MovieSectionProps> = ({
  movies,
  events,
  activeCategory,
  searchQuery,
  showAllMovies,
  syncStatus,
  onToggleViewAll,
  onBookMovie,
  onSelectMovie,
  onExploreEvents,
  onBookEvent,
  onResetFilters,
}) => {
  const isEventCategory =
    activeCategory === 'Events' ||
    activeCategory === 'Concerts' ||
    activeCategory === 'Comedy Shows' ||
    activeCategory === 'Sports' ||
    activeCategory === 'Arts & Culture';

  if (isEventCategory) {
    return (
      <section id="now-showing" className="max-w-[1460px] mx-auto px-4 lg:px-8 mt-5">
        <SectionHeader
          title={activeCategory === 'Events' ? 'Live Events & Entertainment' : activeCategory}
          actionLabel="Back to Movies"
          onAction={onResetFilters}
        />

        {events.length === 0 ? (
          <div className="rounded-xl border border-white/15 bg-[#0e0e12] p-8 text-center">
            <p className="text-white/80 text-sm">
              No {activeCategory.toLowerCase()} matched &ldquo;{searchQuery}&rdquo;.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((ev) => (
              <article
                key={ev.id}
                className="rounded-xl border border-white/15 bg-[#0f0f13] overflow-hidden flex flex-col justify-between k2s-card-hover"
              >
                <div className="relative h-36 overflow-hidden">
                  <img
                    src={ev.image}
                    alt={ev.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f13] via-black/30 to-transparent" />
                  <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[11px] font-bold">
                    {ev.badge}
                  </span>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold text-[#FF3B42]">{ev.category}</p>
                    <h3 className="font-display text-[17px] font-bold text-white mt-0.5">
                      {ev.title}
                    </h3>
                    <div className="mt-2 space-y-1 text-[12px] text-white/75">
                      <p className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#FF1822]" />
                        <span>
                          {ev.date} · {ev.time}
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FF1822]" />
                        <span>{ev.venue}</span>
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-sm font-bold text-white tabular-nums">
                      ₹{ev.price}{' '}
                      <span className="text-[11px] font-normal text-white/60">onwards</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => onBookEvent(ev)}
                      className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-[12px] font-bold cursor-pointer hover:brightness-110"
                    >
                      Book Tickets
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    );
  }

  const isDefaultRow = !showAllMovies && !searchQuery.trim() && movies.length === 6;

  return (
    <section id="now-showing" className="max-w-[1460px] mx-auto px-4 lg:px-8 mt-4">
      <SectionHeader
        title={searchQuery.trim() ? `Movies matching "${searchQuery.trim()}"` : 'Now Showing'}
        actionLabel={showAllMovies ? 'Show Featured' : 'View All'}
        onAction={onToggleViewAll}
      />

      {syncStatus?.errorBanner && (
        <p className="text-[11px] text-amber-300/90 mb-2">
          Live movie information is temporarily unavailable.
        </p>
      )}

      {movies.length === 0 ? (
        <div className="rounded-xl border border-white/15 bg-[#0e0e12] p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-white">No movies matched your search</h3>
            <p className="text-xs text-white/65 mt-1">
              Try searching for Pushpa, Kalki, Devara, Jawan, Fighter, or Tiger 3.
            </p>
          </div>
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer hover:brightness-110"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Search</span>
          </button>
        </div>
      ) : isDefaultRow ? (
        <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-3.5 pb-1 lg:grid lg:grid-cols-[repeat(6,minmax(0,1fr))_2.08fr] lg:overflow-visible lg:pb-0 items-stretch">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onBook={onBookMovie}
              onSelect={onSelectMovie}
            />
          ))}
          <EventPromoCard onExploreEvents={onExploreEvents} />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3.5">
          {movies.map((movie) => (
            <MovieCard
              key={movie.id}
              movie={movie}
              onBook={onBookMovie}
              onSelect={onSelectMovie}
            />
          ))}
        </div>
      )}
    </section>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Film, Landmark, Star, TrendingUp } from 'lucide-react';
import type { CatalogEvent, CatalogMovie, CatalogTheatre } from '../types/platform';

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  onSubmitSearch: () => void;
  movies?: CatalogMovie[];
  theatres?: CatalogTheatre[];
  events?: CatalogEvent[];
  onPickMovie?: (movieId: string) => void;
  onPickTheatre?: (theatreId: string) => void;
  onPickEvent?: (eventId: string) => void;
}

const POPULAR_TERMS = ['Pushpa: The Rule', 'Prasads IMAX', 'Kalki 2898-AD', 'Arijit Singh'];

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onQueryChange,
  onSubmitSearch,
  movies = [],
  theatres = [],
  events = [],
  onPickMovie,
  onPickTheatre,
  onPickEvent,
}) => {
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(['Pushpa', 'AMB Cinemas']);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (searchWrapRef.current && !searchWrapRef.current.contains(e.target as Node)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSuggestOpen(false);
    const trimmed = query.trim();
    if (trimmed) {
      setRecentSearches((prev) => [trimmed, ...prev.filter((p) => p !== trimmed)].slice(0, 4));
    }
    onSubmitSearch();
  };

  const q = query.trim().toLowerCase();
  const matchedMovies = q
    ? movies.filter((m) => m.title.toLowerCase().includes(q) || m.language.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const matchedTheatres = q
    ? theatres.filter((t) => t.name.toLowerCase().includes(q) || t.location.toLowerCase().includes(q)).slice(0, 3)
    : [];
  const matchedEvents = q
    ? events.filter((ev) => ev.title.toLowerCase().includes(q) || ev.category.toLowerCase().includes(q)).slice(0, 2)
    : [];

  return (
    <div className="relative z-30 -mt-7 px-4" ref={searchWrapRef}>
      <form
        onSubmit={handleSubmit}
        role="search"
        aria-label="Search movies, events, or theatres"
        className="max-w-[1000px] mx-auto bg-white rounded-2xl md:rounded-full shadow-[0_14px_38px_rgba(0,0,0,0.85)] p-2 md:p-1.5 md:pl-5 flex flex-col md:flex-row items-stretch md:items-center gap-2 md:gap-0 border border-white/20"
      >
        {/* Search Input */}
        <div className="flex items-center flex-1 min-w-0 px-2 md:px-0">
          <Search className="w-5 h-5 text-neutral-700 shrink-0" aria-hidden="true" />
          <input
            type="text"
            value={query}
            onFocus={() => setSuggestOpen(true)}
            onChange={(e) => {
              onQueryChange(e.target.value);
              setSuggestOpen(true);
            }}
            placeholder="Search for movies, events or theatres..."
            aria-label="Search for movies, events or theatres"
            className="w-full bg-transparent text-[#141414] placeholder:text-neutral-500 text-[14px] md:text-[15px] px-3 py-2 focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => onQueryChange('')}
              aria-label="Clear search query"
              className="p-1 rounded-full text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center justify-stretch px-0 md:justify-end md:pr-0.5">
          <button
            type="submit"
            className="w-full md:w-auto bg-gradient-to-r from-[#D90913] to-[#FF1F28] hover:brightness-110 active:scale-[0.98] text-white font-semibold text-[14.5px] px-7 md:px-9 py-2.5 rounded-xl md:rounded-full shadow-[0_4px_14px_rgba(229,9,20,0.4)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
          >
            Search
          </button>
        </div>
      </form>

      {/* Live Search Suggestions Dropdown */}
      {suggestOpen && (movies.length > 0 || theatres.length > 0) && (
        <div className="max-w-[960px] mx-auto mt-2 rounded-2xl bg-[#111116] border border-white/15 shadow-2xl p-4 text-left z-50">
          {!q ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-2">
                  Recent Searches
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        onQueryChange(term);
                        setSuggestOpen(false);
                        onSubmitSearch();
                      }}
                      className="px-3 py-1 rounded-full bg-white/8 hover:bg-[#E50914] text-xs text-white/85 transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-wider text-white/50 font-semibold mb-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-[#FF252E]" />
                  <span>Popular Searches</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_TERMS.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => {
                        onQueryChange(term);
                        setSuggestOpen(false);
                        onSubmitSearch();
                      }}
                      className="px-3 py-1 rounded-full bg-[#1a1215] border border-[#FF1822]/30 hover:bg-[#E50914] text-xs text-white transition-colors cursor-pointer"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : matchedMovies.length + matchedTheatres.length + matchedEvents.length === 0 ? (
            <p className="text-xs text-white/60 py-1">
              No instant matches for &ldquo;{query}&rdquo;. Press Search to filter all listings.
            </p>
          ) : (
            <div className="space-y-2">
              {matchedMovies.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSuggestOpen(false);
                    onPickMovie?.(m.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/8 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Film className="w-4 h-4 text-[#FF252E]" />
                    <span className="text-sm font-semibold text-white">{m.title}</span>
                    <span className="text-xs text-white/55">{m.language}</span>
                  </span>
                  <span className="text-[11px] text-[#FF3B42] font-semibold">Movie</span>
                </button>
              ))}
              {matchedTheatres.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSuggestOpen(false);
                    onPickTheatre?.(t.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/8 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Landmark className="w-4 h-4 text-[#FF252E]" />
                    <span className="text-sm font-semibold text-white">{t.name}</span>
                    <span className="text-xs text-white/55">{t.location}, {t.city}</span>
                  </span>
                  <span className="text-[11px] text-amber-400 font-semibold">Theatre</span>
                </button>
              ))}
              {matchedEvents.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => {
                    setSuggestOpen(false);
                    onPickEvent?.(ev.id);
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl hover:bg-white/8 text-left cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Star className="w-4 h-4 text-[#FF252E]" />
                    <span className="text-sm font-semibold text-white">{ev.title}</span>
                    <span className="text-xs text-white/55">{ev.venue}</span>
                  </span>
                  <span className="text-[11px] text-emerald-400 font-semibold">Event</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

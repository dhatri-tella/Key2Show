import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  Film,
  Landmark,
  Calendar,
  X,
  Star,
  ArrowRight,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { SkeletonSearchResults } from '../../components/skeletons/LoadingSkeletons';
import type { CatalogEvent, CatalogMovie, CatalogTheatre } from '../../types/platform';
import { navigate } from '../../utils/router';

interface SearchPageProps {
  movies: CatalogMovie[];
  theatres: CatalogTheatre[];
  events: CatalogEvent[];
  initialQuery?: string;
  onSelectMovie: (id: string) => void;
  onSelectTheatre: (id: string) => void;
  onSelectEvent: (id: string) => void;
}

export const SearchPage: React.FC<SearchPageProps> = ({
  movies,
  theatres,
  events,
  initialQuery = '',
  onSelectMovie,
  onSelectTheatre,
  onSelectEvent,
}) => {
  const [inputVal, setInputVal] = useState(() => {
    if (initialQuery) return initialQuery;
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

  const [debouncedQuery, setDebouncedQuery] = useState(inputVal);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'movies' | 'theatres' | 'events'>('all');

  // Debounce 300ms
  useEffect(() => {
    setIsSearching(true);
    const handler = window.setTimeout(() => {
      setDebouncedQuery(inputVal.trim());
      setIsSearching(false);
      // Keep URL updated without full reload
      const newUrl = inputVal.trim()
        ? `/search?q=${encodeURIComponent(inputVal.trim())}`
        : '/search';
      window.history.replaceState({}, '', newUrl);
    }, 300);

    return () => window.clearTimeout(handler);
  }, [inputVal]);

  const q = debouncedQuery.toLowerCase();

  const filteredMovies = useMemo(() => {
    if (!q) return movies;
    return movies.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.genre.join(' ').toLowerCase().includes(q) ||
        m.language.toLowerCase().includes(q)
    );
  }, [movies, q]);

  const filteredTheatres = useMemo(() => {
    if (!q) return theatres;
    return theatres.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.city.toLowerCase().includes(q)
    );
  }, [theatres, q]);

  const filteredEvents = useMemo(() => {
    if (!q) return events;
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.venue.toLowerCase().includes(q) ||
        e.city.toLowerCase().includes(q)
    );
  }, [events, q]);

  const totalResults =
    (activeTab === 'all' || activeTab === 'movies' ? filteredMovies.length : 0) +
    (activeTab === 'all' || activeTab === 'theatres' ? filteredTheatres.length : 0) +
    (activeTab === 'all' || activeTab === 'events' ? filteredEvents.length : 0);

  return (
    <div className="max-w-[1140px] mx-auto px-4 lg:px-8 py-6 pb-24 space-y-6">
      {/* Search Header and Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-[#E50914]" />
            <span>Search Key2Show</span>
          </h1>
          <p className="text-xs text-white/50 mt-1">
            Find current movies, premier multiplexes, and live entertainment in your city.
          </p>
        </div>

        {/* Input Bar */}
        <div className="relative">
          <div className="flex items-center bg-[#121214] border border-white/15 focus-within:border-[#E50914] rounded-2xl p-2 px-4 shadow-xl transition-all">
            <Search className="w-5 h-5 text-white/40 shrink-0" />
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search movies, theatres, artists, or venues..."
              className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm px-3 py-2 focus:outline-none"
              autoFocus
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition cursor-pointer min-h-[32px] min-w-[32px] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
          {[
            { id: 'all', label: `All (${filteredMovies.length + filteredTheatres.length + filteredEvents.length})` },
            { id: 'movies', label: `Movies (${filteredMovies.length})`, icon: Film },
            { id: 'theatres', label: `Theatres (${filteredTheatres.length})`, icon: Landmark },
            { id: 'events', label: `Events (${filteredEvents.length})`, icon: Calendar },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-full font-bold whitespace-nowrap transition cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
                  active
                    ? 'bg-[#E50914] text-white shadow-md shadow-[#E50914]/30'
                    : 'bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Suggestions when empty input */}
      {!debouncedQuery && (
        <div className="space-y-3 p-4 rounded-2xl bg-white/[0.02] border border-white/10">
          <span className="text-[11px] font-bold text-white/40 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#E50914]" />
            Trending Searches
          </span>
          <div className="flex flex-wrap gap-2">
            {['Pushpa 2', 'Prasads IMAX', 'AMB Cinemas', 'Kalki', 'Arijit Singh'].map((term) => (
              <button
                key={term}
                type="button"
                onClick={() => setInputVal(term)}
                className="px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 hover:border-[#E50914]/50 text-white/80 hover:text-white text-xs transition cursor-pointer"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Results Container */}
      {isSearching ? (
        <SkeletonSearchResults />
      ) : totalResults === 0 && debouncedQuery ? (
        <div className="text-center py-16 space-y-4 max-w-md mx-auto">
          <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-white/40">
            <Search className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-white">No Results Found</h2>
            <p className="text-xs text-white/50">
              We couldn't find any match for "<span className="text-white">{debouncedQuery}</span>".
            </p>
          </div>
          <button
            type="button"
            onClick={() => setInputVal('')}
            className="px-5 py-2.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition cursor-pointer min-h-[44px]"
          >
            Clear Search
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Movies Section */}
          {(activeTab === 'all' || activeTab === 'movies') && filteredMovies.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                  <Film className="w-4 h-4 text-[#E50914]" />
                  <span>Movies ({filteredMovies.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                {filteredMovies.map((movie) => (
                  <div
                    key={movie.id}
                    onClick={() => onSelectMovie(movie.id)}
                    className="group bg-[#111] border border-white/10 hover:border-[#E50914]/50 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 flex flex-col justify-between"
                  >
                    <div className="relative aspect-[2/3] w-full overflow-hidden bg-white/5">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400&q=80';
                        }}
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Star className="w-2.5 h-2.5 fill-amber-400" />
                        <span>{movie.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="p-3 space-y-1">
                      <h3 className="text-xs font-bold text-white group-hover:text-[#FF3B42] line-clamp-1">
                        {movie.title}
                      </h3>
                      <p className="text-[10px] text-white/50 line-clamp-1">
                        {movie.language} • {movie.genre}
                      </p>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMovie(movie.id);
                        }}
                        className="w-full mt-2 py-1.5 px-2 rounded-lg bg-[#E50914] text-white text-[11px] font-bold text-center block min-h-[32px]"
                      >
                        Book Shows
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Theatres Section */}
          {(activeTab === 'all' || activeTab === 'theatres') && filteredTheatres.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-[#E50914]" />
                  <span>Theatres ({filteredTheatres.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredTheatres.map((theatre) => (
                  <div
                    key={theatre.id}
                    onClick={() => onSelectTheatre(theatre.id)}
                    className="p-4 rounded-xl bg-[#111] border border-white/10 hover:border-[#E50914]/50 transition cursor-pointer flex flex-col justify-between gap-3 group"
                  >
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white group-hover:text-[#FF3B42] transition">
                        {theatre.name}
                      </h3>
                      <p className="text-xs text-white/50 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-white/40 shrink-0" />
                        <span>
                          {theatre.location}, {theatre.city}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <span className="text-[11px] text-white/40">{theatre.screens} Screens</span>
                      <span className="text-[#FF3B42] font-bold text-xs flex items-center gap-1">
                        <span>View Shows</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Events Section */}
          {(activeTab === 'all' || activeTab === 'events') && filteredEvents.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <h2 className="text-sm font-bold uppercase tracking-wider text-white/80 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#E50914]" />
                  <span>Events & Shows ({filteredEvents.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {filteredEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev.id)}
                    className="group bg-[#111] border border-white/10 hover:border-[#E50914]/50 rounded-xl overflow-hidden cursor-pointer transition flex flex-col justify-between"
                  >
                    <div className="relative aspect-video w-full overflow-hidden bg-white/5">
                      <img
                        src={ev.image}
                        alt={ev.title}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/80 backdrop-blur-sm border border-white/20 text-[10px] font-bold text-white">
                        {ev.category}
                      </div>
                    </div>
                    <div className="p-3.5 space-y-1.5">
                      <h3 className="text-xs font-bold text-white group-hover:text-[#FF3B42] line-clamp-1">
                        {ev.title}
                      </h3>
                      <p className="text-[11px] text-white/50 line-clamp-1">
                        {ev.date} • {ev.venue}
                      </p>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="text-xs font-bold text-white">₹{ev.price} onwards</span>
                        <button
                          type="button"
                          className="py-1 px-3 rounded-lg bg-[#E50914] text-white text-[10px] font-bold min-h-[30px]"
                        >
                          Book Passes
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

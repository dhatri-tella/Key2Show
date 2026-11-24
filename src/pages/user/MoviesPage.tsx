import React, { useMemo, useState } from 'react';
import { Star, Heart, Film, Filter, RotateCcw } from 'lucide-react';
import { SkeletonMovieCard } from '../../components/skeletons/LoadingSkeletons';
import type { CatalogMovie } from '../../types/platform';

interface MoviesPageProps {
  movies: CatalogMovie[];
  wishlist: string[];
  onToggleWishlist: (movieId: string) => void;
  onSelectMovie: (movieId: string) => void;
}

export const MoviesPage: React.FC<MoviesPageProps> = ({
  movies,
  wishlist,
  onToggleWishlist,
  onSelectMovie,
}) => {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('All');
  const [genre, setGenre] = useState('All');
  const [format, setFormat] = useState('All');
  const [sortBy, setSortBy] = useState<'rating' | 'price-asc' | 'year'>('rating');

  const languages = useMemo(() => ['All', 'Telugu', 'Hindi'], []);
  const genres = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.genre.forEach((g) => set.add(g)));
    return ['All', ...Array.from(set)];
  }, [movies]);
  const formats = useMemo(() => {
    const set = new Set<string>();
    movies.forEach((m) => m.formats.forEach((f) => set.add(f)));
    return ['All', ...Array.from(set)];
  }, [movies]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = movies.filter((m) => {
      if (q && !m.title.toLowerCase().includes(q) && !m.cast.some((c) => c.toLowerCase().includes(q))) {
        return false;
      }
      if (language !== 'All' && !m.language.toLowerCase().includes(language.toLowerCase())) return false;
      if (genre !== 'All' && !m.genre.includes(genre)) return false;
      if (format !== 'All' && !m.formats.includes(format)) return false;
      return true;
    });
    return [...list].sort((a, b) => {
      if (sortBy === 'price-asc') return a.basePrice - b.basePrice;
      if (sortBy === 'year') return b.releaseYear - a.releaseYear;
      return b.rating - a.rating;
    });
  }, [movies, search, language, genre, format, sortBy]);

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            <Film className="w-3.5 h-3.5" />
            <span>Now Showing & Blockbusters</span>
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            Explore Movies
          </h1>
          <p className="text-sm text-white/65 mt-1">
            Filter by language, genre, projection format, and book seats instantly.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by title or actor..."
          aria-label="Filter movies by title or actor"
          className="w-full md:w-72 px-4 py-2.5 rounded-full bg-[#111116] border border-white/15 text-sm text-white placeholder:text-white/40 focus:border-[#FF1822] focus:outline-none"
        />
      </div>

      {/* Filter Bar */}
      <div className="rounded-2xl bg-[#0e0e12] border border-white/15 p-4 flex flex-wrap items-center gap-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-white/60 mr-1">
          <Filter className="w-3.5 h-3.5 text-[#FF252E]" />
          <span>Filters:</span>
        </span>

        <select
          aria-label="Filter by language"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[#17171d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
        >
          {languages.map((l) => (
            <option key={l} value={l}>
              Language: {l}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by genre"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[#17171d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
        >
          {genres.map((g) => (
            <option key={g} value={g}>
              Genre: {g}
            </option>
          ))}
        </select>

        <select
          aria-label="Filter by format"
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="px-3.5 py-2 rounded-xl bg-[#17171d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
        >
          {formats.map((f) => (
            <option key={f} value={f}>
              Format: {f}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort movies"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'rating' | 'price-asc' | 'year')}
          className="px-3.5 py-2 rounded-xl bg-[#17171d] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none"
        >
          <option value="rating">Sort: Highest Rated</option>
          <option value="price-asc">Sort: Price Low to High</option>
          <option value="year">Sort: Newest Release</option>
        </select>

        {(language !== 'All' || genre !== 'All' || format !== 'All' || search) && (
          <button
            type="button"
            onClick={() => {
              setSearch('');
              setLanguage('All');
              setGenre('All');
              setFormat('All');
            }}
            className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#FF3B42] hover:underline cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {movies.length === 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <SkeletonMovieCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-white/15 bg-[#0e0e12] p-10 text-center">
          <p className="text-white/75 text-sm">No movies matched your filter criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((movie) => {
            const wished = wishlist.includes(movie.id);
            return (
              <article
                key={movie.id}
                className="rounded-2xl bg-[#0e0e13] border border-white/15 hover:border-[#FF1822]/70 overflow-hidden flex flex-col k2s-card-hover"
              >
                <div className="relative h-64 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => onSelectMovie(movie.id)}
                    className="w-full h-full block text-left cursor-pointer"
                    aria-label={`Open ${movie.title} details`}
                  >
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover object-top"
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleWishlist(movie.id)}
                    aria-label={wished ? `Remove ${movie.title} from wishlist` : `Add ${movie.title} to wishlist`}
                    className="absolute top-2.5 right-2.5 p-2 rounded-full bg-black/70 border border-white/20 text-white hover:border-[#FF1822] cursor-pointer"
                  >
                    <Heart
                      className={`w-4 h-4 ${wished ? 'fill-[#FF1822] text-[#FF1822]' : 'text-white/80'}`}
                    />
                  </button>
                  <div className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/80 border border-white/15 flex items-center gap-1 text-[11px] font-bold text-white">
                    <Star className="w-3 h-3 text-[#F5B81D] fill-[#F5B81D]" />
                    <span>{movie.rating.toFixed(1)}</span>
                  </div>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-white leading-tight">
                      {movie.title}
                    </h2>
                    <p className="text-[11px] text-white/60 mt-1">
                      {movie.language} · {movie.duration} · {movie.certification}
                    </p>
                    <p className="text-[11px] text-white/45 mt-0.5 truncate">
                      {movie.genre.join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-xs font-bold text-white/90">
                      ₹{movie.basePrice}+
                    </span>
                    <button
                      type="button"
                      onClick={() => onSelectMovie(movie.id)}
                      className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold cursor-pointer hover:brightness-110"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

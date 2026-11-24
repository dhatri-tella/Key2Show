import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Globe,
  Heart,
  MapPin,
  MessageSquare,
  Play,
  Sparkles,
  Star,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { api } from '../../utils/api';
import type {
  CatalogMovie,
  CatalogTheatre,
  MovieSyncStatus,
  ReviewItem,
  SafeUser,
  ShowItem,
} from '../../types/platform';

function getYouTubeVideoId(value: string): string | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, '').replace(/^m\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
    }
    if (host === 'youtube.com' || host.endsWith('.youtube.com')) {
      if (url.pathname.startsWith('/embed/')) {
        const id = url.pathname.split('/')[2];
        return /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
      }
      const id = url.searchParams.get('v');
      return id && /^[a-zA-Z0-9_-]{6,}$/.test(id) ? id : null;
    }
  } catch {
    if (/^[a-zA-Z0-9_-]{6,}$/.test(raw)) return raw;
  }
  return null;
}

interface MovieDetailsPageProps {
  movie: CatalogMovie;
  theatres: CatalogTheatre[];
  shows: ShowItem[];
  selectedCity: string;
  currentUser: SafeUser | null;
  wishlist: string[];
  syncStatus?: MovieSyncStatus | null;
  onToggleWishlist: (movieId: string) => void;
  onSelectShow: (show: ShowItem) => void;
  onBack: () => void;
  onRequireLogin: () => void;
}

type MovieDetailTab = 'showtimes' | 'cast' | 'reviews';

export const MovieDetailsPage: React.FC<MovieDetailsPageProps> = ({
  movie,
  theatres,
  shows,
  selectedCity,
  currentUser,
  wishlist,
  syncStatus,
  onToggleWishlist,
  onSelectShow,
  onBack,
  onRequireLogin,
}) => {
  const movieShows = useMemo(() => shows.filter((s) => s.movie_id === movie.id), [shows, movie.id]);
  const availableDates = useMemo(
    () => Array.from(new Set(movieShows.map((s) => s.show_date))).sort(),
    [movieShows]
  );

  const [activeTab, setActiveTab] = useState<MovieDetailTab>('showtimes');
  const [selectedDate, setSelectedDate] = useState<string>(
    () => availableDates[0] ?? new Date().toISOString().slice(0, 10)
  );
  const [timeSlot, setTimeSlot] = useState<'All' | 'Morning' | 'Afternoon' | 'Evening' | 'Night'>('All');
  const [formatFilter, setFormatFilter] = useState<string>('All');
  const [trailerOpen, setTrailerOpen] = useState(false);
  const trailerVideoId = getYouTubeVideoId(
    movie.youtubeVideoId || movie.trailerUrl || ''
  );

  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [reviewError, setReviewError] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [buzzLoading, setBuzzLoading] = useState(false);
  const [buzzError, setBuzzError] = useState('');
  const [buzzText, setBuzzText] = useState('');
  const [buzzSources, setBuzzSources] = useState<{ title: string; uri: string }[]>([]);

  useEffect(() => {
    if (availableDates.length > 0 && !availableDates.includes(selectedDate)) {
      setSelectedDate(availableDates[0]);
    }
  }, [availableDates, selectedDate]);

  useEffect(() => {
    api
      .getReviews('MOVIE', movie.id)
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]));
    setBuzzText('');
    setBuzzSources([]);
    setBuzzError('');
  }, [movie.id]);

  const theatreShowGroups = useMemo(() => {
    const cityTheatres = theatres.filter((t) => t.city === selectedCity);
    const pool = cityTheatres.length > 0 ? cityTheatres : theatres;

    return pool
      .map((theatre) => {
        const matchingShows = movieShows.filter((s) => {
          if (s.theatre_id !== theatre.id) return false;
          if (selectedDate && s.show_date !== selectedDate) return false;
          if (timeSlot !== 'All' && s.time_slot !== timeSlot) return false;
          if (formatFilter !== 'All' && s.format !== formatFilter) return false;
          return true;
        });
        return { theatre, shows: matchingShows };
      })
      .filter((g) => g.shows.length > 0);
  }, [theatres, selectedCity, movieShows, selectedDate, timeSlot, formatFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    setReviewError('');
    setSubmittingReview(true);
    try {
      const res = await api.postReview({
        targetType: 'MOVIE',
        targetId: movie.id,
        rating: reviewRating,
        comment: reviewText,
      });
      setReviews((prev) => [res.review, ...prev]);
      setReviewText('');
    } catch (err) {
      setReviewError((err as Error).message);
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleFetchLiveBuzz = async () => {
    setBuzzLoading(true);
    setBuzzError('');
    try {
      const res = await api.aiSearchGrounding({
        title: movie.title,
        kind: 'movie',
        city: selectedCity,
      });
      setBuzzText(res.text);
      setBuzzSources(res.webSources ?? []);
    } catch (err) {
      setBuzzError((err as Error).message || 'Unable to fetch live buzz right now.');
    } finally {
      setBuzzLoading(false);
    }
  };

  const wished = wishlist.includes(movie.id);

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-5 pb-24 sm:pb-10 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/75 hover:text-white cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Movies</span>
        </button>

        {syncStatus?.errorBanner && (
          <span className="text-[11px] px-3 py-1 rounded-full bg-amber-950/50 border border-amber-400/35 text-amber-200">
            Live movie information is temporarily unavailable — showing cached catalog.
          </span>
        )}
      </div>

      {/* Movie Hero Banner (Compact Mobile-First) */}
      <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-[#0c0c10] p-4 sm:p-6 lg:p-7">
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <img
            src={movie.poster}
            alt={movie.title}
            className="w-32 sm:w-44 h-48 sm:h-64 object-cover object-top rounded-2xl border border-white/20 shadow-2xl shrink-0"
          />

          <div className="flex-1 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[11px] font-bold">
                {movie.certification}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[11px] font-semibold">
                {movie.language}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-white/90 text-[11px] font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#FF252E]" />
                {movie.duration}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/30 text-amber-300 text-[11px] font-bold flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                {movie.rating.toFixed(1)} ({movie.votes})
              </span>
            </div>

            <h1 className="font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white">
              {movie.title}{' '}
              {movie.subtitle && <span className="text-white/60 text-xl sm:text-2xl">({movie.subtitle})</span>}
            </h1>

            <p className="text-xs sm:text-sm text-white/80 max-w-3xl leading-relaxed line-clamp-3 sm:line-clamp-none">
              {movie.synopsis}
            </p>

            <div className="flex flex-wrap gap-1.5">
              {movie.formats.map((f) => (
                <span
                  key={f}
                  className="px-2.5 py-1 rounded-lg bg-[#181820] border border-white/15 text-[11px] font-semibold text-white/85"
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setTrailerOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold shadow-[0_4px_16px_rgba(229,9,20,0.4)] hover:brightness-110 cursor-pointer min-h-[44px]"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Watch Trailer</span>
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(movie.id)}
                className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-xs font-bold cursor-pointer min-h-[44px] ${
                  wished
                    ? 'bg-[#2a1014] border-[#FF1822] text-white'
                    : 'bg-[#141419] border-white/15 text-white/85 hover:border-white/40'
                }`}
              >
                <Heart className={`w-4 h-4 ${wished ? 'fill-[#FF1822] text-[#FF1822]' : ''}`} />
                <span>{wished ? 'Saved' : 'Wishlist'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('reviews');
                  void handleFetchLiveBuzz();
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#15151c] border border-white/15 hover:border-[#FF1822] text-xs font-bold text-white cursor-pointer min-h-[44px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#FF3B42]" />
                <span>Get Live Buzz &amp; Reviews</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Mobile-First Section Tabs */}
      <div
        role="tablist"
        aria-label="Movie details sections"
        className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1"
      >
        {(
          [
            { id: 'showtimes', label: `Showtimes (${theatreShowGroups.reduce((s, g) => s + g.shows.length, 0)})` },
            { id: 'cast', label: 'Cast & Crew' },
            { id: 'reviews', label: `Buzz & Reviews (${reviews.length})` },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={activeTab === t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2.5 rounded-full text-xs font-bold border whitespace-nowrap cursor-pointer min-h-[44px] ${
              activeTab === t.id
                ? 'bg-[#E50914] border-[#FF242C] text-white'
                : 'bg-[#121217] border-white/15 text-white/75 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB: SHOWTIMES */}
      {activeTab === 'showtimes' && (
        <section className="rounded-3xl border border-white/15 bg-[#0c0c10] p-4 sm:p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-white">
                Showtimes in {selectedCity}
              </h2>
              <p className="text-xs text-white/60">
                Pick a date and showtime to open clean seat selection.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {availableDates.map((d, idx) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setSelectedDate(d)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold border cursor-pointer flex items-center gap-1.5 min-h-[40px] ${
                    selectedDate === d
                      ? 'bg-[#E50914] border-[#FF242C] text-white'
                      : 'bg-[#15151a] border-white/15 text-white/80'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{idx === 0 ? `Today (${d})` : idx === 1 ? `Tomorrow (${d})` : d}</span>
                </button>
              ))}

              <select
                aria-label="Filter by show time"
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value as typeof timeSlot)}
                className="px-3 py-2 rounded-full bg-[#15151a] border border-white/15 text-xs text-white min-h-[40px]"
              >
                <option value="All">All Timings</option>
                <option value="Morning">Morning</option>
                <option value="Afternoon">Afternoon</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>

              <select
                aria-label="Filter by projection format"
                value={formatFilter}
                onChange={(e) => setFormatFilter(e.target.value)}
                className="px-3 py-2 rounded-full bg-[#15151a] border border-white/15 text-xs text-white min-h-[40px]"
              >
                <option value="All">All Formats</option>
                {movie.formats.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {theatreShowGroups.length === 0 ? (
            <div className="rounded-2xl bg-[#131318] border border-white/10 p-8 text-center">
              <p className="text-sm text-white/75">
                No showtimes matched the selected date/time filters in {selectedCity}.
              </p>
              <button
                type="button"
                onClick={() => {
                  setTimeSlot('All');
                  setFormatFilter('All');
                  if (availableDates[0]) setSelectedDate(availableDates[0]);
                }}
                className="mt-3 px-4 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[40px]"
              >
                Show All Available Timings
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {theatreShowGroups.map(({ theatre, shows: tShows }) => (
                <div
                  key={theatre.id}
                  className="rounded-2xl bg-[#131318] border border-white/12 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div>
                    <h3 className="font-display text-base font-bold text-white flex flex-wrap items-center gap-2">
                      <span>{theatre.name}</span>
                      <span className="text-xs font-normal text-white/60">({theatre.location})</span>
                    </h3>
                    <p className="text-xs text-white/55 mt-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#FF252E] shrink-0" />
                      <span>{theatre.address}</span>
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2.5">
                    {tShows.map((sh) => (
                      <button
                        key={sh.id}
                        type="button"
                        onClick={() => onSelectShow(sh)}
                        className="px-4 py-2 rounded-xl bg-[#1b1b22] border border-emerald-500/40 hover:border-[#FF1822] hover:bg-[#2a1216] text-left transition-all cursor-pointer min-h-[44px]"
                      >
                        <p className="text-xs font-bold text-emerald-400">{sh.show_time}</p>
                        <p className="text-[10.5px] text-white/70">
                          {sh.format} · ₹{sh.base_price}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* TAB: CAST & CREW */}
      {activeTab === 'cast' && (
        <section className="rounded-3xl border border-white/15 bg-[#0c0c10] p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/55 mb-3 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Cast</span>
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {(movie.castDetails?.length
                ? movie.castDetails
                : movie.cast.map((c, idx) => ({ id: String(idx), actor_name: c, role_name: 'Lead Cast' }))
              ).map((c) => (
                <div
                  key={c.id}
                  className="px-3.5 py-2 rounded-xl bg-[#15151b] border border-white/10"
                >
                  <p className="text-xs font-bold text-white">{c.actor_name}</p>
                  <p className="text-[11px] text-white/55">{c.role_name}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-white/55 mb-3">
              Crew
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {(movie.crewDetails?.length
                ? movie.crewDetails
                : [{ id: 'dir', member_name: movie.director, department: 'Director' }]
              ).map((cr) => (
                <div
                  key={cr.id}
                  className="px-3.5 py-2 rounded-xl bg-[#15151b] border border-white/10"
                >
                  <p className="text-xs font-bold text-white">{cr.member_name}</p>
                  <p className="text-[11px] text-white/55">{cr.department}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* TAB: LIVE BUZZ & AUDIENCE REVIEWS */}
      {activeTab === 'reviews' && (
        <section className="rounded-3xl border border-white/15 bg-[#0c0c10] p-4 sm:p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-[#FF252E]" />
              <span>Live Buzz &amp; Audience Reviews ({reviews.length})</span>
            </h2>
            <button
              type="button"
              onClick={() => void handleFetchLiveBuzz()}
              disabled={buzzLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#191014] border border-[#FF1822]/50 hover:bg-[#E50914] text-xs font-bold text-white cursor-pointer min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{buzzLoading ? 'Fetching Live Web Buzz...' : 'Refresh Google Search Buzz'}</span>
            </button>
          </div>

          {buzzError && (
            <div className="rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-3.5 py-2.5 text-xs text-[#FF8A8F]">
              {buzzError}
            </div>
          )}
          {buzzText && (
            <div className="rounded-2xl bg-[#14141c] border border-[#FF1822]/30 p-4 space-y-2.5">
              <p className="text-xs font-bold text-[#FF4A52] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                <span>Live Critic &amp; Audience Pulse (Google Search Grounded)</span>
              </p>
              <p className="text-xs text-white/85 whitespace-pre-line leading-relaxed">{buzzText}</p>
              {buzzSources.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {buzzSources.map((src, idx) => (
                    <a
                      key={`${src.uri}-${idx}`}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 border border-white/15 text-[11px] text-white/85 hover:border-[#FF1822]"
                    >
                      <span>{src.title}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  ))}
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={handleReviewSubmit}
            className="rounded-2xl bg-[#131318] border border-white/10 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs font-semibold text-white/80">Rate &amp; Review this movie</span>
              <select
                aria-label="Select rating"
                value={reviewRating}
                onChange={(e) => setReviewRating(Number(e.target.value))}
                className="px-3 py-1 rounded-lg bg-[#1d1d24] border border-white/15 text-xs text-white min-h-[38px]"
              >
                {[5, 4.5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>
                    {r} ★
                  </option>
                ))}
              </select>
            </div>
            {reviewError && <p className="text-xs text-[#FF6B71]">{reviewError}</p>}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                required
                placeholder={currentUser ? 'Share your cinema experience...' : 'Sign in to post a review...'}
                className="flex-1 px-4 py-2 rounded-xl bg-[#1a1a21] border border-white/15 text-xs text-white focus:border-[#FF1822] focus:outline-none min-h-[44px]"
              />
              <button
                type="submit"
                disabled={submittingReview}
                className="px-5 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer hover:brightness-110 min-h-[44px]"
              >
                {currentUser ? 'Post Review' : 'Sign In & Post'}
              </button>
            </div>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reviews.map((rev) => (
              <div key={rev.id} className="rounded-2xl bg-[#141419] border border-white/10 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-white">{rev.user_name}</p>
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 text-[11px] font-bold">
                    {rev.rating} ★
                  </span>
                </div>
                <p className="text-xs text-white/75 mt-2">{rev.comment}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Trailer Modal */}
      {trailerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${movie.title} Trailer`}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm"
        >
          <div className="relative w-full max-w-3xl rounded-2xl bg-[#0e0e12] border border-white/20 overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Ticket className="w-4 h-4 text-[#FF252E]" />
                <span>{movie.title} — Official Trailer</span>
              </p>
              <button
                type="button"
                onClick={() => setTrailerOpen(false)}
                aria-label="Close trailer"
                className="p-2 rounded-full bg-white/10 text-white hover:bg-[#E50914] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center relative">
              {trailerVideoId ? (
                <iframe
                  title={`${movie.title} Trailer`}
                  src={`https://www.youtube-nocookie.com/embed/${trailerVideoId}?rel=0&modestbranding=1`}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="px-6 text-center space-y-4">
                  <p className="text-sm font-bold text-white">Trailer unavailable</p>
                  <button
                    type="button"
                    onClick={() => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${movie.title} official trailer`)}`, '_blank', 'noopener,noreferrer')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border border-white/15 bg-white/10 text-xs font-bold text-white hover:border-[#FF252E] cursor-pointer min-h-[44px]"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Search on YouTube
                  </button>
                </div>
              )}
            </div>
            {trailerVideoId && (
              <div className="px-4 py-3 border-t border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => window.open(`https://www.youtube.com/watch?v=${trailerVideoId}`, '_blank', 'noopener,noreferrer')}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-white/80 hover:text-white cursor-pointer min-h-[44px]"
                >
                  <ExternalLink className="w-4 h-4" />
                  Watch on YouTube
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

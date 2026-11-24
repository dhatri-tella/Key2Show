import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Landmark,
  MapPin,
  Star,
  Navigation,
  Film,
  MessageSquare,
} from 'lucide-react';
import { api } from '../../utils/api';
import { CITIES, type CityName } from '../../data/events';
import { TheatreMapExplorer } from '../../components/TheatreMapExplorer';
import { SkeletonTheatreCard } from '../../components/skeletons/LoadingSkeletons';
import type {
  CatalogMovie,
  CatalogTheatre,
  ReviewItem,
  SafeUser,
  ShowItem,
} from '../../types/platform';

interface TheatresPageProps {
  theatres: CatalogTheatre[];
  selectedCity: CityName;
  onSelectCity: (city: CityName) => void;
  onSelectTheatre: (theatreId: string) => void;
}

export const TheatresPage: React.FC<TheatresPageProps> = ({
  theatres,
  selectedCity,
  onSelectCity,
  onSelectTheatre,
}) => {
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');

  const categories = ['All', 'Multiplex', 'IMAX', 'Luxury', 'Premium'];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return theatres.filter((t) => {
      if (!q && t.city !== selectedCity) return false;
      if (category !== 'All' && t.category !== category) return false;
      if (
        q &&
        !t.name.toLowerCase().includes(q) &&
        !t.location.toLowerCase().includes(q) &&
        !t.city.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [theatres, selectedCity, category, search]);

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-8 pb-24 sm:pb-10 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            <Landmark className="w-3.5 h-3.5" />
            <span>Cinema Venues</span>
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            Theatres in {selectedCity}
          </h1>
          <p className="text-sm text-white/65 mt-1">
            Explore IMAX, Dolby Atmos, luxury recliners, interactive map pins, and real-time showtimes.
          </p>
        </div>

        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search venue or area..."
          className="w-full md:w-72 px-4 py-2.5 rounded-full bg-[#111116] border border-white/15 text-sm text-white placeholder:text-white/40 focus:border-[#FF1822] focus:outline-none min-h-[44px]"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold border cursor-pointer min-h-[38px] ${
                category === cat
                  ? 'bg-[#E50914] border-[#FF242C] text-white'
                  : 'bg-[#141418] border-white/15 text-white/75 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {CITIES.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => onSelectCity(city)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer min-h-[38px] ${
                selectedCity === city
                  ? 'bg-white text-black border-white'
                  : 'bg-[#141418] border-white/15 text-white/75'
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      <TheatreMapExplorer
        theatres={filtered.length > 0 ? filtered : theatres.slice(0, 5)}
        selectedCity={selectedCity}
        onSelectTheatre={onSelectTheatre}
      />

      {theatres.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonTheatreCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#0e0e12] border border-white/15 p-8 text-center text-sm text-white/70">
          No theatres found for the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <article
              key={t.id}
              className="rounded-2xl bg-[#0e0e13] border border-white/15 hover:border-[#FF1822]/70 overflow-hidden flex flex-col justify-between k2s-card-hover"
            >
              <div className="relative h-44">
                <img src={t.image} alt={t.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e13] via-black/30 to-transparent" />
                <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-white/15 text-[11px] font-bold text-white">
                  {t.category}
                </span>
                <span className="absolute top-3 right-3 px-2.5 py-0.5 rounded-full bg-black/75 border border-white/15 flex items-center gap-1 text-xs font-bold text-amber-300">
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                  {t.rating.toFixed(1)}
                </span>
              </div>
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-white">{t.name}</h2>
                  <p className="text-xs text-white/65 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#FF252E]" />
                    <span>{t.location}, {t.city} · {t.screens} Screens</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {t.formats.map((f) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded bg-white/8 text-[10.5px] text-white/80"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onSelectTheatre(t.id)}
                  className="w-full py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold cursor-pointer hover:brightness-110 min-h-[44px]"
                >
                  View Venue &amp; Showtimes
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

interface TheatreDetailsPageProps {
  theatre: CatalogTheatre;
  movies: CatalogMovie[];
  shows: ShowItem[];
  currentUser: SafeUser | null;
  firebaseIdToken?: string | null;
  onSelectShow: (show: ShowItem) => void;
  onBack: () => void;
  onRequireLogin: () => void;
}

export const TheatreDetailsPage: React.FC<TheatreDetailsPageProps> = ({
  theatre,
  movies,
  shows,
  currentUser,
  firebaseIdToken,
  onSelectShow,
  onBack,
  onRequireLogin,
}) => {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [savedCloudVenue, setSavedCloudVenue] = useState(false);

  useEffect(() => {
    api
      .getReviews('THEATRE', theatre.id)
      .then((res) => setReviews(res.reviews))
      .catch(() => setReviews([]));
  }, [theatre.id]);

  useEffect(() => {
    if (!firebaseIdToken) {
      setSavedCloudVenue(false);
      return;
    }
    api
      .cloudGetMe(firebaseIdToken)
      .then((res) => {
        setSavedCloudVenue(res.savedVenues?.some((v) => v.theatreId === theatre.id) ?? false);
      })
      .catch(() => {});
  }, [firebaseIdToken, theatre.id]);

  const handleToggleSaveVenue = async () => {
    if (!firebaseIdToken) {
      onRequireLogin();
      return;
    }
    if (savedCloudVenue) {
      await api.cloudRemoveSavedVenue(firebaseIdToken, theatre.id);
      setSavedCloudVenue(false);
    } else {
      await api.cloudSaveVenue(firebaseIdToken, {
        theatreId: theatre.id,
        theatreName: `${theatre.name} (${theatre.location})`,
        city: theatre.city,
      });
      setSavedCloudVenue(true);
    }
  };

  const theatreShows = useMemo(
    () => shows.filter((s) => s.theatre_id === theatre.id),
    [shows, theatre.id]
  );

  const moviesPlaying = useMemo(() => {
    return movies
      .map((m) => ({
        movie: m,
        shows: theatreShows.filter((s) => s.movie_id === m.id),
      }))
      .filter((item) => item.shows.length > 0);
  }, [movies, theatreShows]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onRequireLogin();
      return;
    }
    const res = await api.postReview({
      targetType: 'THEATRE',
      targetId: theatre.id,
      rating,
      comment,
    });
    setReviews((prev) => [res.review, ...prev]);
    setComment('');
  };

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-6 pb-24 sm:pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-semibold text-white/75 hover:text-white cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Theatres</span>
        </button>

        <button
          type="button"
          onClick={() => void handleToggleSaveVenue()}
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full border text-xs font-bold cursor-pointer min-h-[40px] ${
            savedCloudVenue
              ? 'bg-[#2a1014] border-[#FF1822] text-white'
              : 'bg-[#14141a] border-white/15 text-white/85 hover:border-[#FF1822]'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${savedCloudVenue ? 'fill-[#FF1822] text-[#FF1822]' : ''}`} />
          <span>{savedCloudVenue ? 'Venue Saved to Account' : 'Save Venue'}</span>
        </button>
      </div>

      <section className="rounded-3xl bg-[#0c0c10] border border-white/15 overflow-hidden p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-0.5 rounded-full bg-[#E50914] text-white text-xs font-bold">
              {theatre.category}
            </span>
            <span className="px-3 py-0.5 rounded-full bg-amber-500/15 text-amber-300 text-xs font-bold flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              {theatre.rating.toFixed(1)}
            </span>
            <span className="text-xs text-white/60">{theatre.screens} Screens</span>
          </div>

          <h1 className="font-display text-3xl font-extrabold text-white">
            {theatre.name} ({theatre.location})
          </h1>
          <p className="text-sm text-white/75 flex items-start gap-2">
            <MapPin className="w-4 h-4 text-[#FF252E] shrink-0 mt-0.5" />
            <span>{theatre.address}</span>
          </p>

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
              Formats &amp; Facilities
            </p>
            <div className="flex flex-wrap gap-2">
              {[...theatre.formats, ...theatre.amenities].map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-xl bg-[#16161d] border border-white/10 text-xs text-white/85"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Venue Coordinates & Image Card */}
        <div className="rounded-2xl bg-[#131319] border border-white/15 p-4 flex flex-col justify-between gap-3">
          <img
            src={theatre.image}
            alt={theatre.name}
            className="w-full h-32 object-cover rounded-xl border border-white/10"
          />
          <div className="flex items-center justify-between text-xs text-white/75">
            <span className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Coordinates</span>
            </span>
            <span className="font-mono text-white/90">
              {theatre.lat.toFixed(4)}° N, {theatre.lng.toFixed(4)}° E
            </span>
          </div>
        </div>
      </section>

      <TheatreMapExplorer theatres={[theatre]} selectedCity={theatre.city} />

      {/* Movies Playing at Theatre */}
      <section className="rounded-3xl bg-[#0c0c10] border border-white/15 p-6 space-y-4">
        <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
          <Film className="w-5 h-5 text-[#FF252E]" />
          <span>Now Playing at {theatre.name}</span>
        </h2>

        <div className="space-y-3">
          {moviesPlaying.map(({ movie, shows: mShows }) => (
            <div
              key={movie.id}
              className="rounded-2xl bg-[#131318] border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-12 h-16 rounded-lg object-cover border border-white/15"
                />
                <div>
                  <h3 className="font-display text-base font-bold text-white">{movie.title}</h3>
                  <p className="text-xs text-white/60">
                    {movie.language} · {movie.duration} · {movie.certification}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {mShows.map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() => onSelectShow(sh)}
                    className="px-4 py-2 rounded-xl bg-[#1b1b22] border border-emerald-500/40 hover:border-[#FF1822] text-left cursor-pointer"
                  >
                    <p className="text-xs font-bold text-emerald-400">{sh.show_time}</p>
                    <p className="text-[10.5px] text-white/70">
                      {sh.show_date} · {sh.format} · ₹{sh.base_price}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Theatre Reviews */}
      <section className="rounded-3xl bg-[#0c0c10] border border-white/15 p-6 space-y-4">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#FF252E]" />
          <span>Venue Reviews ({reviews.length})</span>
        </h2>
        <form onSubmit={handleSubmitReview} className="flex flex-col sm:flex-row gap-2">
          <select
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            className="px-3 py-2 rounded-xl bg-[#15151a] border border-white/15 text-xs text-white"
          >
            {[5, 4, 3, 2, 1].map((r) => (
              <option key={r} value={r}>
                {r} ★
              </option>
            ))}
          </select>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            required
            placeholder="Review screen quality, sound, parking..."
            className="flex-1 px-4 py-2 rounded-xl bg-[#15151a] border border-white/15 text-xs text-white"
          />
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer"
          >
            Submit Review
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reviews.map((r) => (
            <div key={r.id} className="rounded-xl bg-[#141419] border border-white/10 p-3.5">
              <div className="flex justify-between text-xs font-bold text-white">
                <span>{r.user_name}</span>
                <span className="text-amber-300">{r.rating} ★</span>
              </div>
              <p className="text-xs text-white/75 mt-1">{r.comment}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

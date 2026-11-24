import React, { useEffect, useState } from 'react';
import { api } from '../../utils/api';
import type { FoodItem, OfferItem } from '../../types/platform';

export const AdminMoviesView: React.FC<{ onCatalogChanged: () => void }> = ({
  onCatalogChanged,
}) => {
  const [movies, setMovies] = useState<Record<string, unknown>[]>([]);
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('Telugu / Hindi');
  const [duration, setDuration] = useState('2h 40m');
  const [basePrice, setBasePrice] = useState(280);

  const load = () => api.adminGetMovies().then((r) => setMovies(r.movies));
  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminCreateMovie({ title, language, duration, basePrice });
    setTitle('');
    await load();
    onCatalogChanged();
  };

  const handleToggle = async (id: string, current: number) => {
    await api.adminUpdateMovie(id, { published: current === 0 });
    await load();
    onCatalogChanged();
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-white">Movies Manager</h1>
      <form
        onSubmit={handleAdd}
        className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 grid grid-cols-1 sm:grid-cols-5 gap-3"
      >
        <input
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Movie Title"
          className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <input
          type="text"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          placeholder="Language"
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <input
          type="number"
          value={basePrice}
          onChange={(e) => setBasePrice(Number(e.target.value))}
          placeholder="Base ₹"
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer"
        >
          + Add Movie
        </button>
      </form>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {movies.map((m) => (
          <div
            key={String(m.id)}
            className="rounded-xl bg-[#0e0e13] border border-white/12 p-4 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-sm font-bold text-white">{String(m.title)}</p>
              <p className="text-[11px] text-white/60">
                {String(m.language)} · {String(m.duration)} · ₹{String(m.base_price)}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleToggle(String(m.id), Number(m.published))}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                  Number(m.published) === 1
                    ? 'bg-emerald-500/15 text-emerald-300'
                    : 'bg-white/10 text-white/60'
                }`}
              >
                {Number(m.published) === 1 ? 'Published' : 'Hidden'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminTheatresAndSeatsView: React.FC<{
  initialSection?: 'theatres' | 'seats';
  onCatalogChanged: () => void;
}> = ({ initialSection = 'theatres', onCatalogChanged }) => {
  const [theatres, setTheatres] = useState<Record<string, unknown>[]>([]);
  const [screens, setScreens] = useState<Record<string, unknown>[]>([]);
  const [selectedScreenId, setSelectedScreenId] = useState('');
  const [seats, setSeats] = useState<Record<string, unknown>[]>([]);
  const [editMode, setEditMode] = useState<'STANDARD' | 'PREMIUM' | 'RECLINER' | 'COUPLE' | 'BLOCKED'>('RECLINER');
  const [msg, setMsg] = useState('');

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [city, setCity] = useState('Hyderabad');

  const loadTheatres = async () => {
    const res = await api.adminGetTheatres();
    setTheatres(res.theatres);
    setScreens(res.screens);
    if (!selectedScreenId && res.screens[0]) {
      setSelectedScreenId(String(res.screens[0].id));
    }
  };

  useEffect(() => {
    loadTheatres();
  }, []);

  useEffect(() => {
    if (selectedScreenId) {
      api.adminGetScreenSeats(selectedScreenId).then((r) => setSeats(r.seats));
    }
  }, [selectedScreenId]);

  const handleAddTheatre = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminCreateTheatre({ name, location, city });
    setName('');
    setLocation('');
    await loadTheatres();
    onCatalogChanged();
  };

  const handleSeatClick = (seatCode: string) => {
    setSeats((prev) =>
      prev.map((s) => {
        if (s.seat_code !== seatCode) return s;
        if (editMode === 'BLOCKED') {
          return { ...s, is_blocked: Number(s.is_blocked) === 1 ? 0 : 1 };
        }
        const delta =
          editMode === 'RECLINER' ? 180 : editMode === 'COUPLE' ? 140 : editMode === 'PREMIUM' ? 70 : 0;
        return { ...s, category: editMode, price_delta: delta, is_blocked: 0 };
      })
    );
  };

  const handleSaveLayout = async () => {
    const updates = seats.map((s) => ({
      seat_code: String(s.seat_code),
      category: String(s.category),
      price_delta: Number(s.price_delta),
      is_blocked: Number(s.is_blocked) === 1,
    }));
    await api.adminUpdateScreenSeats(selectedScreenId, updates);
    setMsg('Screen seat layout updated in SQLite!');
  };

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-white">
        {initialSection === 'seats' ? 'Visual Seat Layout Editor' : 'Theatres & Screens Manager'}
      </h1>

      <form
        onSubmit={handleAddTheatre}
        className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 grid grid-cols-1 sm:grid-cols-4 gap-3"
      >
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New Theatre Name"
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <input
          type="text"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="Area / Location"
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        >
          {['Hyderabad', 'Bengaluru', 'Mumbai', 'Chennai', 'Delhi NCR'].map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer"
        >
          + Add Theatre & Screen
        </button>
      </form>

      {/* Seat Layout Editor */}
      <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              Screen Seat Category & Block Editor
            </h2>
            <p className="text-xs text-white/60">
              Choose a paint brush below and click seats to customize pricing tiers or mark maintenance blocks.
            </p>
          </div>
          <select
            aria-label="Select screen for seat layout"
            value={selectedScreenId}
            onChange={(e) => setSelectedScreenId(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          >
            {screens.map((sc) => {
              const t = theatres.find((th) => th.id === sc.theatre_id);
              return (
                <option key={String(sc.id)} value={String(sc.id)}>
                  {String(t?.name ?? '')} — {String(sc.name)}
                </option>
              );
            })}
          </select>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['STANDARD', 'PREMIUM', 'RECLINER', 'COUPLE', 'BLOCKED'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setEditMode(mode)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
                editMode === mode
                  ? 'bg-[#E50914] border-[#FF242C] text-white'
                  : 'bg-[#16161d] border-white/15 text-white/75'
              }`}
            >
              Paint: {mode}
            </button>
          ))}
          <button
            type="button"
            onClick={handleSaveLayout}
            className="ml-auto px-5 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
          >
            Save Seat Layout
          </button>
        </div>

        {msg && <p className="text-xs text-emerald-300 font-semibold">{msg}</p>}

        <div className="grid grid-cols-10 gap-1.5 max-w-xl">
          {seats.map((s) => (
            <button
              key={String(s.id)}
              type="button"
              onClick={() => handleSeatClick(String(s.seat_code))}
              title={`${s.seat_code} · ${s.category} · +₹${s.price_delta}`}
              className={`h-8 rounded text-[10.5px] font-bold border cursor-pointer ${
                Number(s.is_blocked) === 1
                  ? 'bg-red-950/60 border-red-500/50 text-red-300'
                  : s.category === 'RECLINER'
                    ? 'bg-purple-950/50 border-purple-400/50 text-purple-200'
                    : s.category === 'COUPLE'
                      ? 'bg-pink-950/50 border-pink-400/50 text-pink-200'
                      : s.category === 'PREMIUM'
                        ? 'bg-amber-950/50 border-amber-400/50 text-amber-200'
                        : 'bg-[#16161d] border-white/15 text-white/85'
              }`}
            >
              {String(s.seat_code)}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};

export const AdminShowsAndBookingsView: React.FC<{
  mode: 'shows' | 'bookings';
  onCatalogChanged: () => void;
}> = ({ mode, onCatalogChanged }) => {
  const [shows, setShows] = useState<Record<string, unknown>[]>([]);
  const [bookings, setBookings] = useState<Record<string, unknown>[]>([]);
  const [movies, setMovies] = useState<Record<string, unknown>[]>([]);
  const [theatres, setTheatres] = useState<Record<string, unknown>[]>([]);
  const [screens, setScreens] = useState<Record<string, unknown>[]>([]);
  const [searchQ, setSearchQ] = useState('');

  const [movieId, setMovieId] = useState('');
  const [theatreId, setTheatreId] = useState('');
  const [screenId, setScreenId] = useState('');
  const [showDate, setShowDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [showTime, setShowTime] = useState('08:15 PM');
  const [basePrice, setBasePrice] = useState(320);

  const loadAll = async () => {
    if (mode === 'shows') {
      const [sRes, mRes, tRes] = await Promise.all([
        api.adminGetShows(),
        api.adminGetMovies(),
        api.adminGetTheatres(),
      ]);
      setShows(sRes.shows);
      setMovies(mRes.movies);
      setTheatres(tRes.theatres);
      setScreens(tRes.screens);
      if (!movieId && mRes.movies[0]) setMovieId(String(mRes.movies[0].id));
      if (!theatreId && tRes.theatres[0]) setTheatreId(String(tRes.theatres[0].id));
      if (!screenId && tRes.screens[0]) setScreenId(String(tRes.screens[0].id));
    } else {
      const bRes = await api.adminGetBookings(searchQ);
      setBookings(bRes.bookings);
    }
  };

  useEffect(() => {
    loadAll();
  }, [mode, searchQ]);

  const handleCreateShow = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.adminCreateShow({ movieId, theatreId, screenId, showDate, showTime, basePrice });
    await loadAll();
    onCatalogChanged();
  };

  if (mode === 'bookings') {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-extrabold text-white">Bookings Search & Audit</h1>
          <input
            type="text"
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Search booking code, user, mobile, movie..."
            className="w-full sm:w-80 px-4 py-2 rounded-full bg-[#121217] border border-white/15 text-xs text-white"
          />
        </div>

        <div className="space-y-3">
          {bookings.map((b) => (
            <div key={String(b.id)} className="rounded-2xl bg-[#0e0e13] border border-white/12 p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <span className="font-mono text-xs font-bold text-[#FF3B42]">
                    {String(b.booking_code)}
                  </span>
                  <h2 className="text-sm font-bold text-white">{String(b.movie_title)}</h2>
                  <p className="text-xs text-white/60">
                    {String(b.booker_name)} ({String(b.booker_mobile)}) · {String(b.theatre_name)} ·{' '}
                    {String(b.show_date)} {String(b.show_time)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-extrabold text-white">₹{String(b.total_amount)}</p>
                  <p className="text-[11px] text-emerald-300">
                    {String(b.status)} · QR: {String(b.qr_status ?? 'ACTIVE')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 text-[11px] text-white/75">
                <span className="px-2.5 py-0.5 rounded-full bg-[#E50914]/20 text-[#FF6B71] font-bold">
                  Seats: {Array.isArray(b.seats) ? (b.seats as string[]).join(', ') : ''}
                </span>
                {((b.companionAccess as Record<string, unknown>[]) ?? []).map((ca, idx) => (
                  <span key={idx} className="px-2.5 py-0.5 rounded-full bg-white/8">
                    Shared: {String(ca.companion_name)} ({String(ca.relation)})
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-extrabold text-white">Shows Scheduler</h1>
      <form
        onSubmit={handleCreateShow}
        className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 grid grid-cols-1 sm:grid-cols-6 gap-2.5"
      >
        <select
          value={movieId}
          onChange={(e) => setMovieId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        >
          {movies.map((m) => (
            <option key={String(m.id)} value={String(m.id)}>
              {String(m.title)}
            </option>
          ))}
        </select>
        <select
          value={theatreId}
          onChange={(e) => {
            setTheatreId(e.target.value);
            const match = screens.find((s) => s.theatre_id === e.target.value);
            if (match) setScreenId(String(match.id));
          }}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        >
          {theatres.map((t) => (
            <option key={String(t.id)} value={String(t.id)}>
              {String(t.name)}
            </option>
          ))}
        </select>
        <select
          value={screenId}
          onChange={(e) => setScreenId(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        >
          {screens
            .filter((s) => !theatreId || s.theatre_id === theatreId)
            .map((sc) => (
              <option key={String(sc.id)} value={String(sc.id)}>
                {String(sc.name)}
              </option>
            ))}
        </select>
        <input
          type="date"
          value={showDate}
          onChange={(e) => setShowDate(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <input
          type="text"
          value={showTime}
          onChange={(e) => setShowTime(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
        />
        <button
          type="submit"
          className="px-4 py-2 rounded-xl bg-[#E50914] text-white text-xs font-bold cursor-pointer"
        >
          + Schedule Show
        </button>
      </form>

      <div className="space-y-2.5">
        {shows.slice(0, 20).map((sh) => (
          <div
            key={String(sh.id)}
            className="rounded-xl bg-[#0e0e13] border border-white/12 p-3.5 flex items-center justify-between gap-3"
          >
            <div>
              <p className="text-xs font-bold text-white">
                {String(sh.movie_title)} — {String(sh.theatre_name)} ({String(sh.screen_name)})
              </p>
              <p className="text-[11px] text-white/60">
                {String(sh.show_date)} · {String(sh.show_time)} · {String(sh.format)} · ₹{String(sh.base_price)}
              </p>
            </div>
            {sh.status === 'ACTIVE' ? (
              <button
                type="button"
                onClick={async () => {
                  await api.adminCancelShow(String(sh.id));
                  await loadAll();
                  onCatalogChanged();
                }}
                className="px-3 py-1 rounded-full bg-[#2a1014] text-[#FF8A8F] text-[11px] font-bold cursor-pointer"
              >
                Cancel Show
              </button>
            ) : (
              <span className="text-[11px] text-white/40 font-bold">CANCELLED</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export const AdminCatalogMiscView: React.FC<{
  section: 'users' | 'food' | 'events' | 'coupons' | 'refunds' | 'settings';
  onCatalogChanged: () => void;
}> = ({ section, onCatalogChanged }) => {
  const [users, setUsers] = useState<Record<string, unknown>[]>([]);
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [events, setEvents] = useState<Record<string, unknown>[]>([]);
  const [coupons, setCoupons] = useState<Record<string, unknown>[]>([]);
  const [offers, setOffers] = useState<OfferItem[]>([]);
  const [refunds, setRefunds] = useState<Record<string, unknown>[]>([]);
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [savedMsg, setSavedMsg] = useState('');

  // Quick add states
  const [foodName, setFoodName] = useState('');
  const [foodPrice, setFoodPrice] = useState(190);
  const [couponCode, setCouponCode] = useState('');
  const [couponTitle, setCouponTitle] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventVenue, setEventVenue] = useState('');

  const load = async () => {
    if (section === 'users') setUsers((await api.adminGetUsers()).users);
    if (section === 'food') setFoodItems((await api.adminGetFood()).foodItems);
    if (section === 'events') setEvents((await api.adminGetEvents()).events);
    if (section === 'coupons') {
      const r = await api.adminGetCoupons();
      setCoupons(r.coupons);
      setOffers(r.offers);
    }
    if (section === 'refunds') setRefunds((await api.adminGetRefunds()).refunds);
    if (section === 'settings') setSettings((await api.getAdminOverview()).settings);
  };

  useEffect(() => {
    setSavedMsg('');
    load();
  }, [section]);

  if (section === 'users') {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-extrabold text-white">Users Directory</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {users.map((u) => (
            <div key={String(u.id)} className="rounded-xl bg-[#0e0e13] border border-white/12 p-4">
              <p className="text-sm font-bold text-white">{String(u.name)}</p>
              <p className="text-xs text-white/60">
                {String(u.email)} · {String(u.mobile)}
              </p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded bg-white/10 text-[10px] font-bold">
                {String(u.role)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'food') {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold text-white">Food & Beverages Manager</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.adminCreateFood({ name: foodName, price: foodPrice });
            setFoodName('');
            await load();
            onCatalogChanged();
          }}
          className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            required
            value={foodName}
            onChange={(e) => setFoodName(e.target.value)}
            placeholder="Item Name (e.g. Truffle Fries)"
            className="flex-1 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          />
          <input
            type="number"
            value={foodPrice}
            onChange={(e) => setFoodPrice(Number(e.target.value))}
            className="w-28 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white cursor-pointer">
            + Add Snack
          </button>
        </form>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {foodItems.map((fi) => (
            <div key={fi.id} className="rounded-xl bg-[#0e0e13] border border-white/12 p-3.5 flex justify-between items-center">
              <div>
                <p className="text-xs font-bold text-white">{fi.name}</p>
                <p className="text-[11px] text-white/60">{fi.category} · ₹{fi.price}</p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await api.adminUpdateFood(fi.id, { available: fi.available === 0 });
                  await load();
                  onCatalogChanged();
                }}
                className={`px-3 py-1 rounded-full text-[11px] font-bold cursor-pointer ${
                  fi.available ? 'bg-emerald-500/15 text-emerald-300' : 'bg-white/10 text-white/50'
                }`}
              >
                {fi.available ? 'Available' : 'Out of Stock'}
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'events') {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold text-white">Live Events Manager</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.adminCreateEvent({ title: eventTitle, venue: eventVenue });
            setEventTitle('');
            setEventVenue('');
            await load();
            onCatalogChanged();
          }}
          className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            required
            value={eventTitle}
            onChange={(e) => setEventTitle(e.target.value)}
            placeholder="Event Title"
            className="flex-1 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          />
          <input
            type="text"
            required
            value={eventVenue}
            onChange={(e) => setEventVenue(e.target.value)}
            placeholder="Venue"
            className="flex-1 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white cursor-pointer">
            + Add Event
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.map((ev) => (
            <div key={String(ev.id)} className="rounded-xl bg-[#0e0e13] border border-white/12 p-4">
              <p className="text-sm font-bold text-white">{String(ev.title)}</p>
              <p className="text-xs text-white/60">
                {String(ev.category)} · {String(ev.venue)} · ₹{String(ev.price)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section === 'coupons') {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-2xl font-extrabold text-white">Coupons & Offers</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await api.adminCreateCoupon({ code: couponCode, title: couponTitle });
            setCouponCode('');
            setCouponTitle('');
            await load();
          }}
          className="rounded-2xl bg-[#0e0e13] border border-white/15 p-4 flex flex-wrap gap-3"
        >
          <input
            type="text"
            required
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
            placeholder="CODE (e.g. WEEKEND100)"
            className="px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white uppercase"
          />
          <input
            type="text"
            required
            value={couponTitle}
            onChange={(e) => setCouponTitle(e.target.value)}
            placeholder="Offer Description"
            className="flex-1 px-3 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
          />
          <button type="submit" className="px-4 py-2 rounded-xl bg-[#E50914] text-xs font-bold text-white cursor-pointer">
            + Create Coupon
          </button>
        </form>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coupons.map((c) => (
            <div key={String(c.id)} className="rounded-xl bg-[#0e0e13] border border-white/12 p-4">
              <p className="font-mono text-sm font-bold text-[#FF3B42]">{String(c.code)}</p>
              <p className="text-xs text-white">{String(c.title)}</p>
              <p className="text-[11px] text-white/55">
                Min ₹{String(c.min_amount)} · Expires {String(c.expiry_date)}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs text-white/50">Active Storefront Offers: {offers.length}</p>
      </div>
    );
  }

  if (section === 'refunds') {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-2xl font-extrabold text-white">Refunds Ledger</h1>
        {refunds.length === 0 ? (
          <p className="text-xs text-white/60">No cancellations/refunds recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {refunds.map((r) => (
              <div key={String(r.id)} className="rounded-xl bg-[#0e0e13] border border-white/12 p-4 flex justify-between">
                <div>
                  <p className="text-xs font-bold text-white">
                    {String(r.booking_code)} — {String(r.movie_title)}
                  </p>
                  <p className="text-[11px] text-white/60">
                    {String(r.user_name)} · {String(r.reason)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-emerald-300">₹{String(r.refund_amount)}</p>
                  <p className="text-[10.5px] text-white/50">Fee: ₹{String(r.cancellation_fee)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-xl">
      <h1 className="font-display text-2xl font-extrabold text-white">
        Cancellation & Fee Settings
      </h1>
      {savedMsg && <p className="text-xs text-emerald-300 font-semibold">{savedMsg}</p>}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await api.adminUpdateSettings(settings);
          setSavedMsg('Platform policy settings saved!');
        }}
        className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4"
      >
        {[
          ['free_cancel_hours', 'Full Refund Window (hours before show)'],
          ['partial_refund_pct', 'Partial Refund Percentage (%)'],
          ['convenience_fee_pct', 'Convenience Fee (%)'],
          ['tax_pct', 'GST Tax Rate (%)'],
        ].map(([key, label]) => (
          <div key={key}>
            <label className="text-xs text-white/70 block mb-1">{label}</label>
            <input
              type="number"
              value={settings[key] ?? ''}
              onChange={(e) => setSettings((p) => ({ ...p, [key]: e.target.value }))}
              className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
            />
          </div>
        ))}
        <button type="submit" className="px-6 py-2.5 rounded-full bg-[#E50914] text-xs font-bold text-white cursor-pointer">
          Save Policy Settings
        </button>
      </form>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  User,
  Heart,
  MapPin,
  CreditCard,
  Users,
  Tag,
  Copy,
  Check,
  Bell,
  CheckCheck,
  Bookmark,
  Trash2,
} from 'lucide-react';
import { api } from '../../utils/api';
import { CITIES } from '../../data/events';
import { PWAInstallButton } from '../../components/PWAInstallBanner';
import type {
  CatalogMovie,
  NotificationItem,
  OfferItem,
  SafeUser,
} from '../../types/platform';

interface ProfilePageProps {
  currentUser: SafeUser | null;
  movies: CatalogMovie[];
  firebaseIdToken?: string | null;
  onSelectTheatre?: (theatreId: string) => void;
  onUserUpdated: (user: SafeUser) => void;
  onSelectMovie: (movieId: string) => void;
  onRequireLogin: () => void;
}

export const ProfilePage: React.FC<ProfilePageProps> = ({
  currentUser,
  movies,
  firebaseIdToken,
  onSelectTheatre,
  onUserUpdated,
  onSelectMovie,
  onRequireLogin,
}) => {
  const [name, setName] = useState(currentUser?.name ?? '');
  const [city, setCity] = useState(currentUser?.preferredCity ?? 'Hyderabad');
  const [newLocation, setNewLocation] = useState('');
  const [newPaymentLabel, setNewPaymentLabel] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [cloudVenues, setCloudVenues] = useState<
    { theatreId: string; theatreName: string; city: string; note?: string | null }[]
  >([]);

  useEffect(() => {
    if (!firebaseIdToken) {
      setCloudVenues([]);
      return;
    }
    api
      .cloudGetMe(firebaseIdToken)
      .then((res) => setCloudVenues(res.savedVenues ?? []))
      .catch(() => setCloudVenues([]));
  }, [firebaseIdToken]);

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <User className="w-12 h-12 mx-auto text-[#FF252E]" />
        <h1 className="font-display text-2xl font-extrabold text-white">Your Profile</h1>
        <p className="text-xs text-white/65">Sign in to manage preferences, wishlist, and family links.</p>
        <button
          type="button"
          onClick={onRequireLogin}
          className="px-6 py-2.5 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer min-h-[44px]"
        >
          Sign In
        </button>
      </div>
    );
  }

  const wishlistMovies = movies.filter((m) => currentUser.wishlist.includes(m.id));

  const handleSave = async (
    locations = currentUser.savedLocations,
    payments = currentUser.savedPaymentMethods,
    wishlist = currentUser.wishlist
  ) => {
    const res = await api.updateProfile({
      name: name || currentUser.name,
      preferredCity: city,
      savedLocations: locations,
      savedPaymentMethods: payments,
      wishlist,
    });
    onUserUpdated(res.user);
    setSavedMsg('Profile preferences saved.');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 pb-24 sm:pb-10 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            Account Preferences
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            {currentUser.name}
          </h1>
          <p className="text-xs text-white/65">
            {currentUser.email} · {currentUser.mobile}
          </p>
        </div>
        <PWAInstallButton />
      </div>

      {savedMsg && (
        <div className="rounded-xl bg-emerald-950/60 border border-emerald-500/40 px-4 py-2.5 text-xs text-emerald-300">
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <User className="w-4 h-4 text-[#FF252E]" />
            <span>Personal Details</span>
          </h2>
          <div className="space-y-3">
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-[11px] text-white/60 block mb-1">Preferred City</label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
              >
                {CITIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => handleSave()}
              className="px-5 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#FF252E]" />
            <span>Saved Locations & Payment Labels</span>
          </h2>

          <div>
            <p className="text-[11px] text-white/60 mb-1.5">Saved Locations</p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentUser.savedLocations.map((loc) => (
                <span key={loc} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
                  {loc}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                placeholder="Add city or neighbourhood..."
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newLocation.trim()) return;
                  handleSave([...currentUser.savedLocations, newLocation.trim()]);
                  setNewLocation('');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          <div className="pt-2 border-t border-white/10">
            <p className="text-[11px] text-white/60 mb-1.5 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-[#FF252E]" />
              <span>Saved Payment Methods (Tokenized)</span>
            </p>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {currentUser.savedPaymentMethods.map((pm) => (
                <span key={pm} className="px-3 py-1 rounded-full bg-white/10 text-xs text-white">
                  {pm}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newPaymentLabel}
                onChange={(e) => setNewPaymentLabel(e.target.value)}
                placeholder="e.g. GPay ramesh@okicici"
                className="flex-1 px-3 py-1.5 rounded-xl bg-[#16161d] border border-white/15 text-xs text-white"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newPaymentLabel.trim()) return;
                  handleSave(currentUser.savedLocations, [
                    ...currentUser.savedPaymentMethods,
                    newPaymentLabel.trim(),
                  ]);
                  setNewPaymentLabel('');
                }}
                className="px-3 py-1.5 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Wishlist */}
      <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-4">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <Heart className="w-4 h-4 text-[#FF252E]" />
          <span>Saved Wishlist ({wishlistMovies.length})</span>
        </h2>
        {wishlistMovies.length === 0 ? (
          <p className="text-xs text-white/60">No movies saved in your wishlist yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {wishlistMovies.map((m) => (
              <div
                key={m.id}
                className="rounded-xl bg-[#15151c] border border-white/10 p-3 flex flex-col justify-between gap-2"
              >
                <img src={m.poster} alt={m.title} className="w-full h-36 object-cover rounded-lg" />
                <p className="text-xs font-bold text-white truncate">{m.title}</p>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectMovie(m.id)}
                    className="flex-1 py-1.5 rounded-full bg-[#E50914] text-white text-[11px] font-bold cursor-pointer"
                  >
                    Book
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      handleSave(
                        currentUser.savedLocations,
                        currentUser.savedPaymentMethods,
                        currentUser.wishlist.filter((id) => id !== m.id)
                      )
                    }
                    className="px-2.5 py-1.5 rounded-full bg-white/10 text-[11px] text-white cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Companion Links */}
      <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-3">
        <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-[#FF252E]" />
          <span>Family & Companion Links</span>
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {currentUser.companionLinks.map((lk) => (
            <div key={lk.id} className="rounded-xl bg-[#15151c] border border-white/10 p-3">
              <p className="text-xs font-bold text-white">{lk.companion_name}</p>
              <p className="text-[11px] text-[#FF3B42]">{lk.relation}</p>
              <p className="text-[11px] text-white/55 font-mono mt-0.5">{lk.companion_mobile}</p>
            </div>
          ))}
        </div>
      </section>

      {firebaseIdToken && (
        <section className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 space-y-3">
          <h2 className="font-display text-lg font-bold text-white flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-[#FF252E]" />
            <span>Saved Cinema Venues ({cloudVenues.length})</span>
          </h2>
          {cloudVenues.length === 0 ? (
            <p className="text-xs text-white/60">
              No venues saved yet. Open any theatre page and click &ldquo;Save Venue&rdquo; to pin it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cloudVenues.map((v) => (
                <div
                  key={v.theatreId}
                  className="rounded-xl bg-[#15151c] border border-white/10 p-3 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={() => onSelectTheatre?.(v.theatreId)}
                    className="text-left min-w-0 flex-1 cursor-pointer"
                  >
                    <p className="text-xs font-bold text-white truncate hover:text-[#FF3B42]">
                      {v.theatreName}
                    </p>
                    <p className="text-[11px] text-white/55">{v.city}</p>
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${v.theatreName}`}
                    onClick={async () => {
                      await api.cloudRemoveSavedVenue(firebaseIdToken, v.theatreId);
                      setCloudVenues((prev) => prev.filter((item) => item.theatreId !== v.theatreId));
                    }}
                    className="p-2 rounded-lg bg-white/5 hover:bg-[#E50914]/25 text-white/70 hover:text-white cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export const OffersPage: React.FC<{ offers: OfferItem[] }> = ({ offers }) => {
  const [copiedCode, setCopiedCode] = useState('');

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code).catch(() => {});
    setCopiedCode(code);
    window.setTimeout(() => setCopiedCode(''), 2000);
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div>
        <span className="text-xs font-bold uppercase tracking-wider text-[#FF252E] flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5" />
          <span>Verified Deals & Promo Codes</span>
        </span>
        <h1 className="font-display text-3xl font-extrabold text-white mt-1">
          Offers & Coupon Codes
        </h1>
        <p className="text-sm text-white/65 mt-1">
          Apply any active promo code during checkout for instant ticket & food savings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {offers.map((off) => (
          <div
            key={off.id}
            className="rounded-2xl bg-[#0e0e13] border border-white/15 p-5 flex flex-col justify-between gap-4"
          >
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[11px] font-bold">
                {off.badge}
              </span>
              <h2 className="font-display text-lg font-bold text-white mt-2.5">{off.title}</h2>
              <p className="text-xs text-white/70 mt-1">{off.description}</p>
              <p className="text-[11px] text-white/45 mt-2">Valid till {off.valid_till}</p>
            </div>

            <div className="pt-3 border-t border-white/10 flex items-center justify-between">
              <span className="font-mono text-sm font-extrabold text-[#FF3B42]">{off.code}</span>
              <button
                type="button"
                onClick={() => handleCopy(off.code)}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-[#E50914] text-xs font-bold text-white cursor-pointer"
              >
                {copiedCode === off.code ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const NotificationsPage: React.FC<{
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
}> = ({ notifications, onMarkAllRead }) => {
  return (
    <div className="max-w-[900px] mx-auto px-4 lg:px-8 py-8 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#FF252E]" />
            <span>Notifications</span>
          </h1>
          <p className="text-xs text-white/60">
            Booking confirmations, shared companion passes, food updates & refunds.
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="rounded-2xl bg-[#0e0e13] border border-white/15 p-8 text-center text-sm text-white/65">
          You have no notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-4 ${
                n.is_read === 0
                  ? 'bg-[#1a1013] border-[#FF1822]/40'
                  : 'bg-[#0e0e13] border-white/12'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-bold text-white">{n.title}</h2>
                <span className="text-[10.5px] text-white/45">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-white/75 mt-1">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { ArrowLeft, Calendar, MapPin, Star, Ticket, Users } from 'lucide-react';
import { SkeletonEventCard } from '../../components/skeletons/LoadingSkeletons';
import type { CatalogEvent, CheckoutDraft } from '../../types/platform';

interface EventsPageProps {
  events: CatalogEvent[];
  onSelectEvent: (eventId: string) => void;
}

const EVENT_CATEGORIES = ['All', 'Concerts', 'Comedy Shows', 'Sports', 'Arts & Culture'] as const;

export const EventsPage: React.FC<EventsPageProps> = ({ events, onSelectEvent }) => {
  const [category, setCategory] = useState<string>('All');
  const [search, setSearch] = useState('');

  const filtered = events.filter((ev) => {
    if (category !== 'All' && ev.category !== category) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      return (
        ev.title.toLowerCase().includes(q) ||
        ev.venue.toLowerCase().includes(q) ||
        ev.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-[1460px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#FF252E]">
            <Star className="w-3.5 h-3.5" />
            <span>Concerts · Stand-Up · Sports · Culture</span>
          </span>
          <h1 className="font-display text-3xl font-extrabold text-white mt-1">
            Live Events & Entertainment
          </h1>
        </div>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search artists, comedy, venues..."
          className="w-full md:w-72 px-4 py-2.5 rounded-full bg-[#111116] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {EVENT_CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategory(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold border cursor-pointer ${
              category === cat
                ? 'bg-[#E50914] border-[#FF242C] text-white'
                : 'bg-[#141418] border-white/15 text-white/75'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonEventCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-[#0e0e12] border border-white/15 p-8 text-center text-sm text-white/70">
          No events found for this filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((ev) => (
          <article
            key={ev.id}
            className="rounded-2xl bg-[#0e0e13] border border-white/15 hover:border-[#FF1822]/70 overflow-hidden flex flex-col justify-between k2s-card-hover"
          >
            <div className="relative h-44">
              <img src={ev.image} alt={ev.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0e0e13] via-black/30 to-transparent" />
              <span className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-[#E50914] text-white text-[11px] font-bold">
                {ev.badge}
              </span>
            </div>
            <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#FF3B42]">{ev.category}</p>
                <h2 className="font-display text-lg font-bold text-white mt-0.5">{ev.title}</h2>
                <p className="text-xs text-white/65 mt-2 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>{ev.date} · {ev.time}</span>
                </p>
                <p className="text-xs text-white/65 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#FF252E]" />
                  <span>{ev.venue}</span>
                </p>
              </div>
              <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-sm font-bold text-white">₹{ev.price} onwards</span>
                <button
                  type="button"
                  onClick={() => onSelectEvent(ev.id)}
                  className="px-4 py-1.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-xs font-bold cursor-pointer hover:brightness-110"
                >
                  Book Passes
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      )}
    </div>
  );
};

interface EventDetailsPageProps {
  event: CatalogEvent;
  onProceedToCheckout: (draft: CheckoutDraft) => void;
  onBack: () => void;
}

export const EventDetailsPage: React.FC<EventDetailsPageProps> = ({
  event,
  onProceedToCheckout,
  onBack,
}) => {
  const tiers = event.tiers?.length
    ? event.tiers
    : [{ id: 'default', event_id: event.id, tier_name: 'Silver Access', price: event.price, total_qty: 200, sold_qty: 50 }];
  const [selectedTierName, setSelectedTierName] = useState(tiers[0].tier_name);
  const [qty, setQty] = useState(2);

  const activeTier = tiers.find((t) => t.tier_name === selectedTierName) ?? tiers[0];

  const handleBook = () => {
    onProceedToCheckout({
      kind: 'EVENT',
      event,
      eventTierName: activeTier.tier_name,
      eventUnitPrice: activeTier.price,
      eventQty: qty,
      selectedSeats: Array.from({ length: qty }, (_, i) => ({
        seatCode: `PASS-${i + 1}`,
        price: activeTier.price,
        category: activeTier.tier_name,
      })),
      foodCart: [],
      companions: [],
    });
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 lg:px-8 py-6 space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-xs font-semibold text-white/75 hover:text-white cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Live Events</span>
      </button>

      <div className="rounded-3xl bg-[#0c0c10] border border-white/15 overflow-hidden grid grid-cols-1 lg:grid-cols-2">
        <div className="relative min-h-[260px]">
          <img src={event.image} alt={event.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
          <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-[#E50914] text-white text-xs font-bold">
            {event.badge}
          </span>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <p className="text-xs font-bold text-[#FF3B42]">{event.category}</p>
            <h1 className="font-display text-3xl font-extrabold text-white mt-1">{event.title}</h1>
            <p className="text-xs text-white/75 mt-2">{event.description}</p>
          </div>

          <div className="space-y-1.5 text-xs text-white/80 bg-[#141419] p-3.5 rounded-2xl border border-white/10">
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#FF252E]" />
              <span>{event.date} at {event.time}</span>
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#FF252E]" />
              <span>{event.venue}, {event.city}</span>
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-white/60 mb-2">Select Pass Tier</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {tiers.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTierName(t.tier_name)}
                  className={`p-3 rounded-xl border text-left cursor-pointer ${
                    selectedTierName === t.tier_name
                      ? 'bg-[#261014] border-[#FF1822] text-white'
                      : 'bg-[#15151b] border-white/10 text-white/80'
                  }`}
                >
                  <p className="text-xs font-bold">{t.tier_name}</p>
                  <p className="text-sm font-extrabold text-[#FF3B42] mt-0.5">₹{t.price}</p>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    {Math.max(0, t.total_qty - t.sold_qty)} left
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between bg-[#141419] p-3.5 rounded-2xl border border-white/10">
            <span className="text-xs font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF252E]" />
              <span>Number of Passes (Shareable with Companions)</span>
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-7 rounded-full bg-white/10 text-white font-bold cursor-pointer"
              >
                -
              </button>
              <span className="text-sm font-bold text-white tabular-nums">{qty}</span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(8, q + 1))}
                className="w-7 h-7 rounded-full bg-white/10 text-white font-bold cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={handleBook}
            className="w-full py-3 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold shadow-[0_4px_16px_rgba(229,9,20,0.4)] hover:brightness-110 cursor-pointer flex items-center justify-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            <span>Continue to Checkout · ₹{activeTier.price * qty}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

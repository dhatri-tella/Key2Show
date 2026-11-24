import React, { useState } from 'react';
import { X, Calendar, MapPin, CheckCircle2, QrCode } from 'lucide-react';
import type { LiveEvent, EventCategory } from '../../data/events';
import type { ConfirmedTicket } from './MovieDetailsModal';
import { generateTicketCode } from '../../utils/bookingLogic';

interface EventsExplorerModalProps {
  events: LiveEvent[];
  initialEvent?: LiveEvent | null;
  onClose: () => void;
  onConfirmBooking: (ticket: ConfirmedTicket) => void;
}

const EVENT_TABS: ('All' | EventCategory)[] = [
  'All',
  'Concerts',
  'Comedy Shows',
  'Sports',
  'Arts & Culture',
];

export const EventsExplorerModal: React.FC<EventsExplorerModalProps> = ({
  events,
  initialEvent = null,
  onClose,
  onConfirmBooking,
}) => {
  const [selectedTab, setSelectedTab] = useState<'All' | EventCategory>('All');
  const [activeEvent, setActiveEvent] = useState<LiveEvent | null>(initialEvent);
  const [ticketQty, setTicketQty] = useState(2);
  const [confirmed, setConfirmed] = useState<ConfirmedTicket | null>(null);

  const visibleEvents =
    selectedTab === 'All'
      ? events
      : events.filter((e) => e.category === selectedTab);

  const handleBook = (ev: LiveEvent) => {
    const seats = Array.from({ length: ticketQty }, (_, i) => `GA-${i + 1}`);
    const ticket: ConfirmedTicket = {
      id: `${Date.now()}`,
      ticketCode: generateTicketCode(ev.id, 'evt', seats),
      title: ev.title,
      venue: ev.venue,
      dateLabel: ev.date,
      showtime: ev.time,
      format: ev.category,
      seats,
      totalPaid: ev.price * ticketQty,
    };
    setConfirmed(ticket);
    onConfirmBooking(ticket);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Live Events and Entertainment"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close events explorer"
          className="absolute right-4 top-4 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {confirmed ? (
          <div className="py-6 text-center flex flex-col items-center">
            <CheckCircle2 className="w-12 h-12 text-[#FF252E]" />
            <h3 className="font-display text-2xl font-bold text-white mt-3">
              Event Pass Confirmed!
            </h3>
            <p className="text-sm text-white/75 mt-1">{confirmed.title}</p>
            <div className="mt-5 p-4 rounded-xl bg-[#15151b] border border-white/15 flex items-center gap-4 text-left">
              <div className="p-2 rounded-lg bg-white text-black">
                <QrCode className="w-12 h-12" />
              </div>
              <div className="text-xs space-y-1">
                <p className="text-white font-semibold">{confirmed.venue}</p>
                <p className="text-white/75">
                  {confirmed.dateLabel} · {confirmed.showtime}
                </p>
                <p className="text-[#FF3B42] font-bold tabular-nums">
                  {confirmed.seats.length} Passes · ₹{confirmed.totalPaid}
                </p>
                <code className="text-[11px] text-white/60 block">{confirmed.ticketCode}</code>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-8 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold cursor-pointer"
            >
              Done
            </button>
          </div>
        ) : activeEvent ? (
          <div>
            <button
              type="button"
              onClick={() => setActiveEvent(null)}
              className="text-xs text-[#FF3B42] hover:underline mb-4 cursor-pointer"
            >
              ← Back to all events
            </button>

            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
              <img
                src={activeEvent.image}
                alt={activeEvent.title}
                referrerPolicy="no-referrer"
                className="w-full h-48 md:h-full rounded-xl object-cover border border-white/15"
              />
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-semibold text-[#FF3B42]">
                    {activeEvent.category} · {activeEvent.badge}
                  </span>
                  <h3 className="font-display text-2xl font-bold text-white mt-1">
                    {activeEvent.title}
                  </h3>
                  <p className="text-sm text-white/75 mt-2 leading-relaxed">
                    {activeEvent.description}
                  </p>
                </div>

                <div className="space-y-1.5 text-sm text-white/80">
                  <p className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#FF1822]" />
                    <span>
                      {activeEvent.date} · {activeEvent.time}
                    </span>
                  </p>
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-[#FF1822]" />
                    <span>{activeEvent.venue}</span>
                  </p>
                </div>

                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-white/75">Passes:</span>
                    <div className="inline-flex items-center rounded-full bg-[#181820] border border-white/15">
                      <button
                        type="button"
                        onClick={() => setTicketQty((q) => Math.max(1, q - 1))}
                        className="px-3 py-1 text-white font-bold cursor-pointer"
                      >
                        -
                      </button>
                      <span className="px-3 text-sm font-bold text-white tabular-nums">
                        {ticketQty}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTicketQty((q) => Math.min(8, q + 1))}
                        className="px-3 py-1 text-white font-bold cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBook(activeEvent)}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white font-bold text-sm k2s-red-glow cursor-pointer"
                  >
                    Pay ₹{activeEvent.price * ticketQty} &amp; Book
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="font-display text-2xl font-bold text-white">
              Live Events &amp; <span className="text-[#FF1C24]">Entertainment</span>
            </h3>
            <p className="text-xs text-white/70 mt-1">
              Concerts, comedy tours, sports derbies, and cultural showcases.
            </p>

            <div className="flex flex-wrap gap-2 mt-4">
              {EVENT_TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSelectedTab(tab)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                    selectedTab === tab
                      ? 'bg-[#E50914] border-[#FF3B42] text-white'
                      : 'bg-[#15151a] border-white/15 text-white/80 hover:border-white/40'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {visibleEvents.map((ev) => (
                <article
                  key={ev.id}
                  className="rounded-xl bg-[#141419] border border-white/15 p-3.5 flex gap-3.5 items-center hover:border-[#FF1822]/60 transition-colors"
                >
                  <img
                    src={ev.image}
                    alt={ev.title}
                    referrerPolicy="no-referrer"
                    className="w-24 h-24 rounded-lg object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-semibold text-[#FF3B42]">
                      {ev.category}
                    </span>
                    <h4 className="font-display font-bold text-sm text-white truncate">
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-white/70 mt-0.5 truncate">
                      {ev.date} · {ev.venue}
                    </p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-xs font-bold text-white tabular-nums">
                        ₹{ev.price}
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveEvent(ev)}
                        className="px-3.5 py-1 rounded-full bg-[#E50914] text-white text-[11px] font-bold hover:brightness-110 cursor-pointer"
                      >
                        Select
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

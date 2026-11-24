import React from 'react';
import { X, Tag, HelpCircle, Shield, FileText, Mail, Info } from 'lucide-react';

export type InfoTopic =
  | 'help'
  | 'offers'
  | 'about'
  | 'contact'
  | 'terms'
  | 'privacy'
  | 'refund'
  | 'faq';

interface InfoModalProps {
  topic: InfoTopic;
  onClose: () => void;
}

const TOPIC_CONTENT: Record<
  InfoTopic,
  { title: string; subtitle: string; items: { heading: string; body: string }[] }
> = {
  offers: {
    title: 'Key2Show Exclusive Offers',
    subtitle: 'Apply these verified promo codes during seat checkout.',
    items: [
      {
        heading: 'KEY2SHOW100 — Flat ₹100 Off',
        body: 'Valid on all blockbuster movie bookings across Hyderabad, Bengaluru, Mumbai, Chennai, and Delhi NCR.',
      },
      {
        heading: 'FIRST20 — 20% Instant Savings',
        body: 'Enjoy 20% off your first movie or live concert pass with instant QR ticket delivery.',
      },
    ],
  },
  help: {
    title: '24/7 Support & Help Center',
    subtitle: 'Everything you need for smooth cinema and event entry.',
    items: [
      {
        heading: 'QR Ticket Validation',
        body: 'Present your Key2Show digital QR pass at the theatre lobby scanner 15 minutes before showtime.',
      },
      {
        heading: 'Need Urgent Assistance?',
        body: 'Reach our support desk anytime at support@key2show.example or call 1800-120-2025.',
      },
    ],
  },
  about: {
    title: 'About Key2Show',
    subtitle: 'Your Entertainment. Your Ticket. Your Show.',
    items: [
      {
        heading: 'Built for Cinema & Live Culture',
        body: 'Key2Show connects moviegoers and live event fans across India with flagship IMAX screens, multiplexes, concerts, and stand-up tours.',
      },
      {
        heading: 'Instant Confirmation',
        body: 'Real-time seat selection, zero-hassle checkout, and encrypted QR passes delivered directly to your account.',
      },
    ],
  },
  contact: {
    title: 'Contact Key2Show',
    subtitle: 'Partner theatres, event organizers, and customer care.',
    items: [
      {
        heading: 'Hyderabad Headquarters',
        body: 'Level 8, HITEC City Entertainment Tower, Madhapur, Hyderabad 500081.',
      },
      {
        heading: 'Direct Channels',
        body: 'Customer Care: support@key2show.example · Partnerships: venues@key2show.example',
      },
    ],
  },
  terms: {
    title: 'Terms & Conditions',
    subtitle: 'Standard ticketing and venue admission guidelines.',
    items: [
      {
        heading: 'Ticket Admission',
        body: 'Confirmed tickets are valid only for the selected venue, date, showtime, and seat numbers.',
      },
      {
        heading: 'Age Certification',
        body: 'Patrons must comply with CBFC film certification guidelines at cinema entry.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    subtitle: 'Your booking data and payment preferences stay protected.',
    items: [
      {
        heading: 'Data Protection',
        body: 'Key2Show uses encrypted session handling and never shares personal contact details with third-party marketers.',
      },
    ],
  },
  refund: {
    title: 'Refund & Cancellation Policy',
    subtitle: 'Flexible cancellations on participating multiplexes.',
    items: [
      {
        heading: 'Up to 2 Hours Before Showtime',
        body: 'Eligible movie bookings can be cancelled up to 120 minutes prior to showtime for an instant wallet or source refund.',
      },
    ],
  },
  faq: {
    title: 'Frequently Asked Questions',
    subtitle: 'Quick answers about tickets, seats, and promo codes.',
    items: [
      {
        heading: 'Do I need a printed ticket?',
        body: 'No. Every Key2Show booking generates an instant QR Ticket accepted at all partner theatres.',
      },
      {
        heading: 'Can I book more than one seat at a time?',
        body: 'Yes, select up to 6 seats per movie booking or 8 passes per live event.',
      },
    ],
  },
};

export const InfoModal: React.FC<InfoModalProps> = ({ topic, onClose }) => {
  const data = TOPIC_CONTENT[topic];
  const Icon =
    topic === 'offers'
      ? Tag
      : topic === 'help' || topic === 'faq'
        ? HelpCircle
        : topic === 'privacy' || topic === 'refund'
          ? Shield
          : topic === 'contact'
            ? Mail
            : topic === 'about'
              ? Info
              : FileText;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-[#0e0e12] border border-white/15 shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 p-2 rounded-full bg-black/60 border border-white/15 text-white/80 hover:text-white hover:border-[#FF1822] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#E50914]/15 border border-[#FF1822]/40 flex items-center justify-center text-[#FF252E] shrink-0">
            <Icon className="w-5 h-5" />
          </span>
          <div>
            <h3 className="font-display text-xl font-bold text-white">{data.title}</h3>
            <p className="text-xs text-white/65">{data.subtitle}</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          {data.items.map((item) => (
            <div
              key={item.heading}
              className="rounded-xl bg-[#15151a] border border-white/10 p-3.5"
            >
              <h4 className="text-sm font-bold text-white">{item.heading}</h4>
              <p className="text-xs text-white/75 mt-1 leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 rounded-full bg-[#E50914] text-white text-xs font-bold cursor-pointer hover:brightness-110"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};

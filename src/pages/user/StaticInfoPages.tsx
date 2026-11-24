import React, { useState } from 'react';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  HelpCircle,
  ShieldCheck,
  Film,
  Users,
  QrCode,
  Send,
  CheckCircle2,
  ChevronDown,
} from 'lucide-react';
import { navigate } from '../../utils/router';

interface StaticPageProps {
  onBack?: () => void;
}

export const AboutPage: React.FC<StaticPageProps> = ({ onBack }) => {
  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  return (
    <div className="max-w-[880px] mx-auto px-4 lg:px-8 py-8 pb-24 space-y-8">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition cursor-pointer min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-3">
        <div className="inline-block px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF3B42] text-[10px] font-bold tracking-widest uppercase">
          About Key2Show
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
          Next-Generation Cinematic Entertainment
        </h1>
        <p className="text-sm sm:text-base text-white/70 leading-relaxed">
          Key2Show is Hyderabad's premier movie and live event discovery and ticketing platform.
          Engineered for film lovers, our platform connects moviegoers with iconic theatres—from
          Prasads IMAX and AMB Cinemas to single-screen cultural landmarks across South India.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-5 rounded-2xl bg-[#111] border border-white/10 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-[#E50914]/15 border border-[#E50914]/30 flex items-center justify-center text-[#FF3B42]">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">1 Booking = 1 QR Standard</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            Eliminating clutter. Whether you book 2 seats or 10, your entire party enters seamlessly
            with one single high-security QR pass.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111] border border-white/10 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Users className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Real Companion Access</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            Buy tickets for family members or friends even if you are not attending. Verified companions
            instantly access the booking in their app.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#111] border border-white/10 space-y-2.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Film className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white">Live Theatre Maps</h3>
          <p className="text-xs text-white/60 leading-relaxed">
            Interactive venue locator with real-time showtimes, seat maps, and food pre-ordering for
            zero-queue intermission experiences.
          </p>
        </div>
      </div>
    </div>
  );
};

export const ContactPage: React.FC<StaticPageProps> = ({ onBack }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState('Ticketing Inquiry');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;
    setSubmitted(true);
  };

  return (
    <div className="max-w-[880px] mx-auto px-4 lg:px-8 py-8 pb-24 space-y-8">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition cursor-pointer min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <div className="inline-block px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF3B42] text-[10px] font-bold tracking-widest uppercase">
          Support & Assistance
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Contact Us</h1>
        <p className="text-xs sm:text-sm text-white/60">
          Have an inquiry about a booking, payment, or theatre partnership? Our team is here to assist.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contact Info */}
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
            <Mail className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">Email Support</span>
              <p className="text-xs text-white/60">support@key2show.com</p>
              <p className="text-[11px] text-white/40">Response time: within 2 hours</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
            <Phone className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">Customer Helpline</span>
              <p className="text-xs text-white/60">+91 40 2345 6789</p>
              <p className="text-[11px] text-white/40">Mon-Sun: 9:00 AM - 11:30 PM IST</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#111] border border-white/10 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-[#E50914] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white">Hyderabad Headquarters</span>
              <p className="text-xs text-white/60">
                Key2Show Technologies, Road No. 36, Jubilee Hills, Hyderabad, Telangana 500033
              </p>
            </div>
          </div>
        </div>

        {/* Inquiry Form */}
        <div className="p-6 rounded-2xl bg-[#111] border border-white/10 space-y-4">
          {submitted ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">Message Dispatched!</h3>
              <p className="text-xs text-white/60">
                Thank you, {name}. A support specialist will respond to {email} shortly.
              </p>
              <button
                type="button"
                onClick={() => setSubmitted(false)}
                className="mt-3 px-4 py-2 rounded-lg bg-white/10 text-white text-xs font-bold cursor-pointer"
              >
                Send Another Note
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <h3 className="text-sm font-bold text-white">Send Us a Direct Message</h3>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Your Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-[#E50914] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="rahul@example.com"
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-[#E50914] focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Topic</label>
                <select
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-[#E50914] focus:outline-none"
                >
                  <option value="Ticketing Inquiry">Ticketing & Booking Issue</option>
                  <option value="Companion Access">Companion Access Support</option>
                  <option value="Payment & Refunds">Payment & Refund Status</option>
                  <option value="Theatre Partnership">Theatre / Event Listing</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-white/70">Message</label>
                <textarea
                  rows={3}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your inquiry or include your Booking ID..."
                  className="w-full px-3 py-2 rounded-xl bg-black border border-white/15 text-white text-xs focus:border-[#E50914] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#E50914] hover:bg-[#FF1822] text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer min-h-[44px]"
              >
                <Send className="w-4 h-4" />
                <span>Submit Inquiry</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export const HelpPage: React.FC<StaticPageProps> = ({ onBack }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  const handleBack = () => {
    if (onBack) onBack();
    else navigate('/');
  };

  const faqs = [
    {
      q: 'How does the "1 Booking = 1 QR Code" system work?',
      a: 'Whenever you purchase tickets (whether for 1, 4, or 10 people), Key2Show generates exactly ONE single master QR code for that entire booking. All attendees enter together using this single pass. Ushers scan it once at the gate to admit your entire party.',
    },
    {
      q: 'How does Companion Ticket Sharing work if I am not attending?',
      a: 'If you purchase tickets for family members (e.g., Mother, Sister) and cannot attend personally, add their mobile numbers in the "Companions" step during booking. When they log into Key2Show with that mobile number, the exact same verified booking and the single QR code will appear in their "Shared Bookings" tab.',
    },
    {
      q: 'Can I add or remove food & popcorn combos later?',
      a: 'Yes, food can be pre-ordered during the booking flow, or separately from the "Food & Snacks" section. Your pre-ordered food order is linked to your booking code for quick counter collection or seat delivery.',
    },
    {
      q: 'What happens if my payment fails or gets declined?',
      a: 'If a transaction is interrupted or declined by your bank, no funds are deducted. Your temporary seat lock is held for up to 10 minutes so you can retry with another payment method (UPI, Card, NetBanking).',
    },
    {
      q: 'How will I receive my confirmation email?',
      a: 'Once your payment is verified, Key2Show immediately dispatches a branded booking confirmation email via Resend to your registered email address with your booking code, seat numbers, and venue details.',
    },
  ];

  return (
    <div className="max-w-[800px] mx-auto px-4 lg:px-8 py-8 pb-24 space-y-8">
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-xs font-bold text-white/60 hover:text-white transition cursor-pointer min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="space-y-2">
        <div className="inline-block px-3 py-1 rounded-full bg-[#E50914]/15 border border-[#E50914]/30 text-[#FF3B42] text-[10px] font-bold tracking-widest uppercase">
          Knowledge Base
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-white/60">
          Everything you need to know about bookings, QR tokens, and companion access.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={faq.q}
              className="rounded-xl bg-[#111] border border-white/10 overflow-hidden transition"
            >
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-3 text-sm font-bold text-white hover:text-[#FF3B42] cursor-pointer min-h-[44px]"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/50 transition-transform ${
                    isOpen ? 'rotate-180 text-[#FF3B42]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 text-xs text-white/70 leading-relaxed border-t border-white/5 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

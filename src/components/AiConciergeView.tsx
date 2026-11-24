import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Globe,
  MapPin,
  ExternalLink,
  Zap,
  Brain,
  History,
  Trash2,
  LocateFixed,
} from 'lucide-react';
import { api } from '../utils/api';
import type { CityName } from '../data/events';

interface ChatTurn {
  role: 'user' | 'model';
  text: string;
  model?: string;
  webSources?: { title: string; uri: string }[];
  mapsSources?: { title: string; uri: string; snippet?: string }[];
}

interface AiConciergeViewProps {
  selectedCity: CityName;
  firebaseIdToken: string | null;
  onBackHome: () => void;
}

const MODES = [
  { id: 'fast', label: 'Fast Q&A · 3.1 Flash Lite', icon: Zap },
  { id: 'general', label: 'Concierge · 4 Hydrogen', icon: Sparkles },
  { id: 'high', label: 'Smart Planner · High', icon: Brain },
  { id: 'deep', label: 'Deep Reasoner · XHigh', icon: Brain },
  { id: 'search', label: 'Web Buzz · Search', icon: Globe },
  { id: 'maps', label: 'Venues · Maps Grounding', icon: MapPin },
] as const;

const ROLE_PRESETS = [
  { id: 'movie-concierge', label: 'Movie Concierge' },
  { id: 'group-planner', label: 'Family & Group Planner' },
  { id: 'food-offers', label: 'Food & Offers Guide' },
] as const;

const QUICK_PROMPTS = [
  'Best IMAX or Dolby Atmos family movies tonight in Hyderabad?',
  'Plan a 4-seat evening outing at PVR Next Galleria with snacks under ₹2,500',
  'Latest audience buzz and box office reception for Pushpa 2 and Kalki 2898-AD',
  'Top dinner & metro spots near AMB Cinemas Gachibowli',
];

export const AiConciergeView: React.FC<AiConciergeViewProps> = ({
  selectedCity,
  firebaseIdToken,
  onBackHome,
}) => {
  const [mode, setMode] = useState<string>('general');
  const [rolePreset, setRolePreset] = useState<string>('movie-concierge');
  const [input, setInput] = useState('');
  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      role: 'model',
      text: `Hi! I'm your Key2Show AI Cinema & Events Concierge for ${selectedCity}. Ask me about movie recommendations, family seating plans, food combos, live reviews via Google Search, or nearby transit via Google Maps.`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [savedSessions, setSavedSessions] = useState<{ id: number; title: string; mode: string; updatedAt: string }[]>([]);
  const [latLng, setLatLng] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

  useEffect(() => {
    if (!firebaseIdToken) {
      setSavedSessions([]);
      return;
    }
    api
      .cloudGetMe(firebaseIdToken)
      .then((res) => setSavedSessions(res.sessions ?? []))
      .catch(() => {});
  }, [firebaseIdToken]);

  const handleUseLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatLng({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setError('');
      },
      () => setError('Location permission denied — continuing with city-level context.')
    );
  };

  const sendMessage = async (textOverride?: string) => {
    const clean = (textOverride ?? input).trim();
    if (!clean || loading) return;
    setError('');
    if (!textOverride) setInput('');

    const nextHistory = turns.map((t) => ({ role: t.role, text: t.text }));
    setTurns((prev) => [...prev, { role: 'user', text: clean }]);
    setLoading(true);

    try {
      const res = await api.aiChat(
        {
          message: clean,
          history: nextHistory,
          mode,
          rolePreset,
          city: selectedCity,
          latLng,
          sessionId,
        },
        firebaseIdToken
      );

      setTurns((prev) => [
        ...prev,
        {
          role: 'model',
          text: res.text,
          model: res.model,
          webSources: res.webSources,
          mapsSources: res.mapsSources,
        },
      ]);
      if (res.sessionId) {
        setSessionId(res.sessionId);
        if (firebaseIdToken) {
          api
            .cloudGetMe(firebaseIdToken)
            .then((d) => setSavedSessions(d.sessions ?? []))
            .catch(() => {});
        }
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const loadSession = async (id: number) => {
    if (!firebaseIdToken) return;
    try {
      const res = await api.cloudGetChatSession(firebaseIdToken, id);
      setSessionId(res.session.id);
      setMode(res.session.mode || 'general');
      setTurns(
        res.session.messages.map((m) => {
          let webSources: { title: string; uri: string }[] = [];
          let mapsSources: { title: string; uri: string; snippet?: string }[] = [];
          if (m.sourcesJson) {
            try {
              const parsed = JSON.parse(m.sourcesJson);
              webSources = parsed.webSources ?? [];
              mapsSources = parsed.mapsSources ?? [];
            } catch {
              // ignore
            }
          }
          return {
            role: m.role,
            text: m.content,
            webSources,
            mapsSources,
          };
        })
      );
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-4 lg:px-6 py-6 sm:py-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#FF3B43] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Key2Show AI Concierge</span>
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mt-0.5">
            Smart Movie, Event & Theatre Assistant
          </h1>
        </div>
        <button
          type="button"
          onClick={onBackHome}
          className="px-4 py-2 rounded-full bg-[#15151a] border border-white/15 text-xs font-bold text-white hover:border-[#FF1822] cursor-pointer min-h-[40px]"
        >
          Back to Storefront
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Controls + History Sidebar */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl bg-[#101015] border border-white/10 p-4 space-y-3">
            <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">AI Mode</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5">
              {MODES.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold text-left transition-colors cursor-pointer min-h-[40px] ${
                    mode === id
                      ? 'bg-[#251013] border-[#FF1822] text-white'
                      : 'bg-[#16161d] border-white/10 text-white/75 hover:border-white/25'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 text-[#FF3038] shrink-0" />
                  <span>{label}</span>
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-white/10">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/55 mb-2">Role Preset</p>
              <div className="flex flex-wrap gap-1.5">
                {ROLE_PRESETS.map((rp) => (
                  <button
                    key={rp.id}
                    type="button"
                    onClick={() => setRolePreset(rp.id)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      rolePreset === rp.id
                        ? 'bg-[#E50914] border-[#FF1822] text-white'
                        : 'bg-[#16161d] border-white/10 text-white/70'
                    }`}
                  >
                    {rp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={handleUseLocation}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#16161d] border border-white/10 hover:border-[#FF1822] text-xs font-semibold text-white/85 cursor-pointer"
              >
                <LocateFixed className="w-3.5 h-3.5 text-[#FF3038]" />
                <span>{latLng ? 'GPS Coordinates Attached' : 'Attach Precise Location'}</span>
              </button>
            </div>
          </div>

          {firebaseIdToken && savedSessions.length > 0 && (
            <div className="rounded-2xl bg-[#101015] border border-white/10 p-4 space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/55 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[#FF252E]" />
                <span>Cloud SQL Saved Chats</span>
              </p>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {savedSessions.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center justify-between gap-2 p-2.5 rounded-xl border text-xs ${
                      sessionId === s.id
                        ? 'bg-[#251013] border-[#FF1822]'
                        : 'bg-[#15151c] border-white/10'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => loadSession(s.id)}
                      className="text-left flex-1 truncate font-semibold text-white/90 hover:text-white cursor-pointer"
                    >
                      {s.title}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete saved chat"
                      onClick={async () => {
                        await fetch(`/api/cloud/chats/${s.id}`, {
                          method: 'DELETE',
                          headers: { Authorization: `Bearer ${firebaseIdToken}` },
                        });
                        setSavedSessions((prev) => prev.filter((x) => x.id !== s.id));
                      }}
                      className="p-1 text-white/45 hover:text-[#FF3B43] cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Main Chat Surface */}
        <section className="lg:col-span-8 rounded-2xl bg-[#101015] border border-white/10 flex flex-col min-h-[520px]">
          <div className="p-4 border-b border-white/10 flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((qp) => (
              <button
                key={qp}
                type="button"
                onClick={() => sendMessage(qp)}
                className="px-3 py-1.5 rounded-lg bg-[#16161e] border border-white/10 hover:border-[#FF1822]/60 text-[11px] text-white/80 text-left cursor-pointer"
              >
                {qp}
              </button>
            ))}
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto max-h-[500px]">
            {turns.map((t, idx) => (
              <div
                key={idx}
                className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    t.role === 'user'
                      ? 'bg-[#E50914] text-white'
                      : 'bg-[#171720] border border-white/10 text-white/90'
                  }`}
                >
                  <p className="whitespace-pre-line">{t.text}</p>

                  {t.webSources && t.webSources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      {t.webSources.map((s, si) => (
                        <a
                          key={si}
                          href={s.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-[11px] text-white/85 hover:border-[#FF1822]"
                        >
                          <Globe className="w-3 h-3 text-[#FF3B43]" />
                          <span>{s.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}

                  {t.mapsSources && t.mapsSources.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-white/10 flex flex-wrap gap-1.5">
                      {t.mapsSources.map((m, mi) => (
                        <a
                          key={mi}
                          href={m.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/40 border border-white/15 text-[11px] text-white/85 hover:border-[#FF1822]"
                        >
                          <MapPin className="w-3 h-3 text-emerald-400" />
                          <span>{m.title}</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="text-xs text-white/60 animate-pulse px-2">
                Thinking with Key2Show AI Concierge...
              </div>
            )}
          </div>

          {error && (
            <div className="mx-4 mb-2 rounded-xl bg-[#2a1014] border border-[#FF242C]/50 px-3.5 py-2 text-xs text-[#FF8A8F]">
              {error}
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendMessage();
            }}
            className="p-3.5 border-t border-white/10 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask about movies, food combos, or theatres in ${selectedCity}...`}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#16161d] border border-white/15 text-sm text-white focus:border-[#FF1822] focus:outline-none min-h-[44px]"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#D90913] to-[#FF1F28] text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
            >
              <span>Send</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

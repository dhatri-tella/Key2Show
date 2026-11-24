export type AiChatModeId = 'fast' | 'general' | 'planner' | 'reasoner' | 'search' | 'maps';

export type AiRolePresetId = 'concierge' | 'critic' | 'planner' | 'local-guide';

export interface AiModeDefinition {
  id: AiChatModeId;
  label: string;
  shortLabel: string;
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  thinkingLevel?: 'HIGH' | 'XHIGH';
  tool?: 'googleSearch' | 'googleMaps';
  description: string;
}

export interface AiRolePreset {
  id: AiRolePresetId;
  label: string;
  systemInstruction: string;
}

export interface WebGroundingSource {
  uri: string;
  title: string;
}

export interface MapsGroundingSource {
  uri: string;
  title: string;
  reviewSnippets: string[];
}

export const AI_CHAT_MODES: Record<AiChatModeId, AiModeDefinition> = {
  fast: {
    id: 'fast',
    label: 'Quick Q&A · 3.1 Flash Lite',
    shortLabel: 'Fast Q&A',
    model: 'gemini-3.1-flash-lite',
    description: 'Low-latency answers for timings, snacks, offers, and ticket policies.',
  },
  general: {
    id: 'general',
    label: 'Concierge · 4 Hydrogen',
    shortLabel: 'General',
    model: 'gemini-4-hydrogen',
    description: 'Balanced cinema concierge for movie picks, formats, and group passes.',
  },
  planner: {
    id: 'planner',
    label: 'Itinerary Planner · 4 Hydrogen (High)',
    shortLabel: 'Planner',
    model: 'gemini-4-hydrogen',
    thinkingLevel: 'HIGH',
    description: 'Multi-step evening planner coordinating showtimes, dinner, and companions.',
  },
  reasoner: {
    id: 'reasoner',
    label: 'Deep Reasoner · 4 Hydrogen (XHigh)',
    shortLabel: 'Deep Reasoning',
    model: 'gemini-4-hydrogen',
    thinkingLevel: 'XHIGH',
    description: 'Maximum reasoning depth for budget splits, seating layouts, and logistics.',
  },
  search: {
    id: 'search',
    label: 'Web Buzz · Search Grounding',
    shortLabel: 'Search Grounding',
    model: 'gemini-4-hydrogen',
    tool: 'googleSearch',
    description: 'Live web-grounded movie reviews, box-office updates, and tour news.',
  },
  maps: {
    id: 'maps',
    label: 'Nearby Places · Maps Grounding',
    shortLabel: 'Maps Grounding',
    model: 'gemini-4-hydrogen',
    tool: 'googleMaps',
    description: 'Place-grounded restaurant, parking, and metro tips around Key2Show venues.',
  },
};

export const AI_ROLE_PRESETS: Record<AiRolePresetId, AiRolePreset> = {
  concierge: {
    id: 'concierge',
    label: 'Ticket Concierge',
    systemInstruction:
      'You are the Key2Show Cinema & Live Events Concierge. Help users pick movies, theatres, seat categories (Recliner/VIP/Prime/Standard), companion-shared passes, and F&B combos concisely in Markdown.',
  },
  critic: {
    id: 'critic',
    label: 'Film & Event Curator',
    systemInstruction:
      'You are a knowledgeable Indian & global film and live-entertainment curator for Key2Show. Highlight cinematography, audio formats (IMAX, Dolby Atmos, 4DX), audience mood, and who will enjoy the show.',
  },
  planner: {
    id: 'planner',
    label: 'Group Outing Planner',
    systemInstruction:
      'You are an expert group outing and family night planner on Key2Show. Factor in arrival buffers, parking/metro access, meal timing, budget per person in INR, and Companion Share QR passes.',
  },
  'local-guide': {
    id: 'local-guide',
    label: 'City Venue Guide',
    systemInstruction:
      'You are a local city venue guide for Key2Show across Hyderabad, Bengaluru, Mumbai, Delhi NCR, and Chennai. Give practical transit, nearby dining, and venue accessibility guidance.',
  },
};

export function resolveAiMode(mode?: string): AiModeDefinition {
  if (mode && mode in AI_CHAT_MODES) {
    return AI_CHAT_MODES[mode as AiChatModeId];
  }
  return AI_CHAT_MODES.general;
}

export function resolveRolePreset(preset?: string): AiRolePreset {
  if (preset && preset in AI_ROLE_PRESETS) {
    return AI_ROLE_PRESETS[preset as AiRolePresetId];
  }
  return AI_ROLE_PRESETS.concierge;
}

export function extractWebSources(groundingChunks: unknown): WebGroundingSource[] {
  if (!Array.isArray(groundingChunks)) return [];
  const seen = new Set<string>();
  const results: WebGroundingSource[] = [];

  for (const chunk of groundingChunks) {
    if (!chunk || typeof chunk !== 'object') continue;
    const web = (chunk as { web?: { uri?: unknown; title?: unknown } }).web;
    if (!web || typeof web.uri !== 'string' || !web.uri.trim()) continue;
    const uri = web.uri.trim();
    if (seen.has(uri)) continue;
    seen.add(uri);
    results.push({
      uri,
      title: typeof web.title === 'string' && web.title.trim() ? web.title.trim() : uri,
    });
  }
  return results;
}

export function extractMapsSources(groundingChunks: unknown): MapsGroundingSource[] {
  if (!Array.isArray(groundingChunks)) return [];
  const seen = new Set<string>();
  const results: MapsGroundingSource[] = [];

  for (const chunk of groundingChunks) {
    if (!chunk || typeof chunk !== 'object') continue;
    const maps = (chunk as {
      maps?: {
        uri?: unknown;
        title?: unknown;
        placeAnswerSources?: {
          reviewSnippets?: Array<{ content?: unknown; text?: unknown; reviewText?: unknown }>;
        };
      };
    }).maps;
    if (!maps || typeof maps.uri !== 'string' || !maps.uri.trim()) continue;
    const uri = maps.uri.trim();
    if (seen.has(uri)) continue;
    seen.add(uri);

    const snippetsRaw = maps.placeAnswerSources?.reviewSnippets;
    const reviewSnippets: string[] = [];
    if (Array.isArray(snippetsRaw)) {
      for (const snip of snippetsRaw) {
        if (!snip || typeof snip !== 'object') continue;
        const text =
          typeof snip.content === 'string'
            ? snip.content
            : typeof snip.text === 'string'
              ? snip.text
              : typeof snip.reviewText === 'string'
                ? snip.reviewText
                : '';
        if (text.trim()) {
          reviewSnippets.push(text.trim());
        }
      }
    }

    results.push({
      uri,
      title: typeof maps.title === 'string' && maps.title.trim() ? maps.title.trim() : 'View on Google Maps',
      reviewSnippets,
    });
  }
  return results;
}

export function isMapsQuotaErrorPayload(
  status: number,
  payload?: { status?: string; error?: { status?: string } } | null
): boolean {
  if (status === 429) return true;
  if (payload?.status === 'OVER_QUERY_LIMIT') return true;
  if (payload?.error?.status === 'RESOURCE_EXHAUSTED') return true;
  return false;
}

export const CITY_COORDINATES: Record<string, { lat: number; lng: number }> = {
  Hyderabad: { lat: 17.4239, lng: 78.4738 },
  Bengaluru: { lat: 12.9716, lng: 77.5946 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  'Delhi NCR': { lat: 28.6139, lng: 77.209 },
  Chennai: { lat: 13.0827, lng: 80.2707 },
};

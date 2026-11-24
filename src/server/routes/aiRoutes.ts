import { Router } from 'express';
import { getGeminiClient, mapThinkingLevel } from '../gemini.ts';
import { optionalFirebaseAuth, type FirebaseAuthRequest } from '../../middleware/auth.ts';
import { appendChatTurn } from '../../db/users.ts';
import {
  extractMapsSources,
  extractWebSources,
  resolveAiMode,
  resolveRolePreset,
} from '../../utils/aiHelpers.ts';

export const aiRoutes = Router();

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes('GEMINI_API_KEY is not configured')) {
    return { status: 503, message: raw };
  }
  if (raw.includes('429') || raw.includes('RESOURCE_EXHAUSTED')) {
    return {
      status: 429,
      message: 'Gemini API rate limit reached. Please wait a moment and try again.',
    };
  }
  if (raw.includes('403') || raw.includes('PERMISSION_DENIED') || raw.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'Gemini API key permission denied or invalid. Please check Settings > Secrets.',
    };
  }
  return { status: 500, message: raw || 'Gemini request failed.' };
}

// Multi-turn Gemini Chat with model routing, role presets, optional grounding, and Cloud SQL persistence
aiRoutes.post('/chat', optionalFirebaseAuth, async (req: FirebaseAuthRequest, res) => {
  try {
    const {
      message,
      history,
      mode,
      rolePreset,
      city,
      latLng,
      sessionId,
      contextSummary,
    } = req.body ?? {};

    const cleanMessage = String(message ?? '').trim();
    if (!cleanMessage) {
      res.status(400).json({ error: 'Message text is required.' });
      return;
    }

    const modeDef = resolveAiMode(mode);
    const preset = resolveRolePreset(rolePreset);
    const ai = getGeminiClient();

    const formattedHistory = Array.isArray(history)
      ? history
          .filter(
            (turn) =>
              turn &&
              (turn.role === 'user' || turn.role === 'model') &&
              typeof turn.text === 'string' &&
              turn.text.trim().length > 0
          )
          .slice(-16)
          .map((turn) => ({
            role: turn.role as 'user' | 'model',
            parts: [{ text: String(turn.text) }],
          }))
      : [];

    const cityContext = city ? `Active user city on Key2Show: ${String(city)}.` : '';
    const extraContext = contextSummary ? `Platform context: ${String(contextSummary)}` : '';
    const systemInstruction = [preset.systemInstruction, cityContext, extraContext]
      .filter(Boolean)
      .join('\n');

    const config: Record<string, unknown> = {
      systemInstruction,
    };

    const thinkingLevel = mapThinkingLevel(modeDef.thinkingLevel);
    if (thinkingLevel && modeDef.model === 'gemini-4-hydrogen') {
      config.thinkingConfig = { thinkingLevel };
    }

    // Never combine googleMaps and googleSearch in the same request
    if (modeDef.tool === 'googleSearch') {
      config.tools = [{ googleSearch: {} }];
    } else if (modeDef.tool === 'googleMaps') {
      config.tools = [{ googleMaps: {} }];
      if (
        latLng &&
        typeof latLng.latitude === 'number' &&
        typeof latLng.longitude === 'number'
      ) {
        config.toolConfig = {
          retrievalConfig: {
            latLng: {
              latitude: latLng.latitude,
              longitude: latLng.longitude,
            },
          },
        };
      }
    }

    const chat = ai.chats.create({
      model: modeDef.model,
      history: formattedHistory,
      config,
    });

    const response = await chat.sendMessage({ message: cleanMessage });
    const text = response.text ?? '';
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const webSources = modeDef.tool === 'googleSearch' ? extractWebSources(chunks) : [];
    const mapsSources = modeDef.tool === 'googleMaps' ? extractMapsSources(chunks) : [];

    let savedSessionId: number | null = typeof sessionId === 'number' ? sessionId : null;
    if (req.firebaseUser) {
      try {
        savedSessionId = await appendChatTurn({
          uid: req.firebaseUser.uid,
          email: req.firebaseUser.email || '',
          displayName:
            typeof req.firebaseUser.name === 'string' ? req.firebaseUser.name : undefined,
          sessionId: savedSessionId ?? undefined,
          title: cleanMessage,
          mode: modeDef.id,
          model: modeDef.model,
          userMessage: cleanMessage,
          assistantMessage: text,
          sourcesJson: JSON.stringify({ webSources, mapsSources }),
        });
      } catch (dbErr) {
        console.error('Non-fatal Cloud SQL chat save error:', dbErr);
      }
    }

    res.json({
      text,
      model: modeDef.model,
      mode: modeDef.id,
      webSources,
      mapsSources,
      sessionId: savedSessionId,
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// Dedicated Google Search Grounding endpoint for live movie/event buzz & reviews
aiRoutes.post('/search-grounding', async (req, res) => {
  try {
    const { query, title, kind, city } = req.body ?? {};
    const prompt =
      String(query ?? '').trim() ||
      `Provide a crisp, helpful overview of latest audience reception, box office or tour highlights, and key info for "${String(title ?? 'cinema')}" (${String(kind ?? 'movie')}) in ${String(city ?? 'India')}. Keep it concise with bullet points.`;

    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const webSources = extractWebSources(chunks);

    res.json({
      text: response.text ?? '',
      model: 'gemini-4-hydrogen',
      webSources,
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

// Dedicated Google Maps Grounding endpoint for cinema dining, transit, and parking
aiRoutes.post('/maps-grounding', async (req, res) => {
  try {
    const { query, venueName, city, latLng } = req.body ?? {};
    const prompt =
      String(query ?? '').trim() ||
      `Suggest top nearby restaurants, coffee spots, parking, and metro/transit access around ${String(venueName ?? 'cinema multiplex')} in ${String(city ?? 'Hyderabad')}.`;

    const ai = getGeminiClient();
    const config: Record<string, unknown> = {
      tools: [{ googleMaps: {} }],
    };

    if (
      latLng &&
      typeof latLng.latitude === 'number' &&
      typeof latLng.longitude === 'number'
    ) {
      config.toolConfig = {
        retrievalConfig: {
          latLng: {
            latitude: latLng.latitude,
            longitude: latLng.longitude,
          },
        },
      };
    }

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config,
    });

    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    const mapsSources = extractMapsSources(chunks);

    res.json({
      text: response.text ?? '',
      model: 'gemini-4-hydrogen',
      mapsSources,
    });
  } catch (err) {
    const formatted = formatGeminiError(err);
    res.status(formatted.status).json({ error: formatted.message });
  }
});

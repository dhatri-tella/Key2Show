import { GoogleGenAI, ThinkingLevel } from '@google/genai';

export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add a Gemini API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export function mapThinkingLevel(level?: 'HIGH' | 'XHIGH'): ThinkingLevel | undefined {
  if (level === 'HIGH') return ThinkingLevel.HIGH;
  if (level === 'XHIGH') return ThinkingLevel.XHIGH;
  return undefined;
}

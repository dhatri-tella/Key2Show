import { db } from '../db.ts';

export interface SyncedMoviePayload {
  id: string;
  externalId: string;
  sourceMode: 'LIVE' | 'DEMO';
  title: string;
  subtitle?: string;
  poster: string;
  banner: string;
  trailerUrl: string;
  genre: string[];
  language: string;
  duration: string;
  rating: number;
  votes: string;
  certification: string;
  formats: string[];
  releaseDate: string;
  endDate: string;
  releaseYear: number;
  basePrice: number;
  featured: boolean;
  synopsis: string;
  cast: { actor: string; role: string }[];
  director: string;
}

export interface MovieFetchResult {
  mode: 'LIVE' | 'DEMO';
  apiAvailable: boolean;
  errorBanner: string | null;
  movies: SyncedMoviePayload[];
  fetchedAt: string;
}

export interface MovieDataProvider {
  fetchCurrentAndUpcomingMovies(): Promise<MovieFetchResult>;
}

const TMDB_GENRE_MAP: Record<number, string> = {
  28: 'Action',
  12: 'Adventure',
  16: 'Animation',
  35: 'Comedy',
  80: 'Crime',
  18: 'Drama',
  14: 'Fantasy',
  27: 'Horror',
  9648: 'Mystery',
  10749: 'Romance',
  878: 'Sci-Fi',
  53: 'Thriller',
};

const LANG_LABEL: Record<string, string> = {
  te: 'Telugu',
  hi: 'Hindi',
  ta: 'Tamil',
  en: 'English',
  ml: 'Malayalam',
  kn: 'Kannada',
};

function slugifyId(title: string, tmdbId: number): string {
  const clean = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);
  return `${clean || 'movie'}-${tmdbId}`;
}

function addDaysIso(isoDate: string, days: number): string {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) {
    return new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);
  }
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export class TmdbMovieDataProvider implements MovieDataProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async fetchCurrentAndUpcomingMovies(): Promise<MovieFetchResult> {
    const nowIso = new Date().toISOString();
    try {
      const [nowPlayingRes, upcomingRes] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/movie/now_playing?api_key=${encodeURIComponent(this.apiKey)}&region=IN&page=1`
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/upcoming?api_key=${encodeURIComponent(this.apiKey)}&region=IN&page=1`
        ),
      ]);

      if (!nowPlayingRes.ok) {
        throw new Error(`TMDB returned HTTP ${nowPlayingRes.status}`);
      }

      const nowJson = (await nowPlayingRes.json()) as { results?: Record<string, unknown>[] };
      const upJson = upcomingRes.ok
        ? ((await upcomingRes.json()) as { results?: Record<string, unknown>[] })
        : { results: [] };

      const combined = [...(nowJson.results ?? []), ...(upJson.results ?? [])];
      const seenIds = new Set<number>();
      const normalized: SyncedMoviePayload[] = [];

      for (const raw of combined) {
        const tmdbId = Number(raw.id);
        if (!tmdbId || seenIds.has(tmdbId)) continue;
        seenIds.add(tmdbId);

        const title = String(raw.title ?? raw.original_title ?? '').trim();
        if (!title) continue;

        const posterPath = raw.poster_path ? `https://image.tmdb.org/t/p/w500${raw.poster_path}` : '/assets/images/movie-pushpa.jpg';
        const backdropPath = raw.backdrop_path ? `https://image.tmdb.org/t/p/w1280${raw.backdrop_path}` : '/assets/images/hero-cast.jpg';
        const genreIds = Array.isArray(raw.genre_ids) ? (raw.genre_ids as number[]) : [];
        const genres = genreIds.map((g) => TMDB_GENRE_MAP[g]).filter(Boolean);
        const relDate = String(raw.release_date || nowIso.slice(0, 10));
        const year = Number(relDate.slice(0, 4)) || new Date().getFullYear();
        const langCode = String(raw.original_language || 'en');
        const voteAvg = Number(raw.vote_average ?? 7.8);
        const voteCount = Number(raw.vote_count ?? 1200);
        let trailerUrl = '';
        try {
          const videoRes = await fetch(
            `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${encodeURIComponent(this.apiKey)}&language=en-US`
          );
          if (videoRes.ok) {
            const videoJson = (await videoRes.json()) as { results?: Record<string, unknown>[] };
            const videos = (videoJson.results ?? []).filter(
              (video) => String(video.site) === 'YouTube' && String(video.key).trim()
            );
            const preferred =
              videos.find((video) => String(video.type) === 'Trailer' && !String(video.name).toLowerCase().includes('teaser')) ??
              videos.find((video) => String(video.type) === 'Trailer') ??
              videos.find((video) => String(video.type) === 'Teaser');
            if (preferred) {
              trailerUrl = `https://www.youtube.com/embed/${encodeURIComponent(String(preferred.key))}`;
            }
          }
        } catch {
          trailerUrl = '';
        }

        normalized.push({
          id: slugifyId(title, tmdbId),
          externalId: `tmdb:${tmdbId}`,
          sourceMode: 'LIVE',
          title,
          poster: posterPath,
          banner: backdropPath,
          trailerUrl,
          genre: genres.length > 0 ? genres.slice(0, 3) : ['Drama'],
          language: LANG_LABEL[langCode] ?? 'Hindi / English',
          duration: '2h 25m',
          rating: Number(Math.max(6.5, Math.min(9.8, voteAvg || 8.0)).toFixed(1)),
          votes: voteCount >= 1000 ? `${Math.round(voteCount / 1000)}K` : `${Math.max(12, voteCount)}K`,
          certification: Boolean(raw.adult) ? 'A' : 'UA',
          formats: ['2D', 'IMAX 2D', 'Dolby Atmos'],
          releaseDate: relDate,
          endDate: addDaysIso(nowIso.slice(0, 10), 45),
          releaseYear: year,
          basePrice: 280,
          featured: normalized.length < 6,
          synopsis: String(raw.overview || 'Experience this theatrical release on the big screen with Dolby Atmos and IMAX formats.'),
          cast: [{ actor: 'Featured Ensemble', role: 'Lead Cast' }],
          director: 'Theatrical Release',
        });

        if (normalized.length >= 10) break;
      }

      return {
        mode: 'LIVE',
        apiAvailable: true,
        errorBanner: null,
        movies: normalized,
        fetchedAt: nowIso,
      };
    } catch {
      return {
        mode: 'LIVE',
        apiAvailable: false,
        errorBanner: 'Live movie information is temporarily unavailable.',
        movies: [],
        fetchedAt: nowIso,
      };
    }
  }
}

export class DemoFallbackMovieDataProvider implements MovieDataProvider {
  async fetchCurrentAndUpcomingMovies(): Promise<MovieFetchResult> {
    return {
      mode: 'DEMO',
      apiAvailable: true,
      errorBanner: null,
      movies: [],
      fetchedAt: new Date().toISOString(),
    };
  }
}

export function createMovieDataProvider(): MovieDataProvider {
  const tmdbKey = process.env.TMDB_API_KEY?.trim();
  if (tmdbKey && tmdbKey.length > 8 && !tmdbKey.startsWith('MY_')) {
    return new TmdbMovieDataProvider(tmdbKey);
  }
  return new DemoFallbackMovieDataProvider();
}

// Separated Domain Providers wrapping local SQLite operations
export const TheatreProvider = {
  listAll() {
    return db.prepare('SELECT * FROM theatres ORDER BY featured DESC, rating DESC').all();
  },
  getById(id: string) {
    return db.prepare('SELECT * FROM theatres WHERE id = ?').get(id);
  },
};

export const ShowtimeProvider = {
  listActive() {
    return db
      .prepare(`
        SELECT s.*, sc.name AS screen_name, sc.sound_system, sc.projection
        FROM shows s
        JOIN screens sc ON sc.id = s.screen_id
        WHERE s.status = 'ACTIVE'
      `)
      .all();
  },
};

export const FoodProvider = {
  listAvailable() {
    return db.prepare('SELECT * FROM food_items WHERE available = 1').all();
  },
};

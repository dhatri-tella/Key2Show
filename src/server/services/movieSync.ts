import crypto from 'node:crypto';
import { db } from '../db.ts';
import { createMovieDataProvider } from './providers.ts';
import { broadcastGlobal } from './realtimeHub.ts';

export interface MovieSyncStatus {
  mode: 'LIVE' | 'DEMO';
  lastSyncedAt: string;
  apiAvailable: boolean;
  errorBanner: string | null;
  movieCount: number;
  syncedNewCount: number;
}

const SYNC_CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL cache
const SCHEDULER_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours

let cachedStatus: MovieSyncStatus | null = null;
let lastAttemptMs = 0;
let schedulerStarted = false;

function ensureDefaultShowsForMovie(movieId: string, basePrice: number, formats: string[]): void {
  const existingShow = db
    .prepare("SELECT id FROM shows WHERE movie_id = ? AND status = 'ACTIVE' LIMIT 1")
    .get(movieId);
  if (existingShow) return;

  const theatres = db
    .prepare('SELECT id FROM theatres WHERE featured = 1 LIMIT 3')
    .all() as { id: string }[];
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const slots = [
    { time: '02:30 PM', slot: 'Afternoon' },
    { time: '07:15 PM', slot: 'Evening' },
  ];

  const insertShow = db.prepare(`
    INSERT OR IGNORE INTO shows (id, movie_id, theatre_id, screen_id, show_date, show_time, time_slot, format, base_price, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `);
  const selectSeats = db.prepare('SELECT seat_code, category, price_delta, is_blocked FROM seats WHERE screen_id = ?');
  const insertShowSeat = db.prepare(`
    INSERT OR IGNORE INTO show_seats (id, show_id, seat_code, category, price, status, locked_by_user_id, lock_expires_at, booking_id)
    VALUES (?, ?, ?, ?, ?, ?, NULL, NULL, NULL)
  `);

  for (const t of theatres) {
    const screenId = `${t.id}-scr-1`;
    const seats = selectSeats.all(screenId) as {
      seat_code: string;
      category: string;
      price_delta: number;
      is_blocked: number;
    }[];
    if (seats.length === 0) continue;

    for (const date of [today, tomorrow]) {
      const slot = slots[date === today ? 1 : 0];
      const showId = `show-${movieId}-${t.id}-${date}-${slot.slot.toLowerCase()}`;
      insertShow.run(
        showId,
        movieId,
        t.id,
        screenId,
        date,
        slot.time,
        slot.slot,
        formats[0] ?? '2D',
        basePrice
      );
      for (const s of seats) {
        insertShowSeat.run(
          `${showId}-${s.seat_code}`,
          showId,
          s.seat_code,
          s.category,
          basePrice + s.price_delta,
          s.is_blocked ? 'UNAVAILABLE' : 'AVAILABLE'
        );
      }
    }
  }
}

export async function syncMoviesWithDatabase(force = false): Promise<MovieSyncStatus> {
  const nowMs = Date.now();
  if (!force && cachedStatus && nowMs - lastAttemptMs < SYNC_CACHE_TTL_MS) {
    return cachedStatus;
  }
  lastAttemptMs = nowMs;

  const provider = createMovieDataProvider();
  const result = await provider.fetchCurrentAndUpcomingMovies();
  const nowIso = new Date().toISOString();
  const todayIso = nowIso.slice(0, 10);
  let syncedNewCount = 0;

  if (result.mode === 'LIVE' && result.apiAvailable && result.movies.length > 0) {
    const findByExt = db.prepare('SELECT id FROM movies WHERE external_id = ? OR id = ?');
    const insertMovie = db.prepare(`
      INSERT INTO movies (
        id, external_id, source_mode, title, subtitle, poster, banner, trailer_url, genre_json,
        language, duration, rating, votes, certification, formats_json, release_date, end_date,
        release_year, base_price, featured, published, synopsis, created_at, updated_at, last_synced_at
      ) VALUES (?, ?, 'LIVE', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?)
    `);
    const updateMovie = db.prepare(`
      UPDATE movies
      SET source_mode = 'LIVE',
          title = ?,
          poster = ?,
          banner = ?,
          trailer_url = ?,
          genre_json = ?,
          rating = ?,
          votes = ?,
          synopsis = ?,
          end_date = ?,
          published = 1,
          updated_at = ?,
          last_synced_at = ?
      WHERE id = ?
    `);

    for (const m of result.movies) {
      const existing = findByExt.get(m.externalId, m.id) as { id: string } | undefined;
      if (!existing) {
        insertMovie.run(
          m.id,
          m.externalId,
          m.title,
          m.subtitle ?? '',
          m.poster,
          m.banner,
          m.trailerUrl,
          JSON.stringify(m.genre),
          m.language,
          m.duration,
          m.rating,
          m.votes,
          m.certification,
          JSON.stringify(m.formats),
          m.releaseDate,
          m.endDate,
          m.releaseYear,
          m.basePrice,
          m.featured ? 1 : 0,
          m.synopsis,
          nowIso,
          nowIso,
          nowIso
        );
        m.cast.forEach((c, idx) => {
          db.prepare('INSERT OR IGNORE INTO movie_cast (id, movie_id, actor_name, role_name) VALUES (?, ?, ?, ?)')
            .run(`${m.id}-cast-${idx}-${crypto.randomUUID().slice(0, 4)}`, m.id, c.actor, c.role);
        });
        db.prepare('INSERT OR IGNORE INTO movie_crew (id, movie_id, member_name, department) VALUES (?, ?, ?, ?)')
          .run(`${m.id}-crew-dir`, m.id, m.director, 'Director');
        ensureDefaultShowsForMovie(m.id, m.basePrice, m.formats);
        syncedNewCount += 1;
      } else {
        updateMovie.run(
          m.title,
          m.poster,
          m.banner,
          m.trailerUrl,
          JSON.stringify(m.genre),
          m.rating,
          m.votes,
          m.synopsis,
          m.endDate,
          nowIso,
          nowIso,
          existing.id
        );
        ensureDefaultShowsForMovie(existing.id, m.basePrice, m.formats);
      }
    }

    // Automatically unpublish expired external titles whose theatrical run ended
    db.prepare(`
      UPDATE movies
      SET published = 0, updated_at = ?
      WHERE source_mode = 'LIVE' AND end_date IS NOT NULL AND end_date < ?
    `).run(nowIso, todayIso);
  } else if (result.mode === 'DEMO') {
    db.prepare(`
      UPDATE movies
      SET last_synced_at = COALESCE(last_synced_at, ?), updated_at = COALESCE(updated_at, ?)
    `).run(nowIso, nowIso);
  }

  const totalCountRow = db.prepare('SELECT COUNT(*) AS c FROM movies WHERE published = 1').get() as { c: number };
  cachedStatus = {
    mode: result.mode,
    lastSyncedAt: nowIso,
    apiAvailable: result.apiAvailable,
    errorBanner: result.errorBanner,
    movieCount: totalCountRow.c,
    syncedNewCount,
  };

  db.prepare("INSERT OR REPLACE INTO platform_settings (key, value) VALUES ('last_movie_sync_json', ?)")
    .run(JSON.stringify(cachedStatus));

  if (syncedNewCount > 0 || force) {
    broadcastGlobal('movies:synced', cachedStatus);
  }

  return cachedStatus;
}

export function getSyncStatus(): MovieSyncStatus {
  if (cachedStatus) return cachedStatus;
  const saved = db
    .prepare("SELECT value FROM platform_settings WHERE key = 'last_movie_sync_json'")
    .get() as { value: string } | undefined;
  const totalCountRow = db.prepare('SELECT COUNT(*) AS c FROM movies WHERE published = 1').get() as { c: number };

  if (saved?.value) {
    try {
      const parsed = JSON.parse(saved.value) as MovieSyncStatus;
      return { ...parsed, movieCount: totalCountRow.c };
    } catch {
      // ignore parse fallback
    }
  }

  const hasTmdb = Boolean(
    process.env.TMDB_API_KEY?.trim() && !process.env.TMDB_API_KEY.trim().startsWith('MY_')
  );
  return {
    mode: hasTmdb ? 'LIVE' : 'DEMO',
    lastSyncedAt: new Date().toISOString(),
    apiAvailable: true,
    errorBanner: null,
    movieCount: totalCountRow.c,
    syncedNewCount: 0,
  };
}

export function startMovieSyncScheduler(): void {
  if (schedulerStarted) return;
  schedulerStarted = true;
  void syncMoviesWithDatabase(false).catch(() => {});
  const timer = setInterval(() => {
    void syncMoviesWithDatabase(true).catch(() => {});
  }, SCHEDULER_INTERVAL_MS);
  timer.unref?.();
}

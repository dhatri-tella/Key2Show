import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.ts';
import { requireAuth, type AuthenticatedRequest } from '../security.ts';
import { validateCouponRule, type CouponRule } from '../../utils/bookingLogic.ts';
import { getSyncStatus, syncMoviesWithDatabase } from '../services/movieSync.ts';
import { publishToShow } from '../services/realtimeHub.ts';

export const publicRoutes = Router();

export function releaseExpiredLocks(): void {
  const now = Date.now();
  const expiredShows = db
    .prepare("SELECT DISTINCT show_id FROM show_seats WHERE status = 'LOCKED' AND lock_expires_at IS NOT NULL AND lock_expires_at < ?")
    .all(now) as { show_id: string }[];

  if (expiredShows.length === 0) return;

  db.prepare(`
    UPDATE show_seats
    SET status = 'AVAILABLE', locked_by_user_id = NULL, lock_expires_at = NULL
    WHERE status = 'LOCKED' AND lock_expires_at IS NOT NULL AND lock_expires_at < ?
  `).run(now);

  for (const s of expiredShows) {
    publishToShow(s.show_id, 'seats:updated', { showId: s.show_id });
  }
}

publicRoutes.get('/catalog', (_req, res) => {
  const movies = db
    .prepare('SELECT * FROM movies WHERE published = 1 ORDER BY featured DESC, release_year DESC')
    .all() as Record<string, unknown>[];

  const theatres = db
    .prepare('SELECT * FROM theatres ORDER BY featured DESC, rating DESC')
    .all() as Record<string, unknown>[];

  const events = db
    .prepare('SELECT * FROM events WHERE published = 1')
    .all() as Record<string, unknown>[];

  const eventTiers = db
    .prepare('SELECT * FROM event_tickets')
    .all() as Record<string, unknown>[];

  const foodItems = db
    .prepare('SELECT * FROM food_items WHERE available = 1')
    .all() as Record<string, unknown>[];

  const offers = db
    .prepare('SELECT * FROM offers WHERE active = 1')
    .all() as Record<string, unknown>[];

  const shows = db
    .prepare(`
      SELECT s.*, sc.name AS screen_name, sc.sound_system, sc.projection
      FROM shows s
      JOIN screens sc ON sc.id = s.screen_id
      WHERE s.status = 'ACTIVE'
    `)
    .all() as Record<string, unknown>[];

  const castRows = db.prepare('SELECT * FROM movie_cast').all() as {
    movie_id: string;
    actor_name: string;
    role_name: string;
  }[];
  const crewRows = db.prepare('SELECT * FROM movie_crew').all() as {
    movie_id: string;
    member_name: string;
    department: string;
  }[];

  const formattedMovies = movies.map((m) => ({
    id: m.id,
    title: m.title,
    subtitle: m.subtitle || undefined,
    poster: m.poster,
    banner: m.banner,
    trailerUrl: m.trailer_url,
    youtubeVideoId: (() => {
      const raw = String(m.trailer_url || '');
      if (!raw) return '';
      const match =
        raw.match(/(?:youtube\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/) ??
        raw.match(/^([a-zA-Z0-9_-]{6,})$/);
      return match?.[1] || '';
    })(),
    trailerThumbnail: '',
    genre: JSON.parse(String(m.genre_json || '[]')),
    language: m.language,
    duration: m.duration,
    rating: m.rating,
    votes: m.votes,
    certification: m.certification,
    formats: JSON.parse(String(m.formats_json || '[]')),
    releaseDate: m.release_date,
    releaseYear: m.release_year,
    basePrice: m.base_price,
    featured: Boolean(m.featured),
    synopsis: m.synopsis,
    cast: castRows.filter((c) => c.movie_id === m.id).map((c) => c.actor_name),
    castDetails: castRows.filter((c) => c.movie_id === m.id),
    crewDetails: crewRows.filter((c) => c.movie_id === m.id),
    director: crewRows.find((c) => c.movie_id === m.id)?.member_name ?? 'Director',
  }));

  const formattedTheatres = theatres.map((t) => ({
    id: t.id,
    name: t.name,
    location: t.location,
    city: t.city,
    address: t.address,
    category: t.category,
    rating: t.rating,
    image: t.image,
    screens: t.screens_count,
    formats: JSON.parse(String(t.formats_json || '[]')),
    amenities: JSON.parse(String(t.amenities_json || '[]')),
    foodAvailable: Boolean(t.food_available),
    lat: t.lat,
    lng: t.lng,
    featured: Boolean(t.featured),
  }));

  const formattedEvents = events.map((ev) => ({
    id: ev.id,
    title: ev.title,
    category: ev.category,
    venue: ev.venue,
    city: ev.city,
    date: ev.event_date,
    time: ev.event_time,
    price: ev.price,
    image: ev.image,
    badge: ev.badge,
    description: ev.description,
    tiers: eventTiers.filter((tier) => tier.event_id === ev.id),
  }));

  res.json({
    movies: formattedMovies,
    theatres: formattedTheatres,
    events: formattedEvents,
    shows,
    foodItems,
    offers,
    syncStatus: getSyncStatus(),
  });
});

publicRoutes.get('/movies/sync-status', (_req, res) => {
  res.json({ syncStatus: getSyncStatus() });
});

publicRoutes.post('/movies/sync', async (_req, res) => {
  try {
    const syncStatus = await syncMoviesWithDatabase(true);
    res.json({ syncStatus });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Movie sync failed.' });
  }
});

publicRoutes.get('/shows/:id/seats', (req, res) => {
  releaseExpiredLocks();
  const show = db
    .prepare(`
      SELECT s.*, m.title AS movie_title, t.name AS theatre_name, t.location AS theatre_location,
             sc.name AS screen_name, sc.rows_count, sc.cols_count, sc.sound_system, sc.projection
      FROM shows s
      JOIN movies m ON m.id = s.movie_id
      JOIN theatres t ON t.id = s.theatre_id
      JOIN screens sc ON sc.id = s.screen_id
      WHERE s.id = ?
    `)
    .get(req.params.id) as Record<string, unknown> | undefined;

  if (!show) {
    res.status(404).json({ error: 'Show not found.' });
    return;
  }

  const seats = db
    .prepare('SELECT id, seat_code, category, price, status, locked_by_user_id, lock_expires_at FROM show_seats WHERE show_id = ? ORDER BY seat_code ASC')
    .all(req.params.id);

  res.json({ show, seats });
});

publicRoutes.post('/coupons/validate', (req, res) => {
  const { code, subtotal, movieId, theatreId } = req.body ?? {};
  const cleanCode = String(code ?? '').trim().toUpperCase();
  if (!cleanCode) {
    res.status(400).json({ valid: false, discount: 0, reason: 'Please enter a coupon code.' });
    return;
  }
  const row = db
    .prepare('SELECT * FROM coupons WHERE UPPER(code) = ?')
    .get(cleanCode) as Record<string, unknown> | undefined;

  const rule: CouponRule | undefined = row
    ? {
        code: String(row.code),
        discountType: String(row.discount_type) as 'PERCENT' | 'FLAT',
        discountValue: Number(row.discount_value),
        minAmount: Number(row.min_amount),
        maxDiscount: Number(row.max_discount),
        expiryDate: String(row.expiry_date),
        applicableMovieId: row.applicable_movie_id ? String(row.applicable_movie_id) : null,
        applicableTheatreId: row.applicable_theatre_id ? String(row.applicable_theatre_id) : null,
        active: Boolean(row.active),
      }
    : undefined;

  const result = validateCouponRule(rule, Number(subtotal ?? 0), {
    movieId: movieId ? String(movieId) : undefined,
    theatreId: theatreId ? String(theatreId) : undefined,
  });

  if (!result.valid) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});

publicRoutes.get('/reviews/:targetType/:targetId', (req, res) => {
  const targetType = String(req.params.targetType).toUpperCase();
  const rows = db
    .prepare('SELECT id, user_name, rating, comment, created_at FROM reviews WHERE target_type = ? AND target_id = ? ORDER BY created_at DESC')
    .all(targetType, req.params.targetId);
  res.json({ reviews: rows });
});

publicRoutes.post('/reviews', requireAuth, (req: AuthenticatedRequest, res) => {
  const { targetType, targetId, rating, comment } = req.body ?? {};
  const numRating = Number(rating);
  if (!targetType || !targetId || !comment || Number.isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({ error: 'Valid target, rating (1-5), and comment are required.' });
    return;
  }
  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.auth!.userId) as { name: string } | undefined;
  const id = `rev-${crypto.randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO reviews (id, target_type, target_id, user_id, user_name, rating, comment, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, String(targetType).toUpperCase(), String(targetId), req.auth!.userId, user?.name ?? 'User', numRating, String(comment).trim(), now);
  res.status(201).json({
    review: { id, user_name: user?.name ?? 'User', rating: numRating, comment: String(comment).trim(), created_at: now },
  });
});

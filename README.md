# Key2Show

Key2Show is a responsive movie and event booking platform for discovering shows, selecting seats, ordering food, sharing companion access, completing payments, and checking in with one booking-level QR pass.

## Features

- Movie, event, and theatre discovery
- Showtimes, seat selection, and timed seat locking
- Food and beverage pre-orders
- Coupons and server-calculated checkout totals
- Razorpay payment sessions and server-side verification
- One QR code per booking
- Companion/shared booking access
- Booking cancellation, refunds, and notifications
- YouTube trailer playback and fallback links
- Resend confirmation email support
- Admin catalog, booking, payment, and QR check-in tools
- Mobile-first responsive UI

## Tech Stack

- React 19 and TypeScript
- Vite 8
- Tailwind CSS
- Express
- SQLite local runtime database
- Drizzle ORM/PostgreSQL configuration available for auxiliary tooling
- Firebase Authentication integration
- Razorpay
- TMDB
- YouTube
- Resend
- PWA support

## Project Structure

- `src/pages/user` - customer booking and account pages
- `src/pages/admin` - administration pages
- `src/components` - reusable UI and modal components
- `src/server/routes` - public, authentication, booking, and admin APIs
- `src/server/services` - email, real-time, security, and movie-sync services
- `src/server/db.ts` - SQLite schema initialization
- `src/server/seed.ts` - local deterministic seed data
- `src/utils` - API client and application helpers
- `public` - images and PWA assets
- `data` - local runtime SQLite database, excluded from Git

## Installation

Prerequisites: Node.js 20 or newer and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

The development server is available at `http://localhost:3000`.

## Environment Variables

Create `.env` from `.env.example`. Use test credentials only during development.

Required for their respective features:

- `GEMINI_API_KEY` - Gemini AI concierge
- `TMDB_API_KEY` - live movie metadata synchronization
- `VITE_GOOGLE_MAPS_API_KEY` - Google Maps venue explorer
- `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` - payment checkout and verification
- `RESEND_API_KEY` and `RESEND_FROM_EMAIL` - booking confirmation email
- `ADMIN_PASSCODE` - optional server-side admin passcode
- `SESSION_SECRET` - recommended for production token signing

SQLite is used as the local runtime database and is initialized automatically. Optional SQL variables configure the auxiliary Drizzle/PostgreSQL tooling.

Never commit `.env`, database dumps, user data, payment credentials, private keys, or service-account credentials.

## Development

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run build
npm test
```

Run `npm test` only if test scripts are added by the project; the current package configuration does not define a test script.

## Production Build

```bash
npm run build
npm start
```

Configure production environment variables before starting the server.

## GitHub Setup

```bash
git clone <repository-url>
cd Key2Show
npm install
cp .env.example .env
npm run dev
```

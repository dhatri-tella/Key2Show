import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { initializeSchema } from './src/server/db.ts';
import { seedDatabaseIfEmpty } from './src/server/seed.ts';
import { publicRoutes } from './src/server/routes/publicRoutes.ts';
import { authRoutes } from './src/server/routes/authRoutes.ts';
import { bookingRoutes } from './src/server/routes/bookingRoutes.ts';
import { adminRoutes } from './src/server/routes/adminRoutes.ts';
import { aiRoutes } from './src/server/routes/aiRoutes.ts';
import { cloudRoutes } from './src/server/routes/cloudRoutes.ts';
import { realtimeRoutes } from './src/server/services/realtimeHub.ts';
import { startMovieSyncScheduler } from './src/server/services/movieSync.ts';

async function startServer(): Promise<void> {
  initializeSchema();
  seedDatabaseIfEmpty();
  startMovieSyncScheduler();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Healthcheck
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'key2show' });
  });

  // API Routes
  app.use('/api', publicRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api', bookingRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/cloud', cloudRoutes);
  app.use('/api/realtime', realtimeRoutes);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Key2Show server running on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Key2Show server:', err);
  process.exit(1);
});

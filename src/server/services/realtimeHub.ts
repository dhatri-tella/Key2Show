import { Router, type Response } from 'express';
import crypto from 'node:crypto';
import { verifyAuthToken } from '../security.ts';

interface SseClient {
  id: string;
  userId: string | null;
  role: 'USER' | 'ADMIN' | null;
  showId: string | null;
  res: Response;
}

const clients = new Map<string, SseClient>();

function writeSseEvent(res: Response, event: string, data: unknown): void {
  try {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  } catch {
    // Ignore broken pipes; cleanup runs on close
  }
}

export function publishToUsers(userIds: (string | null | undefined)[], event: string, data: unknown): void {
  const targetSet = new Set(userIds.filter((id): id is string => Boolean(id)));
  if (targetSet.size === 0) return;
  for (const client of clients.values()) {
    if (client.userId && targetSet.has(client.userId)) {
      writeSseEvent(client.res, event, data);
    }
  }
}

export function publishToAdmins(event: string, data: unknown): void {
  for (const client of clients.values()) {
    if (client.role === 'ADMIN') {
      writeSseEvent(client.res, event, data);
    }
  }
}

export function publishToShow(showId: string, event: string, data: unknown): void {
  if (!showId) return;
  for (const client of clients.values()) {
    if (!client.showId || client.showId === showId) {
      writeSseEvent(client.res, event, data);
    }
  }
}

export function broadcastGlobal(event: string, data: unknown): void {
  for (const client of clients.values()) {
    writeSseEvent(client.res, event, data);
  }
}

export const realtimeRoutes = Router();

realtimeRoutes.get('/stream', (req, res) => {
  const token = typeof req.query.token === 'string' ? req.query.token.trim() : '';
  const showId = typeof req.query.showId === 'string' && req.query.showId.trim() ? req.query.showId.trim() : null;
  const auth = token ? verifyAuthToken(token) : null;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const clientId = crypto.randomUUID();
  clients.set(clientId, {
    id: clientId,
    userId: auth?.userId ?? null,
    role: auth?.role ?? null,
    showId,
    res,
  });

  writeSseEvent(res, 'connected', {
    clientId,
    userId: auth?.userId ?? null,
    showId,
    timestamp: new Date().toISOString(),
  });

  const heartbeat = setInterval(() => {
    try {
      res.write(': ping\n\n');
    } catch {
      clearInterval(heartbeat);
      clients.delete(clientId);
    }
  }, 25_000);

  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(clientId);
  });
});

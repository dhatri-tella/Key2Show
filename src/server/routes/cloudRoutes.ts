import { Router } from 'express';
import { requireFirebaseAuth, type FirebaseAuthRequest } from '../../middleware/auth.ts';
import {
  createChatSession,
  deleteChatSession,
  getChatSessionWithMessages,
  getOrCreateUser,
  getUserChatSessions,
  getUserSavedVenues,
  removeSavedVenue,
  updateUserPreferredCity,
  upsertSavedVenue,
} from '../../db/users.ts';

export const cloudRoutes = Router();

cloudRoutes.use(requireFirebaseAuth);

cloudRoutes.get('/me', async (req: FirebaseAuthRequest, res) => {
  try {
    const user = await getOrCreateUser(
      req.firebaseUser!.uid,
      req.firebaseUser!.email || '',
      typeof req.firebaseUser!.name === 'string' ? req.firebaseUser!.name : undefined
    );
    const [sessions, savedVenues] = await Promise.all([
      getUserChatSessions(req.firebaseUser!.uid),
      getUserSavedVenues(req.firebaseUser!.uid),
    ]);
    res.json({ user, sessions, savedVenues });
  } catch (error) {
    console.error('Cloud SQL /me failed:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Cloud SQL request failed.' });
  }
});

cloudRoutes.put('/preferences', async (req: FirebaseAuthRequest, res) => {
  try {
    const { preferredCity } = req.body ?? {};
    if (!preferredCity || typeof preferredCity !== 'string') {
      res.status(400).json({ error: 'preferredCity is required.' });
      return;
    }
    const updated = await updateUserPreferredCity(req.firebaseUser!.uid, preferredCity);
    res.json({ user: updated });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to update preferences.' });
  }
});

cloudRoutes.get('/chats', async (req: FirebaseAuthRequest, res) => {
  try {
    const sessions = await getUserChatSessions(req.firebaseUser!.uid);
    res.json({ sessions });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to fetch chat sessions.' });
  }
});

cloudRoutes.post('/chats', async (req: FirebaseAuthRequest, res) => {
  try {
    const { title, mode } = req.body ?? {};
    const session = await createChatSession(
      req.firebaseUser!.uid,
      req.firebaseUser!.email || '',
      String(title ?? 'Key2Show Concierge Chat'),
      String(mode ?? 'general'),
      typeof req.firebaseUser!.name === 'string' ? req.firebaseUser!.name : undefined
    );
    res.status(201).json({ session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to create chat session.' });
  }
});

cloudRoutes.get('/chats/:id', async (req: FirebaseAuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid session ID.' });
      return;
    }
    const session = await getChatSessionWithMessages(req.firebaseUser!.uid, id);
    if (!session) {
      res.status(404).json({ error: 'Chat session not found.' });
      return;
    }
    res.json({ session });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load chat session.' });
  }
});

cloudRoutes.delete('/chats/:id', async (req: FirebaseAuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: 'Invalid session ID.' });
      return;
    }
    const deleted = await deleteChatSession(req.firebaseUser!.uid, id);
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to delete chat session.' });
  }
});

cloudRoutes.get('/saved-venues', async (req: FirebaseAuthRequest, res) => {
  try {
    const venues = await getUserSavedVenues(req.firebaseUser!.uid);
    res.json({ savedVenues: venues });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to load saved venues.' });
  }
});

cloudRoutes.post('/saved-venues', async (req: FirebaseAuthRequest, res) => {
  try {
    const { theatreId, theatreName, city, note } = req.body ?? {};
    if (!theatreId || !theatreName || !city) {
      res.status(400).json({ error: 'theatreId, theatreName, and city are required.' });
      return;
    }
    const saved = await upsertSavedVenue({
      uid: req.firebaseUser!.uid,
      email: req.firebaseUser!.email || '',
      displayName:
        typeof req.firebaseUser!.name === 'string' ? req.firebaseUser!.name : undefined,
      theatreId: String(theatreId),
      theatreName: String(theatreName),
      city: String(city),
      note: typeof note === 'string' ? note : undefined,
    });
    res.status(201).json({ savedVenue: saved });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to save venue.' });
  }
});

cloudRoutes.delete('/saved-venues/:theatreId', async (req: FirebaseAuthRequest, res) => {
  try {
    const deleted = await removeSavedVenue(req.firebaseUser!.uid, String(req.params.theatreId));
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Failed to remove venue.' });
  }
});

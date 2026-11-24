import { and, desc, eq } from 'drizzle-orm';
import { db } from './index.ts';
import { aiChatMessages, aiChatSessions, savedVenues, users } from './schema.ts';

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName?: string
) {
  try {
    const result = await db
      .insert(users)
      .values({
        uid,
        email,
        displayName: displayName ?? null,
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email,
          ...(displayName ? { displayName } : {}),
        },
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database user upsert failed:', error);
    throw new Error('Failed to synchronize user account.', { cause: error });
  }
}

export async function updateUserPreferredCity(uid: string, preferredCity: string) {
  try {
    const result = await db
      .update(users)
      .set({ preferredCity })
      .where(eq(users.uid, uid))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database city update failed:', error);
    throw new Error('Failed to update user preferences.', { cause: error });
  }
}

export async function getUserChatSessions(uid: string) {
  try {
    const userRow = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRow[0]) return [];

    const sessions = await db
      .select()
      .from(aiChatSessions)
      .where(eq(aiChatSessions.userId, userRow[0].id))
      .orderBy(desc(aiChatSessions.updatedAt));

    return sessions;
  } catch (error) {
    console.error('Database chat sessions fetch failed:', error);
    throw new Error('Failed to load conversation history.', { cause: error });
  }
}

export async function getChatSessionWithMessages(uid: string, sessionId: number) {
  try {
    const rows = await db
      .select({
        session: aiChatSessions,
      })
      .from(aiChatSessions)
      .innerJoin(users, eq(aiChatSessions.userId, users.id))
      .where(and(eq(aiChatSessions.id, sessionId), eq(users.uid, uid)));

    if (!rows[0]) return null;

    const messages = await db
      .select()
      .from(aiChatMessages)
      .where(eq(aiChatMessages.sessionId, sessionId))
      .orderBy(aiChatMessages.id);

    return {
      ...rows[0].session,
      messages,
    };
  } catch (error) {
    console.error('Database chat session fetch failed:', error);
    throw new Error('Failed to load conversation messages.', { cause: error });
  }
}

export async function createChatSession(
  uid: string,
  email: string,
  title: string,
  mode: string,
  displayName?: string
) {
  try {
    const user = await getOrCreateUser(uid, email, displayName);
    const inserted = await db
      .insert(aiChatSessions)
      .values({
        userId: user.id,
        title: title.slice(0, 120) || 'Key2Show Concierge Chat',
        mode,
      })
      .returning();

    return inserted[0];
  } catch (error) {
    console.error('Database chat session creation failed:', error);
    throw new Error('Failed to create conversation.', { cause: error });
  }
}

export async function appendChatTurn(params: {
  uid: string;
  email: string;
  sessionId?: number;
  title: string;
  mode: string;
  model: string;
  userMessage: string;
  assistantMessage: string;
  sourcesJson?: string;
  displayName?: string;
}) {
  try {
    const user = await getOrCreateUser(params.uid, params.email, params.displayName);
    let activeSessionId = params.sessionId;

    if (activeSessionId) {
      const existing = await db
        .select()
        .from(aiChatSessions)
        .where(and(eq(aiChatSessions.id, activeSessionId), eq(aiChatSessions.userId, user.id)));

      if (!existing[0]) {
        activeSessionId = undefined;
      } else {
        await db
          .update(aiChatSessions)
          .set({ mode: params.mode, updatedAt: new Date() })
          .where(eq(aiChatSessions.id, activeSessionId));
      }
    }

    if (!activeSessionId) {
      const created = await db
        .insert(aiChatSessions)
        .values({
          userId: user.id,
          title: params.title.slice(0, 120) || 'Key2Show Concierge Chat',
          mode: params.mode,
        })
        .returning();
      activeSessionId = created[0].id;
    }

    await db.insert(aiChatMessages).values([
      {
        sessionId: activeSessionId,
        role: 'user',
        model: params.model,
        content: params.userMessage,
        sourcesJson: null,
      },
      {
        sessionId: activeSessionId,
        role: 'model',
        model: params.model,
        content: params.assistantMessage,
        sourcesJson: params.sourcesJson ?? null,
      },
    ]);

    return activeSessionId;
  } catch (error) {
    console.error('Database chat turn persistence failed:', error);
    throw new Error('Failed to save chat message.', { cause: error });
  }
}

export async function deleteChatSession(uid: string, sessionId: number) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows[0]) return false;

    const deleted = await db
      .delete(aiChatSessions)
      .where(and(eq(aiChatSessions.id, sessionId), eq(aiChatSessions.userId, userRows[0].id)))
      .returning();

    return deleted.length > 0;
  } catch (error) {
    console.error('Database chat session deletion failed:', error);
    throw new Error('Failed to delete conversation.', { cause: error });
  }
}

export async function getUserSavedVenues(uid: string) {
  try {
    const rows = await db
      .select({
        id: savedVenues.id,
        theatreId: savedVenues.theatreId,
        theatreName: savedVenues.theatreName,
        city: savedVenues.city,
        note: savedVenues.note,
        createdAt: savedVenues.createdAt,
      })
      .from(savedVenues)
      .innerJoin(users, eq(savedVenues.userId, users.id))
      .where(eq(users.uid, uid))
      .orderBy(desc(savedVenues.createdAt));

    return rows;
  } catch (error) {
    console.error('Database saved venues fetch failed:', error);
    throw new Error('Failed to load saved venues.', { cause: error });
  }
}

export async function upsertSavedVenue(params: {
  uid: string;
  email: string;
  displayName?: string;
  theatreId: string;
  theatreName: string;
  city: string;
  note?: string;
}) {
  try {
    const user = await getOrCreateUser(params.uid, params.email, params.displayName);
    const existing = await db
      .select()
      .from(savedVenues)
      .where(and(eq(savedVenues.userId, user.id), eq(savedVenues.theatreId, params.theatreId)));

    if (existing[0]) {
      const updated = await db
        .update(savedVenues)
        .set({
          theatreName: params.theatreName,
          city: params.city,
          note: params.note ?? existing[0].note,
        })
        .where(eq(savedVenues.id, existing[0].id))
        .returning();
      return updated[0];
    }

    const inserted = await db
      .insert(savedVenues)
      .values({
        userId: user.id,
        theatreId: params.theatreId,
        theatreName: params.theatreName,
        city: params.city,
        note: params.note ?? null,
      })
      .returning();
    return inserted[0];
  } catch (error) {
    console.error('Database saved venue upsert failed:', error);
    throw new Error('Failed to save venue.', { cause: error });
  }
}

export async function removeSavedVenue(uid: string, theatreId: string) {
  try {
    const userRows = await db.select().from(users).where(eq(users.uid, uid));
    if (!userRows[0]) return false;

    const deleted = await db
      .delete(savedVenues)
      .where(and(eq(savedVenues.userId, userRows[0].id), eq(savedVenues.theatreId, theatreId)))
      .returning();

    return deleted.length > 0;
  } catch (error) {
    console.error('Database saved venue delete failed:', error);
    throw new Error('Failed to remove saved venue.', { cause: error });
  }
}

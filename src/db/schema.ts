import { relations } from 'drizzle-orm';
import { integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  displayName: text('display_name'),
  preferredCity: text('preferred_city').default('Hyderabad'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const aiChatSessions = pgTable('ai_chat_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: text('title').notNull(),
  mode: text('mode').notNull().default('general'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const aiChatMessages = pgTable('ai_chat_messages', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .references(() => aiChatSessions.id, { onDelete: 'cascade' })
    .notNull(),
  role: text('role').notNull(),
  model: text('model').notNull(),
  content: text('content').notNull(),
  sourcesJson: text('sources_json'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const savedVenues = pgTable('saved_venues', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  theatreId: text('theatre_id').notNull(),
  theatreName: text('theatre_name').notNull(),
  city: text('city').notNull(),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usersRelations = relations(users, ({ many }) => ({
  chatSessions: many(aiChatSessions),
  savedVenues: many(savedVenues),
}));

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [aiChatSessions.userId],
    references: [users.id],
  }),
  messages: many(aiChatMessages),
}));

export const aiChatMessagesRelations = relations(aiChatMessages, ({ one }) => ({
  session: one(aiChatSessions, {
    fields: [aiChatMessages.sessionId],
    references: [aiChatSessions.id],
  }),
}));

export const savedVenuesRelations = relations(savedVenues, ({ one }) => ({
  user: one(users, {
    fields: [savedVenues.userId],
    references: [users.id],
  }),
}));

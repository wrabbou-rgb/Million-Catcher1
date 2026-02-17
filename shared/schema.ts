
import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
// We'll use the DB mainly for storing game sessions and maybe questions if we want them dynamic later.
// For now, most game state might be in-memory for speed, but let's define structure.

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  options: jsonb("options").notNull(), // Array of { id: string, text: string, isCorrect: boolean }
  order: integer("order").notNull(),
  type: text("type").notNull(), // 'normal' (4 opts), 'reduced' (3 opts), 'final' (2 opts)
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // 6 char code
  hostName: text("host_name").notNull(),
  maxPlayers: integer("max_players").notNull(),
  state: text("state").notNull().default("waiting"), // waiting, playing, finished
  currentQuestionIndex: integer("current_question_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(), // FK to games.id (logical)
  socketId: text("socket_id").notNull(),
  name: text("name").notNull(),
  money: integer("money").notNull().default(1000000),
  status: text("status").notNull().default("active"), // active, eliminated, winner
  lastAnswer: jsonb("last_answer"), // Store distribution: { [optionId]: amount }
});

// === SCHEMAS ===
export const insertQuestionSchema = createInsertSchema(questions);
export const insertGameSchema = createInsertSchema(games);
export const insertPlayerSchema = createInsertSchema(players);

// === TYPES ===
export type Question = typeof questions.$inferSelect;
export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;

export type QuestionOption = {
  id: string; // 'A', 'B', 'C', 'D'
  text: string;
  isCorrect: boolean;
};

// Request types
export type CreateGameRequest = {
  hostName: string;
  maxPlayers: number;
};

export type JoinGameRequest = {
  code: string;
  playerName: string;
};

// WebSocket Event Types (Shared)
export const WS_EVENTS = {
  // Client -> Server
  JOIN_GAME: 'join_game',
  HOST_GAME: 'host_game',
  START_GAME: 'start_game',
  SUBMIT_ANSWER: 'submit_answer', // { distribution: { A: 0, B: 500000... } }
  REVEL_ANSWER: 'reveal_answer', // Player clicks reveal
  NEXT_QUESTION: 'next_question', // Host or auto? Spec says "Player... Después aparece botón SEGUENT PREGUNTA". 
                                  // Actually spec says "Host NO pasa preguntas... Todo sucede en pantalla del jugador".
                                  // So NEXT_QUESTION is from Player -> Server to get next Q.

  // Server -> Client
  GAME_STATE: 'game_state', // General updates
  PLAYER_UPDATE: 'player_update', // For specific player
  ERROR: 'error',
  ROOM_FULL: 'room_full',
  GAME_STARTED: 'game_started',
  PLAYER_JOINED: 'player_joined', // For host view
  LEADERBOARD_UPDATE: 'leaderboard_update', // For host view
} as const;

export type MoneyDistribution = Record<string, number>; // "A": 500000, "B": 0...

import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  text: text("text").notNull(),
  options: jsonb("options").notNull(),
  order: integer("order").notNull(),
  type: text("type").notNull(),
});

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  hostName: text("host_name").notNull(),
  maxPlayers: integer("max_players").notNull(),
  state: text("state").notNull().default("waiting"),
  currentQuestionIndex: integer("current_question_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const players = pgTable("players", {
  id: serial("id").primaryKey(),
  gameId: integer("game_id").notNull(),
  socketId: text("socket_id").notNull(),
  name: text("name").notNull(),
  money: integer("money").notNull().default(1000000),
  status: text("status").notNull().default("active"),
  questionIndex: integer("question_index").notNull().default(0),
  lastAnswer: jsonb("last_answer"),
  currentBet: jsonb("current_bet").default({}), // ✅ NUEVO
  hasConfirmed: boolean("has_confirmed").notNull().default(false), // ✅ NUEVO
});

// === SCHEMAS ===
export const insertQuestionSchema = createInsertSchema(questions);
export const insertGameSchema = createInsertSchema(games);
export const insertPlayerSchema = createInsertSchema(players);

// === TYPES ===
export type Game = typeof games.$inferSelect;
export type Player = typeof players.$inferSelect;

// Question se define manualmente para soportar maxOptionsToBet y letter
export type QuestionOption = {
  id: string;
  letter: string; // ✅ NUEVO
  text: string;
  isCorrect: boolean;
};

export type Question = {
  id: number;
  order: number;
  type: string;
  text: string;
  maxOptionsToBet: number; // ✅ NUEVO
  options: QuestionOption[];
};

export type GameStatus = "waiting" | "playing" | "finished";
export type PlayerStatus = "active" | "eliminated" | "winner";

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
  CREATE_ROOM: "CREATE_ROOM",
  JOIN_ROOM: "JOIN_ROOM",
  START_GAME: "START_GAME",
  UPDATE_BET: "UPDATE_BET",
  CONFIRM_BET: "CONFIRM_BET",
  NEXT_QUESTION: "NEXT_QUESTION",
  SUBMIT_ANSWER: "SUBMIT_ANSWER",
  REVEAL_RESULT: "REVEAL_RESULT", // ✅ NUEVO
  // Server -> Client
  ROOM_CREATED: "ROOM_CREATED",
  PLAYER_JOINED: "PLAYER_JOINED",
  GAME_STARTED: "GAME_STARTED",
  STATE_UPDATE: "STATE_UPDATE",
  PLAYER_UPDATE: "PLAYER_UPDATE",
  ERROR: "ERROR",
} as const;

export type MoneyDistribution = Record<string, number>;

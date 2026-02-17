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
  id: string;
  text: string;
  isCorrect: boolean;
};

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
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  START_GAME: "start_game",
  UPDATE_BET: "update_bet",
  CONFIRM_BET: "confirm_bet",
  NEXT_QUESTION: "next_question",
  SUBMIT_ANSWER: "submit_answer",

  // Server -> Client
  ROOM_CREATED: "room_created",
  PLAYER_JOINED: "player_joined",
  GAME_STARTED: "game_started",
  STATE_UPDATE: "state_update",
  PLAYER_UPDATE: "player_update",
  ERROR: "error",
} as const;

export type MoneyDistribution = Record<string, number>;

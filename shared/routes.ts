
import { z } from 'zod';
import { insertGameSchema, insertPlayerSchema } from './schema';

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
};

export const api = {
  // Mostly using WebSockets, but we can have some basic API endpoints if needed
  // For this game, almost everything is real-time.
  health: {
    check: {
      method: 'GET' as const,
      path: '/api/health' as const,
      responses: {
        200: z.object({ status: z.string() }),
      },
    },
  },
};

// WebSocket payloads
export const wsPayloads = {
  joinGame: z.object({
    code: z.string().length(6),
    name: z.string().min(1),
  }),
  hostGame: z.object({
    hostName: z.string().min(1),
    maxPlayers: z.number().min(2).max(30),
  }),
  submitAnswer: z.object({
    distribution: z.record(z.string(), z.number()),
    questionIndex: z.number(),
  }),
};

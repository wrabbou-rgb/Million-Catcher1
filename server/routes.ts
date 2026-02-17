import type { Express } from "express";
import { Server as SocketIOServer } from "socket.io";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(httpServer: Server, app: Express) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*" },
  });

  io.on("connection", async (socket) => {
    const questions = await storage.getQuestions();

    socket.on("CREATE_ROOM", async (data) => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await storage.createGame(data.hostName, data.maxPlayers, code);

      const state = {
        roomCode: code,
        status: "waiting",
        players: [],
        currentQuestionIndex: 0,
        questions: questions, // Enviamos las preguntas al Host
      };
      socket.join(code);
      socket.emit("STATE_UPDATE", state);
    });

    socket.on("JOIN_ROOM", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (game) {
        await storage.addPlayer(game.id, socket.id, data.playerName);
        socket.join(data.roomCode);

        const players = await storage.getPlayersInGame(game.id);
        io.to(data.roomCode).emit("STATE_UPDATE", {
          roomCode: game.code,
          status: game.state,
          players: players,
          currentQuestionIndex: game.currentQuestionIndex,
          questions: questions,
        });
      }
    });

    socket.on("START_GAME", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (game) {
        await storage.updateGameState(game.id, "playing");
        const players = await storage.getPlayersInGame(game.id);
        io.to(data.roomCode).emit("STATE_UPDATE", {
          status: "playing",
          players: players,
          currentQuestionIndex: 0,
          questions: questions,
        });
      }
    });

    socket.on("NEXT_QUESTION_GLOBAL", async () => {
      // Lógica para avanzar de pregunta
      socket.broadcast.emit("FORCE_NEXT_QUESTION");
    });
  });

  return httpServer;
}

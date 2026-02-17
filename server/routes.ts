import type { Express } from "express";
import { Server as SocketIOServer } from "socket.io";
import type { Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(httpServer: Server, app: Express) {
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    // EVENTO CRÍTICO: CREAR SALA
    socket.on("CREATE_ROOM", async (data) => {
      try {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        const game = await storage.createGame(
          data.hostName || "Host",
          data.maxPlayers || 20,
          code,
        );

        const state = {
          roomCode: code,
          status: "waiting",
          players: [],
          currentQuestionIndex: 0,
        };

        socket.join(code);
        socket.emit("STATE_UPDATE", state);
        console.log("SALA CREADA:", code);
      } catch (e) {
        console.error("ERROR CREANDO SALA:", e);
      }
    });

    // UNIRSE
    socket.on("JOIN_ROOM", async (data) => {
      try {
        const game = await storage.getGameByCode(data.roomCode);
        if (game) {
          const player = await storage.addPlayer(
            game.id,
            socket.id,
            data.playerName,
          );
          socket.join(data.roomCode);

          const players = await storage.getPlayersInGame(game.id);
          io.to(data.roomCode).emit("STATE_UPDATE", {
            roomCode: game.code,
            status: game.state,
            players: players,
            currentQuestionIndex: game.currentQuestionIndex,
          });
        }
      } catch (e) {
        console.log("ERROR JOIN:", e);
      }
    });

    socket.on("START_GAME", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (game) {
        await storage.updateGameState(game.id, "playing");
        io.to(data.roomCode).emit("STATE_UPDATE", { status: "playing" });
      }
    });
  });

  return httpServer;
}

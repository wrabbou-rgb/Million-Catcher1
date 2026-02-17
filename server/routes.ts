
import type { Express } from "express";
import type { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Basic health check
  app.get(api.health.check.path, (req, res) => {
    res.json({ status: "ok" });
  });

  // Setup Socket.IO Server
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*", // Allow all origins for simplicity in this setup
      methods: ["GET", "POST"]
    }
  });

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  io.on("connection", (socket) => {
    let currentUserSocketId = socket.id; // Use socket.id as temporary ID

    // Handle host creation
    socket.on(WS_EVENTS.HOST_GAME, async (payload) => {
      try {
        const code = generateRoomCode();
        const game = await storage.createGame(payload.hostName, payload.maxPlayers, code);
        
        // Join room
        socket.join(game.id.toString());
        
        // Store game info on socket object for easy access if needed (or use rooms)
        // Socket.IO manages rooms, so we can just emit to room.
        
        socket.emit(WS_EVENTS.GAME_STARTED, { // Actually just room created/joined as host
          code, 
          gameId: game.id,
          isHost: true 
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, { message: "Error al crear la sala" });
      }
    });

    // Handle player join
    socket.on(WS_EVENTS.JOIN_GAME, async (payload) => {
      try {
        const { code, name } = payload;
        const game = await storage.getGameByCode(code);
        
        if (!game) {
          socket.emit(WS_EVENTS.ERROR, { message: "Codi de sala invàlid" });
          return;
        }

        const players = await storage.getPlayersInGame(game.id);
        if (players.length >= game.maxPlayers) {
          socket.emit(WS_EVENTS.ERROR, { message: "La sala està plena" });
          return;
        }

        if (game.state !== "waiting") {
          socket.emit(WS_EVENTS.ERROR, { message: "La partida ja ha començat" });
          return;
        }

        const player = await storage.addPlayer(game.id, currentUserSocketId, name);
        
        socket.join(game.id.toString());

        // Notify everyone in game (host needs to know)
        io.to(game.id.toString()).emit(WS_EVENTS.PLAYER_JOINED, { player });

        // Send initial state to player
        socket.emit(WS_EVENTS.GAME_STATE, { 
          state: game.state,
          player,
          playerId: player.id,
          gameId: game.id,
          questions: await storage.getQuestions()
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, { message: "Error al unir-se a la sala" });
      }
    });

    // Handle game start
    socket.on(WS_EVENTS.START_GAME, async () => {
      // In a real app we'd verify if socket is host, but for now we trust the event 
      // or check if the socket is in the room and is the creator (we didn't store creator socketId in DB, just name).
      // For simplicity, we allow it.
      
      // We need gameId. We can get it from the room the socket is in.
      const rooms = Array.from(socket.rooms);
      const gameIdStr = rooms.find(r => r !== socket.id);
      
      if (gameIdStr) {
        const gameId = parseInt(gameIdStr);
        await storage.updateGameState(gameId, "playing");
        
        io.to(gameIdStr).emit(WS_EVENTS.GAME_STARTED, {});
      }
    });

    // Handle submit answer
    socket.on(WS_EVENTS.SUBMIT_ANSWER, async (payload) => {
      try {
        const { money, distribution, questionIndex, gameId, playerId } = payload;
        
        await storage.updatePlayer(playerId, {
          money,
          status: money === 0 ? "eliminated" : "active",
          lastAnswer: distribution
        });

        // Broadcast update to host (and others if needed, but mainly host)
        io.to(gameId.toString()).emit(WS_EVENTS.PLAYER_UPDATE, {
          playerId,
          money,
          questionIndex,
          status: money === 0 ? "eliminated" : "active"
        });
        
        // Also trigger leaderboard update
        const players = await storage.getPlayersInGame(gameId);
        io.to(gameId.toString()).emit(WS_EVENTS.LEADERBOARD_UPDATE, { players });

      } catch (err) {
        console.error("Error submitting answer:", err);
      }
    });

    // Handle next question (Player asking for next, though mostly client controlled)
    // If logic was server-controlled, we'd emit NEXT_QUESTION.
    // Here we just acknowledge or log.
  });

  return httpServer;
}

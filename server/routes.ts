
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
    socket.on(WS_EVENTS.CREATE_ROOM, async (payload) => {
      try {
        const code = generateRoomCode();
        const game = await storage.createGame(payload.hostName, payload.maxPlayers, code);
        
        socket.join(game.id.toString());
        
        socket.emit(WS_EVENTS.ROOM_CREATED, {
          roomCode: code,
          hostName: payload.hostName,
          maxPlayers: payload.maxPlayers,
          players: [],
          status: "waiting",
          currentQuestionIndex: 0
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, "Error al crear la sala");
      }
    });

    // Handle player join
    socket.on(WS_EVENTS.JOIN_ROOM, async (payload) => {
      try {
        const { roomCode, playerName } = payload;
        const game = await storage.getGameByCode(roomCode);
        
        if (!game) {
          socket.emit(WS_EVENTS.ERROR, "Codi incorrecte. Torna-ho a intentar.");
          return;
        }

        const players = await storage.getPlayersInGame(game.id);
        
        if (players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
          socket.emit(WS_EVENTS.ERROR, "Aquest nom ja està en ús. Tria un altre nom.");
          return;
        }

        if (players.length >= game.maxPlayers) {
          socket.emit(WS_EVENTS.ERROR, "La sala està plena");
          return;
        }

        if (game.state !== "waiting") {
          socket.emit(WS_EVENTS.ERROR, "La partida ja ha començat");
          return;
        }

        const player = await storage.addPlayer(game.id, socket.id, playerName);
        
        socket.join(game.id.toString());

        // Notify everyone in game (host needs to know)
        const updatedPlayers = await storage.getPlayersInGame(game.id);
        const gameState = {
          roomCode: game.code,
          hostName: game.hostName,
          maxPlayers: game.maxPlayers,
          players: updatedPlayers,
          status: game.state,
          currentQuestionIndex: game.currentQuestionIndex
        };

        io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, gameState);
        
        socket.emit("game_joined", {
          gameState,
          player
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, "Error al unir-se a la sala");
      }
    });

    // Handle game start
    socket.on(WS_EVENTS.START_GAME, async (payload) => {
      const { roomCode } = payload;
      const game = await storage.getGameByCode(roomCode);
      if (game) {
        await storage.updateGameState(game.id, "playing");
        io.to(game.id.toString()).emit(WS_EVENTS.GAME_STARTED);
        
        const players = await storage.getPlayersInGame(game.id);
        io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, {
          roomCode: game.code,
          hostName: game.hostName,
          maxPlayers: game.maxPlayers,
          players,
          status: "playing",
          currentQuestionIndex: 0
        });
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

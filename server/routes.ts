import type { Express } from "express";
import type { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS } from "@shared/schema";

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  // Basic health check
  app.get(api.health.check.path, (req, res) => {
    res.json({ status: "ok" });
  });

  // Setup Socket.IO Server
  const io = new SocketIOServer(httpServer, {
    path: "/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // Map to track which game and player each socket belongs to
  // socketId -> { gameId, playerId }
  const socketMap = new Map<string, { gameId: number; playerId: number }>();

  io.on("connection", (socket) => {
    // Handle host creation
    socket.on(WS_EVENTS.CREATE_ROOM, async (payload) => {
      try {
        const code = generateRoomCode();
        const game = await storage.createGame(
          payload.hostName,
          payload.maxPlayers,
          code,
        );

        socket.join(game.id.toString());

        socket.emit(WS_EVENTS.ROOM_CREATED, {
          roomCode: code,
          hostName: payload.hostName,
          maxPlayers: payload.maxPlayers,
          players: [],
          status: "waiting",
          currentQuestionIndex: 0,
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, { message: "Error al crear la sala" });
      }
    });

    // Handle player join
    socket.on(WS_EVENTS.JOIN_ROOM, async (payload) => {
      try {
        const { roomCode, playerName } = payload;
        const game = await storage.getGameByCode(roomCode);

        if (!game) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "Codi incorrecte. Torna-ho a intentar.",
          });
          return;
        }

        const players = await storage.getPlayersInGame(game.id);

        if (
          players.some((p) => p.name.toLowerCase() === playerName.toLowerCase())
        ) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "Aquest nom ja està en ús. Tria un altre nom.",
          });
          return;
        }

        if (players.length >= game.maxPlayers) {
          socket.emit(WS_EVENTS.ERROR, { message: "La sala està plena." });
          return;
        }

        if (game.state !== "waiting") {
          socket.emit(WS_EVENTS.ERROR, {
            message: "La partida ja ha començat.",
          });
          return;
        }

        const player = await storage.addPlayer(game.id, socket.id, playerName);

        // Store mapping so we can find gameId and playerId from socketId later
        socketMap.set(socket.id, { gameId: game.id, playerId: player.id });

        socket.join(game.id.toString());

        const updatedPlayers = await storage.getPlayersInGame(game.id);
        const gameState = {
          roomCode: game.code,
          hostName: game.hostName,
          maxPlayers: game.maxPlayers,
          players: updatedPlayers,
          status: game.state,
          currentQuestionIndex: game.currentQuestionIndex,
        };

        // Notify everyone in the room (host sees new player)
        io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, gameState);

        // Send confirmation to the player who just joined
        socket.emit("game_joined", {
          gameState,
          player,
        });
      } catch (err) {
        socket.emit(WS_EVENTS.ERROR, {
          message: "Error al unir-se a la sala.",
        });
      }
    });

    // Handle game start
    socket.on(WS_EVENTS.START_GAME, async (payload) => {
      try {
        const { roomCode } = payload;
        const game = await storage.getGameByCode(roomCode);

        if (game) {
          await storage.updateGameState(game.id, "playing");

          const players = await storage.getPlayersInGame(game.id);
          const gameState = {
            roomCode: game.code,
            hostName: game.hostName,
            maxPlayers: game.maxPlayers,
            players,
            status: "playing",
            currentQuestionIndex: 0,
          };

          // First emit GAME_STARTED so players switch screens
          io.to(game.id.toString()).emit(WS_EVENTS.GAME_STARTED);

          // Then send full state update
          io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, gameState);
        }
      } catch (err) {
        console.error("Error starting game:", err);
      }
    });

    // Handle submit answer - THIS IS THE KEY EVENT FOR REAL TIME HOST UPDATES
    socket.on(WS_EVENTS.SUBMIT_ANSWER, async (payload) => {
      try {
        const { money, questionIndex, status } = payload;

        // Get gameId and playerId from our map using socket.id
        const socketInfo = socketMap.get(socket.id);
        if (!socketInfo) {
          console.error("Socket not found in map:", socket.id);
          return;
        }

        const { gameId, playerId } = socketInfo;

        // Update player in database
        await storage.updatePlayer(playerId, {
          money,
          status: status || (money === 0 ? "eliminated" : "active"),
          lastAnswer: payload.distribution || {},
        });

        // Broadcast PLAYER_UPDATE to everyone in the room (host sees this)
        io.to(gameId.toString()).emit(WS_EVENTS.PLAYER_UPDATE, {
          socketId: socket.id,
          money,
          questionIndex,
          status: status || (money === 0 ? "eliminated" : "active"),
        });
      } catch (err) {
        console.error("Error submitting answer:", err);
      }
    });

    // Handle disconnect - clean up the map
    socket.on("disconnect", () => {
      socketMap.delete(socket.id);
    });
  });

  return httpServer;
}

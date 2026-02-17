import type { Express } from "express";
import type { Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { WS_EVENTS } from "@shared/schema";

type SocketInfo = {
  gameId: number;
  playerId: number;
  questionIndex: number;
  money: number;
  status: string;
  name: string;
};

function findInMap(
  map: Map<string, SocketInfo>,
  playerId: number,
): SocketInfo | undefined {
  let result: SocketInfo | undefined;
  map.forEach((val) => {
    if (val.playerId === playerId) result = val;
  });
  return result;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.get(api.health.check.path, (_req, res) => {
    res.json({ status: "ok" });
  });

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

  const socketMap = new Map<string, SocketInfo>();

  io.on("connection", (socket) => {
    console.log("New connection:", socket.id);

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
        console.log(`Room created: ${code} by ${payload.hostName}`);
      } catch (err) {
        console.error("Error creating room:", err);
        socket.emit(WS_EVENTS.ERROR, { message: "Error al crear la sala" });
      }
    });

    socket.on(WS_EVENTS.JOIN_ROOM, async (payload) => {
      try {
        const { roomCode, playerName } = payload;

        if (!roomCode || !playerName) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "Nom i codi de sala obligatoris.",
          });
          return;
        }

        const game = await storage.getGameByCode(roomCode.toUpperCase().trim());

        if (!game) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "Codi incorrecte. Torna-ho a intentar.",
          });
          return;
        }

        const existingPlayers = await storage.getPlayersInGame(game.id);

        if (
          existingPlayers.some(
            (p) => p.name.toLowerCase() === playerName.toLowerCase().trim(),
          )
        ) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "Aquest nom ja està en ús. Tria un altre nom.",
          });
          return;
        }

        if (existingPlayers.length >= game.maxPlayers) {
          socket.emit(WS_EVENTS.ERROR, { message: "La sala està plena." });
          return;
        }

        if (game.state !== "waiting") {
          socket.emit(WS_EVENTS.ERROR, {
            message: "La partida ja ha començat.",
          });
          return;
        }

        const player = await storage.addPlayer(
          game.id,
          socket.id,
          playerName.trim(),
        );

        socketMap.set(socket.id, {
          gameId: game.id,
          playerId: player.id,
          questionIndex: 0,
          money: 1000000,
          status: "active",
          name: playerName.trim(),
        });

        socket.join(game.id.toString());

        const updatedPlayers = await storage.getPlayersInGame(game.id);
        const enrichedPlayers = updatedPlayers.map((p) => {
          const mem = findInMap(socketMap, p.id);
          return {
            ...p,
            questionIndex: mem ? mem.questionIndex : 0,
            money: mem ? mem.money : p.money,
            status: mem ? mem.status : p.status,
          };
        });

        const gameState = {
          roomCode: game.code,
          hostName: game.hostName,
          maxPlayers: game.maxPlayers,
          players: enrichedPlayers,
          status: game.state,
          currentQuestionIndex: game.currentQuestionIndex,
        };

        io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, gameState);
        socket.emit("game_joined", {
          gameState,
          player: { ...player, questionIndex: 0, money: 1000000 },
        });

        console.log(`Player ${playerName} joined room ${roomCode}`);
      } catch (err) {
        console.error("Error joining room:", err);
        socket.emit(WS_EVENTS.ERROR, {
          message: "Error al unir-se a la sala.",
        });
      }
    });

    socket.on(WS_EVENTS.START_GAME, async (payload) => {
      try {
        const { roomCode } = payload;
        const game = await storage.getGameByCode(roomCode);

        if (game) {
          await storage.updateGameState(game.id, "playing");
          const players = await storage.getPlayersInGame(game.id);
          const enrichedPlayers = players.map((p) => {
            const mem = findInMap(socketMap, p.id);
            return {
              ...p,
              questionIndex: mem ? mem.questionIndex : 0,
              money: mem ? mem.money : p.money,
              status: mem ? mem.status : p.status,
            };
          });

          const gameState = {
            roomCode: game.code,
            hostName: game.hostName,
            maxPlayers: game.maxPlayers,
            players: enrichedPlayers,
            status: "playing",
            currentQuestionIndex: 0,
          };

          io.to(game.id.toString()).emit(WS_EVENTS.GAME_STARTED);
          io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, gameState);
          console.log(`Game started for room ${roomCode}`);
        }
      } catch (err) {
        console.error("Error starting game:", err);
      }
    });

    socket.on(WS_EVENTS.SUBMIT_ANSWER, async (payload) => {
      try {
        const { money, questionIndex, status } = payload;
        const socketInfo = socketMap.get(socket.id);

        if (!socketInfo) {
          console.error("Socket not found in map:", socket.id);
          return;
        }

        const { gameId, playerId } = socketInfo;
        const newStatus = status || (money === 0 ? "eliminated" : "active");

        socketMap.set(socket.id, {
          ...socketInfo,
          money,
          questionIndex,
          status: newStatus,
        });

        await storage.updatePlayer(playerId, {
          money,
          status: newStatus,
          lastAnswer: payload.distribution || {},
        });

        io.to(gameId.toString()).emit(WS_EVENTS.PLAYER_UPDATE, {
          socketId: socket.id,
          money,
          questionIndex,
          status: newStatus,
          name: socketInfo.name,
        });

        console.log(
          `Player ${socketInfo.name}: money=${money}, q=${questionIndex}, status=${newStatus}`,
        );
      } catch (err) {
        console.error("Error submitting answer:", err);
      }
    });

    socket.on("disconnect", () => {
      const info = socketMap.get(socket.id);
      if (info) {
        console.log(`Player disconnected: ${info.name}`);
        socketMap.delete(socket.id);
      }
    });
  });

  return httpServer;
}

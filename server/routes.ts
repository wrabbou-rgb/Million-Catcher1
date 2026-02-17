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

    // --- 1. CREAR SALA (Recibe el maxPlayers del Host) ---
    socket.on(WS_EVENTS.CREATE_ROOM, async (payload) => {
      try {
        const code = generateRoomCode();
        // Guardamos el límite real en la base de datos
        const game = await storage.createGame(
          payload.hostName,
          payload.maxPlayers || 20,
          code,
        );
        socket.join(game.id.toString());

        const initialState = {
          roomCode: code,
          hostName: payload.hostName,
          maxPlayers: payload.maxPlayers || 20,
          players: [],
          status: "waiting",
          currentQuestionIndex: 0,
        };

        socket.emit(WS_EVENTS.STATE_UPDATE, initialState);
        console.log(
          `Sala creada: ${code} con límite de ${payload.maxPlayers} jugadores`,
        );
      } catch (err) {
        console.error("Error al crear sala:", err);
        socket.emit(WS_EVENTS.ERROR, { message: "Error al crear la sala" });
      }
    });

    // --- 2. UNIR-SE A LA SALA (Verifica el límite de jugadores) ---
    socket.on(WS_EVENTS.JOIN_ROOM, async (payload) => {
      try {
        const { roomCode, playerName } = payload;
        const game = await storage.getGameByCode(roomCode.toUpperCase().trim());

        if (!game) {
          socket.emit(WS_EVENTS.ERROR, { message: "Codi incorrecte." });
          return;
        }

        // VALIDACIÓN DE LÍMITE:
        const existingPlayers = await storage.getPlayersInGame(game.id);
        if (existingPlayers.length >= game.maxPlayers) {
          socket.emit(WS_EVENTS.ERROR, {
            message: "La sala està plena. Límite alcanzado.",
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
            socketId: p.socketId,
          };
        });

        io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, {
          roomCode: game.code,
          players: enrichedPlayers,
          status: game.state,
          currentQuestionIndex: game.currentQuestionIndex,
        });
      } catch (err) {
        console.error("Error al unirse:", err);
      }
    });

    // --- 3. COMENÇAR EL JOC ---
    socket.on(WS_EVENTS.START_GAME, async (payload) => {
      try {
        const { roomCode } = payload;
        const game = await storage.getGameByCode(roomCode);

        if (game) {
          await storage.updateGameState(game.id, "playing");
          io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, {
            status: "playing",
            currentQuestionIndex: 0,
          });
        }
      } catch (err) {
        console.error("Error al empezar:", err);
      }
    });

    // --- 4. ACTUALIZACIÓN DE RANKING (Directo) ---
    socket.on("PLAYER_NEXT", async (payload) => {
      try {
        const info = socketMap.get(socket.id);
        if (info) {
          info.money = payload.money;
          info.questionIndex = payload.index;
          info.status = payload.status;

          await storage.updatePlayer(info.playerId, {
            money: info.money,
            status: info.status,
          });

          // Re-enviamos la lista a todos para que el ranking se mueva
          const playersInRoom = Array.from(socketMap.values())
            .filter((p) => p.gameId === info.gameId)
            .map((p) => ({
              ...p,
              socketId: Array.from(socketMap.keys()).find(
                (k) => socketMap.get(k) === p,
              ),
            }));

          io.to(info.gameId.toString()).emit(WS_EVENTS.STATE_UPDATE, {
            players: playersInRoom,
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // --- 5. AVANCE GLOBAL (Botón del Host) ---
    socket.on("NEXT_QUESTION_GLOBAL", async () => {
      try {
        const info = Array.from(socketMap.values()).find((i) =>
          socket.rooms.has(i.gameId.toString()),
        );
        if (info) {
          // Avanzamos el índice en el estado global de la sala
          io.to(info.gameId.toString()).emit(WS_EVENTS.STATE_UPDATE, {
            currentQuestionIndex: info.questionIndex + 1,
            status: "playing",
          });
        }
      } catch (err) {
        console.error("Error en avance global:", err);
      }
    });

    socket.on("disconnect", () => {
      socketMap.delete(socket.id);
    });
  });

  return httpServer;
}

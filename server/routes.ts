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
    cors: { origin: "*", methods: ["GET", "POST"] },
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

    // --- 1. CREAR SALA (Corregido para evitar buffering) ---
    socket.on(WS_EVENTS.CREATE_ROOM, async (payload) => {
      try {
        const code = generateRoomCode();
        // Usamos storage.createGame que sí existe
        const game = await storage.createGame(
          payload.hostName,
          payload.maxPlayers || 20,
          code,
        );

        socket.join(game.id.toString());

        const initialState = {
          roomCode: code,
          hostName: payload.hostName,
          players: [],
          status: "waiting",
          currentQuestionIndex: 0,
        };

        // ENVIAR RESPUESTA INMEDIATA
        socket.emit(WS_EVENTS.STATE_UPDATE, initialState);
        console.log(`Sala creada con éxito: ${code}`);
      } catch (err) {
        console.error("Error crítico al crear sala:", err);
        socket.emit(WS_EVENTS.ERROR, {
          message: "No s'ha pogut crear la sala",
        });
      }
    });

    // --- 2. UNIR-SE A LA SALA ---
    socket.on(WS_EVENTS.JOIN_ROOM, async (payload) => {
      try {
        const { roomCode, playerName } = payload;
        const game = await storage.getGameByCode(roomCode.toUpperCase().trim());

        if (!game) {
          socket.emit(WS_EVENTS.ERROR, { message: "Codi incorrecte." });
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

    // --- 3. COMENÇAR JOC ---
    socket.on(WS_EVENTS.START_GAME, async (payload) => {
      try {
        const game = await storage.getGameByCode(payload.roomCode);
        if (game) {
          await storage.updateGameState(game.id, "playing");
          io.to(game.id.toString()).emit(WS_EVENTS.STATE_UPDATE, {
            status: "playing",
            currentQuestionIndex: 0,
          });
        }
      } catch (err) {
        console.error("Error al empezar juego:", err);
      }
    });

    // --- 4. ACTUALITZACIÓ RANKING ---
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

          const playersInRoom = Array.from(socketMap.values()).filter(
            (p) => p.gameId === info.gameId,
          );

          io.to(info.gameId.toString()).emit(WS_EVENTS.STATE_UPDATE, {
            players: playersInRoom,
          });
        }
      } catch (err) {
        console.error(err);
      }
    });

    // --- 5. AVANÇAR PREGUNTA (Corregido para eliminar errores de image_3e7640.png) ---
    socket.on("NEXT_QUESTION_GLOBAL", async () => {
      try {
        // Buscamos info de la sala a través del socket actual
        const info = Array.from(socketMap.values()).find((i) =>
          socket.rooms.has(i.gameId.toString()),
        );
        if (info) {
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

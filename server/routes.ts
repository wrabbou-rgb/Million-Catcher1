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
      socket.join(code);
      socket.emit("STATE_UPDATE", {
        roomCode: code,
        status: "waiting",
        players: [],
        currentQuestionIndex: 0,
        totalQuestions: questions.length,
        questions,
      });
    });

    socket.on("JOIN_ROOM", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;

      // ✅ FIX RECONEXIÓN: buscar si ya existe un jugador con ese nombre
      const existingPlayer = await storage.getPlayerByNameInGame(
        game.id,
        data.playerName,
      );
      if (existingPlayer) {
        // Actualizar su socketId al nuevo (reconexión)
        await storage.updatePlayerSocketId(existingPlayer.id, socket.id);
      } else {
        // Jugador nuevo
        await storage.addPlayer(game.id, socket.id, data.playerName);
      }

      socket.join(data.roomCode);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", {
        roomCode: game.code,
        status: game.state,
        players,
        currentQuestionIndex: game.currentQuestionIndex,
        currentQuestion:
          game.state === "playing"
            ? questions[game.currentQuestionIndex]
            : null,
        totalQuestions: questions.length,
        questions,
      });
    });

    socket.on("START_GAME", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.updateGameState(game.id, "playing");
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", {
        status: "playing",
        players,
        currentQuestionIndex: 0,
        currentQuestion: questions[0],
        totalQuestions: questions.length,
        questions,
      });
    });

    socket.on("UPDATE_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.updatePlayerBet(game.id, socket.id, data.bet);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", { players });
    });

    // ✅ FIX CONFIRMAR: emitimos el estado completo para que el host vea el badge
    socket.on("CONFIRM_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.confirmPlayerBet(game.id, socket.id);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", {
        players,
        currentQuestionIndex: game.currentQuestionIndex,
        currentQuestion: questions[game.currentQuestionIndex],
      });
    });

    // ✅ FIX ELIMINADOS: REVEAL_RESULT guarda status en DB y lo emite correctamente
    socket.on("REVEAL_RESULT", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      const players = await storage.getPlayersInGame(game.id);
      const currentQuestion = questions[game.currentQuestionIndex];
      const correctLetter =
        currentQuestion.options.find((o: any) => o.isCorrect)?.letter ?? "";
      if (!correctLetter) return;

      // Actualizamos dinero Y status en DB para cada jugador
      await Promise.all(
        players.map(async (player: any) => {
          const betOnCorrect = player.currentBet?.[correctLetter] || 0;
          await storage.updatePlayerMoney(
            game.id,
            player.socketId,
            betOnCorrect,
          );
        }),
      );

      // Leemos los jugadores actualizados desde DB (con status correcto)
      const updatedPlayers = await storage.getPlayersInGame(game.id);

      io.to(data.roomCode).emit("STATE_UPDATE", {
        players: updatedPlayers,
        revealedAnswer: correctLetter,
      });
    });

    socket.on("NEXT_QUESTION", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      const nextIndex = game.currentQuestionIndex + 1;

      if (nextIndex >= questions.length) {
        await storage.updateGameState(game.id, "finished");
        const players = await storage.getPlayersInGame(game.id);
        io.to(data.roomCode).emit("STATE_UPDATE", {
          status: "finished",
          players,
        });
        return;
      }

      await storage.updateQuestionIndex(game.id, nextIndex);
      const players = await storage.getPlayersInGame(game.id);
      // Solo reseteamos apuestas de jugadores activos
      await Promise.all(
        players
          .filter((p: any) => p.status === "active")
          .map((p: any) => storage.resetPlayerBet(game.id, p.socketId)),
      );
      const freshPlayers = await storage.getPlayersInGame(game.id);

      io.to(data.roomCode).emit("STATE_UPDATE", {
        currentQuestionIndex: nextIndex,
        currentQuestion: questions[nextIndex],
        totalQuestions: questions.length,
        players: freshPlayers,
        revealedAnswer: null,
      });
    });
  });

  return httpServer;
}

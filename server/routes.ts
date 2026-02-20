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
      await storage.addPlayer(game.id, socket.id, data.playerName);
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

    // Jugador actualiza apuesta — solo guardamos, NO emitimos a toda la sala
    // para evitar interferencias con muchos jugadores simultáneos
    socket.on("UPDATE_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.updatePlayerBet(game.id, socket.id, data.bet);
      // Solo confirmamos al jugador que envió, no broadcast
      socket.emit("BET_SAVED", { ok: true });
    });

    // Jugador confirma — guardamos y emitimos solo players a toda la sala
    socket.on("CONFIRM_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.confirmPlayerBet(game.id, socket.id);
      const players = await storage.getPlayersInGame(game.id);
      // Emitimos solo los jugadores con su estado de confirmación
      io.to(data.roomCode).emit("PLAYERS_UPDATE", { players });
    });

    // ✅ REVEAL: siempre permitido, si alguien no ha apostado pierde todo
    socket.on("REVEAL_RESULT", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      const players = await storage.getPlayersInGame(game.id);
      const currentQuestion = questions[game.currentQuestionIndex];
      const correctLetter =
        currentQuestion.options.find((o: any) => o.isCorrect)?.letter ?? "";
      if (!correctLetter) return;

      // Para cada jugador: conserva solo lo apostado en la correcta
      // Si no apostó nada (currentBet vacío o no confirmó), pierde todo
      const updatedPlayers = await Promise.all(
        players
          .filter((p: any) => p.status === "active")
          .map(async (player: any) => {
            const bet = player.currentBet || {};
            const totalBet = Object.values(bet).reduce(
              (a: number, b: any) => a + b,
              0,
            );
            const betOnCorrect = bet[correctLetter] || 0;
            // Si no apostó nada, pierde todo el dinero
            const newMoney = totalBet === 0 ? 0 : betOnCorrect;
            await storage.updatePlayerMoney(game.id, player.socketId, newMoney);
            return {
              ...player,
              money: newMoney,
              status: newMoney <= 0 ? "eliminated" : "active",
            };
          }),
      );

      // Añadimos los eliminados sin cambios
      const eliminatedPlayers = players.filter(
        (p: any) => p.status === "eliminated",
      );
      const allPlayers = [...updatedPlayers, ...eliminatedPlayers];

      io.to(data.roomCode).emit("STATE_UPDATE", {
        players: allPlayers,
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
      // Solo reseteamos apuestas de activos
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

    // Host elimina manualmente a un jugador
    socket.on("ELIMINATE_PLAYER", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.updatePlayerMoney(game.id, data.socketId, 0);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", { players });
    });
  });

  return httpServer;
}

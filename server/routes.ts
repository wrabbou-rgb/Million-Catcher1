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
        currentQuestion: questions[0], // ✅ AÑADIDO
        totalQuestions: questions.length,
        questions,
      });
    });

    // Jugador actualiza su apuesta → todos en la sala ven el balance
    socket.on("UPDATE_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.updatePlayerBet(game.id, socket.id, data.bet);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", { players });
    });

    // Jugador confirma su apuesta
    socket.on("CONFIRM_BET", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      await storage.confirmPlayerBet(game.id, socket.id);
      const players = await storage.getPlayersInGame(game.id);
      io.to(data.roomCode).emit("STATE_UPDATE", { players });
    });

    // Host revela la respuesta correcta
    socket.on("REVEAL_RESULT", async (data) => {
      const game = await storage.getGameByCode(data.roomCode);
      if (!game) return;
      const players = await storage.getPlayersInGame(game.id);
      const currentQuestion = questions[game.currentQuestionIndex];
      const correctLetter = currentQuestion.options.find(
        (o: any) => o.isCorrect,
      )?.letter;

      const updatedPlayers = await Promise.all(
        players.map(async (player: any) => {
          const betOnCorrect = player.currentBet?.[correctLetter] || 0;
          const newMoney = betOnCorrect;
          await storage.updatePlayerMoney(game.id, player.socketId, newMoney);
          return {
            ...player,
            money: newMoney,
            status: newMoney <= 0 ? "eliminated" : "active",
          };
        }),
      );

      io.to(data.roomCode).emit("STATE_UPDATE", {
        players: updatedPlayers,
        revealedAnswer: correctLetter,
      });
    });

    // Host pasa a la siguiente pregunta
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
      await Promise.all(
        players.map((p: any) => storage.resetPlayerBet(game.id, p.socketId)),
      );
      const freshPlayers = await storage.getPlayersInGame(game.id);

      io.to(data.roomCode).emit("STATE_UPDATE", {
        currentQuestionIndex: nextIndex,
        currentQuestion: questions[nextIndex], // ✅ AÑADIDO
        totalQuestions: questions.length,
        players: freshPlayers,
        revealedAnswer: null,
      });
    });
  });

  return httpServer;
}

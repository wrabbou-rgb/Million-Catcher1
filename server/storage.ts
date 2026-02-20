import { db } from "./db";
import {
  games,
  players,
  type Game,
  type Player,
  type Question,
} from "@shared/schema";
import { eq, and } from "drizzle-orm";

export interface IStorage {
  createGame(hostName: string, maxPlayers: number, code: string): Promise<Game>;
  getGameByCode(code: string): Promise<Game | undefined>;
  updateGameState(gameId: number, state: string): Promise<void>;
  updateGameQuestion(gameId: number, index: number): Promise<void>;
  updateQuestionIndex(gameId: number, index: number): Promise<void>;
  addPlayer(gameId: number, socketId: string, name: string): Promise<Player>;
  getPlayerBySocketId(socketId: string): Promise<Player | undefined>;
  updatePlayer(playerId: number, updates: Partial<Player>): Promise<Player>;
  getPlayersInGame(gameId: number): Promise<Player[]>;
  getQuestions(): Promise<Question[]>;
  updatePlayerBet(
    gameId: number,
    socketId: string,
    bet: Record<string, number>,
  ): Promise<void>;
  confirmPlayerBet(gameId: number, socketId: string): Promise<void>;
  updatePlayerMoney(
    gameId: number,
    socketId: string,
    money: number,
  ): Promise<void>;
  resetPlayerBet(gameId: number, socketId: string): Promise<void>;
  removePlayer(gameId: number, socketId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async createGame(
    hostName: string,
    maxPlayers: number,
    code: string,
  ): Promise<Game> {
    const [game] = await db
      .insert(games)
      .values({
        hostName,
        maxPlayers,
        code,
        state: "waiting",
        currentQuestionIndex: 0,
      })
      .returning();
    return game;
  }

  async getGameByCode(code: string): Promise<Game | undefined> {
    const [game] = await db.select().from(games).where(eq(games.code, code));
    return game;
  }

  async updateGameState(gameId: number, state: string): Promise<void> {
    await db.update(games).set({ state }).where(eq(games.id, gameId));
  }

  async updateGameQuestion(gameId: number, index: number): Promise<void> {
    await db
      .update(games)
      .set({ currentQuestionIndex: index })
      .where(eq(games.id, gameId));
  }

  async updateQuestionIndex(gameId: number, index: number): Promise<void> {
    await db
      .update(games)
      .set({ currentQuestionIndex: index })
      .where(eq(games.id, gameId));
  }

  async addPlayer(
    gameId: number,
    socketId: string,
    name: string,
  ): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values({ gameId, socketId, name, money: 1000000, status: "active" })
      .returning();
    return player;
  }

  async getPlayerBySocketId(socketId: string): Promise<Player | undefined> {
    const [player] = await db
      .select()
      .from(players)
      .where(eq(players.socketId, socketId));
    return player;
  }

  async updatePlayer(
    playerId: number,
    updates: Partial<Player>,
  ): Promise<Player> {
    const safeUpdates: any = {};
    if (updates.money !== undefined) safeUpdates.money = updates.money;
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.lastAnswer !== undefined)
      safeUpdates.lastAnswer = updates.lastAnswer;

    if (Object.keys(safeUpdates).length === 0) {
      const [player] = await db
        .select()
        .from(players)
        .where(eq(players.id, playerId));
      return player;
    }

    const [player] = await db
      .update(players)
      .set(safeUpdates)
      .where(eq(players.id, playerId))
      .returning();
    return player;
  }

  async getPlayersInGame(gameId: number): Promise<Player[]> {
    return await db.select().from(players).where(eq(players.gameId, gameId));
  }

  async getQuestions(): Promise<Question[]> {
    return QUESTIONS_DATA;
  }

  async updatePlayerBet(
    gameId: number,
    socketId: string,
    bet: Record<string, number>,
  ): Promise<void> {
    await db
      .update(players)
      .set({ currentBet: bet })
      .where(and(eq(players.gameId, gameId), eq(players.socketId, socketId)));
  }

  async confirmPlayerBet(gameId: number, socketId: string): Promise<void> {
    await db
      .update(players)
      .set({ hasConfirmed: true })
      .where(and(eq(players.gameId, gameId), eq(players.socketId, socketId)));
  }

  async updatePlayerMoney(
    gameId: number,
    socketId: string,
    money: number,
  ): Promise<void> {
    await db
      .update(players)
      .set({ money, status: money <= 0 ? "eliminated" : "active" })
      .where(and(eq(players.gameId, gameId), eq(players.socketId, socketId)));
  }

  async resetPlayerBet(gameId: number, socketId: string): Promise<void> {
    await db
      .update(players)
      .set({ currentBet: {}, hasConfirmed: false })
      .where(and(eq(players.gameId, gameId), eq(players.socketId, socketId)));
  }

  // ✅ NUEVO: elimina completamente al jugador de la BD
  async removePlayer(gameId: number, socketId: string): Promise<void> {
    await db
      .delete(players)
      .where(and(eq(players.gameId, gameId), eq(players.socketId, socketId)));
  }
}

export const storage = new DatabaseStorage();

const QUESTIONS_DATA: Question[] = [
  {
    id: 1,
    order: 1,
    type: "normal",
    maxOptionsToBet: 3,
    text: "Quin any va inventar Nikolaus August Otto el primer motor de quatre temps amb compressió?",
    options: [
      { letter: "A", id: "A", text: "1876", isCorrect: true },
      { letter: "B", id: "B", text: "1878", isCorrect: false },
      { letter: "C", id: "C", text: "1880", isCorrect: false },
      { letter: "D", id: "D", text: "1885", isCorrect: false },
    ],
  },
  {
    id: 2,
    order: 2,
    type: "normal",
    maxOptionsToBet: 3,
    text: "Quin és el component que transforma el moviment rectilini del pistó en moviment rotatiu?",
    options: [
      { letter: "A", id: "A", text: "La biela", isCorrect: false },
      { letter: "B", id: "B", text: "El cigonyal", isCorrect: true },
      { letter: "C", id: "C", text: "El volant d'inèrcia", isCorrect: false },
      { letter: "D", id: "D", text: "L'arbre de lleves", isCorrect: false },
    ],
  },
  {
    id: 3,
    order: 3,
    type: "normal",
    maxOptionsToBet: 3,
    text: "En quin ordre es produeixen les fases del motor de 4 temps?",
    options: [
      {
        letter: "A",
        id: "A",
        text: "Compressió, admissió, explosió, escapament",
        isCorrect: false,
      },
      {
        letter: "B",
        id: "B",
        text: "Admissió, compressió, explosió, escapament",
        isCorrect: true,
      },
      {
        letter: "C",
        id: "C",
        text: "Explosió, compressió, admissió, escapament",
        isCorrect: false,
      },
      {
        letter: "D",
        id: "D",
        text: "Admissió, explosió, compressió, escapament",
        isCorrect: false,
      },
    ],
  },
  {
    id: 4,
    order: 4,
    type: "reduced",
    maxOptionsToBet: 2,
    text: "Quina temperatura pot superar la combustió dins del cilindre?",
    options: [
      { letter: "A", id: "A", text: "500 °C", isCorrect: false },
      { letter: "B", id: "B", text: "1.000 °C", isCorrect: false },
      { letter: "C", id: "C", text: "2.000 °C", isCorrect: true },
    ],
  },
  {
    id: 5,
    order: 5,
    type: "reduced",
    maxOptionsToBet: 2,
    text: "Què és el càrter en un motor Otto?",
    options: [
      {
        letter: "A",
        id: "A",
        text: "La peça que tanca els cilindres per dalt",
        isCorrect: false,
      },
      {
        letter: "B",
        id: "B",
        text: "El dipòsit d'oli a la part inferior del motor",
        isCorrect: true,
      },
      {
        letter: "C",
        id: "C",
        text: "L'element que uneix el pistó amb el cigonyal",
        isCorrect: false,
      },
    ],
  },
  {
    id: 6,
    order: 6,
    type: "reduced",
    maxOptionsToBet: 2,
    text: "Segons el Segon Principi de la Termodinàmica aplicat al motor:",
    options: [
      {
        letter: "A",
        id: "A",
        text: "Tota la calor es converteix en treball útil",
        isCorrect: false,
      },
      {
        letter: "B",
        id: "B",
        text: "Part de l'energia s'ha de cedir a un focus fred",
        isCorrect: true,
      },
      {
        letter: "C",
        id: "C",
        text: "No es pot generar energia mecànica des de calor",
        isCorrect: false,
      },
    ],
  },
  {
    id: 7,
    order: 7,
    type: "reduced",
    maxOptionsToBet: 2,
    text: "Quina diferència principal té el motor de 2 temps respecte al de 4 temps?",
    options: [
      {
        letter: "A",
        id: "A",
        text: "Té vàlvules més complexes",
        isCorrect: false,
      },
      {
        letter: "B",
        id: "B",
        text: "Completa el cicle en una volta de cigonyal",
        isCorrect: true,
      },
      { letter: "C", id: "C", text: "És menys contaminant", isCorrect: false },
    ],
  },
  {
    id: 8,
    order: 8,
    type: "final",
    maxOptionsToBet: 1,
    text: "Quina és la temperatura de treball òptima d'un motor Otto?",
    options: [
      { letter: "A", id: "A", text: "90 °C", isCorrect: true },
      { letter: "B", id: "B", text: "150 °C", isCorrect: false },
    ],
  },
];

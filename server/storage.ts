import { db } from "./db";
import {
  games,
  players,
  questions,
  type Game,
  type Player,
  type Question,
} from "@shared/schema";
import { eq } from "drizzle-orm";

export interface IStorage {
  createGame(hostName: string, maxPlayers: number, code: string): Promise<Game>;
  getGameByCode(code: string): Promise<Game | undefined>;
  updateGameState(gameId: number, state: string): Promise<void>;
  addPlayer(gameId: number, socketId: string, name: string): Promise<Player>;
  getPlayerBySocketId(socketId: string): Promise<Player | undefined>;
  updatePlayer(playerId: number, updates: Partial<Player>): Promise<Player>;
  getPlayersInGame(gameId: number): Promise<Player[]>;
  getQuestions(): Promise<Question[]>;
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

  async addPlayer(
    gameId: number,
    socketId: string,
    name: string,
  ): Promise<Player> {
    const [player] = await db
      .insert(players)
      .values({
        gameId,
        socketId,
        name,
        money: 1000000,
        status: "active",
        questionIndex: 0,
      })
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
    // Only update fields that exist in the DB
    const safeUpdates: any = {};
    if (updates.money !== undefined) safeUpdates.money = updates.money;
    if (updates.status !== undefined) safeUpdates.status = updates.status;
    if (updates.questionIndex !== undefined)
      safeUpdates.questionIndex = updates.questionIndex;
    if (updates.lastAnswer !== undefined)
      safeUpdates.lastAnswer = updates.lastAnswer;

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
}

export const storage = new DatabaseStorage();

const QUESTIONS_DATA: Question[] = [
  {
    id: 1,
    order: 1,
    type: "normal",
    text: "Quin any va inventar Nikolaus August Otto el primer motor de quatre temps amb compressió?",
    options: [
      { id: "A", text: "1876", isCorrect: true },
      { id: "B", text: "1878", isCorrect: false },
      { id: "C", text: "1880", isCorrect: false },
      { id: "D", text: "1885", isCorrect: false },
    ],
  },
  {
    id: 2,
    order: 2,
    type: "normal",
    text: "Quin és el component que transforma el moviment rectilini del pistó en moviment rotatiu?",
    options: [
      { id: "A", text: "La biela", isCorrect: false },
      { id: "B", text: "El cigonyal", isCorrect: true },
      { id: "C", text: "El volant d'inèrcia", isCorrect: false },
      { id: "D", text: "L'arbre de lleves", isCorrect: false },
    ],
  },
  {
    id: 3,
    order: 3,
    type: "normal",
    text: "En quin ordre es produeixen les fases del motor de 4 temps?",
    options: [
      {
        id: "A",
        text: "Compressió, admissió, explosió, escapament",
        isCorrect: false,
      },
      {
        id: "B",
        text: "Admissió, compressió, explosió, escapament",
        isCorrect: true,
      },
      {
        id: "C",
        text: "Explosió, compressió, admissió, escapament",
        isCorrect: false,
      },
      {
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
    text: "Quina temperatura pot superar la combustió dins del cilindre?",
    options: [
      { id: "A", text: "500 °C", isCorrect: false },
      { id: "B", text: "1.000 °C", isCorrect: false },
      { id: "C", text: "2.000 °C", isCorrect: true },
    ],
  },
  {
    id: 5,
    order: 5,
    type: "reduced",
    text: "Què és el càrter en un motor Otto?",
    options: [
      {
        id: "A",
        text: "La peça que tanca els cilindres per dalt",
        isCorrect: false,
      },
      {
        id: "B",
        text: "El dipòsit d'oli a la part inferior del motor",
        isCorrect: true,
      },
      {
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
    text: "Segons el Segon Principi de la Termodinàmica aplicat al motor:",
    options: [
      {
        id: "A",
        text: "Tota la calor es converteix en treball útil",
        isCorrect: false,
      },
      {
        id: "B",
        text: "Part de l'energia s'ha de cedir a un focus fred",
        isCorrect: true,
      },
      {
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
    text: "Quina diferència principal té el motor de 2 temps respecte al de 4 temps?",
    options: [
      { id: "A", text: "Té vàlvules més complexes", isCorrect: false },
      {
        id: "B",
        text: "Completa el cicle en una volta de cigonyal",
        isCorrect: true,
      },
      { id: "C", text: "És menys contaminant", isCorrect: false },
    ],
  },
  {
    id: 8,
    order: 8,
    type: "final",
    text: "Quina és la temperatura de treball òptima d'un motor Otto?",
    options: [
      { id: "A", text: "90 °C", isCorrect: true },
      { id: "B", text: "150 °C", isCorrect: false },
    ],
  },
];

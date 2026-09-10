import { TENDENCIES, type Answer, type Results, type Tendency } from "./types";

export interface SessionRecord {
  userId: number;
  questionIds: number[];
  answers: Answer[];
  currentIndex: number;
}

interface SessionRow {
  user_id: number;
  questions_json: string;
  answers_json: string;
  current_index: number;
}

function isTendency(value: unknown): value is Tendency {
  return TENDENCIES.some((tendency) => tendency === value);
}

function parseQuestionIds(value: string): number[] {
  const parsed: unknown = JSON.parse(value);
  if (!Array.isArray(parsed) || !parsed.every((item) => Number.isInteger(item))) {
    throw new Error("Stored session has invalid question IDs");
  }
  return parsed;
}

function parseAnswers(value: string): Answer[] {
  const parsed: unknown = JSON.parse(value);
  if (
    !Array.isArray(parsed) ||
    !parsed.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        "tendency" in item &&
        isTendency(item.tendency) &&
        "isYes" in item &&
        typeof item.isYes === "boolean",
    )
  ) {
    throw new Error("Stored session has invalid answers");
  }
  return parsed;
}

export class BotRepository {
  constructor(private readonly database: D1Database) {}

  async claimUpdate(updateId: number): Promise<boolean> {
    const result = await this.database
      .prepare(
        "INSERT OR IGNORE INTO processed_updates (update_id, processed_at) VALUES (?, ?)",
      )
      .bind(updateId, new Date().toISOString())
      .run();
    return result.meta.changes === 1;
  }

  async getSession(userId: number): Promise<SessionRecord | null> {
    const row = await this.database
      .prepare(
        "SELECT user_id, questions_json, answers_json, current_index FROM sessions WHERE user_id = ?",
      )
      .bind(userId)
      .first<SessionRow>();
    if (row === null) return null;
    return {
      userId: row.user_id,
      questionIds: parseQuestionIds(row.questions_json),
      answers: parseAnswers(row.answers_json),
      currentIndex: row.current_index,
    };
  }

  async saveSession(session: SessionRecord): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO sessions
          (user_id, questions_json, answers_json, current_index, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(user_id) DO UPDATE SET
          questions_json = excluded.questions_json,
          answers_json = excluded.answers_json,
          current_index = excluded.current_index,
          updated_at = excluded.updated_at`,
      )
      .bind(
        session.userId,
        JSON.stringify(session.questionIds),
        JSON.stringify(session.answers),
        session.currentIndex,
        new Date().toISOString(),
      )
      .run();
  }

  async deleteSession(userId: number): Promise<void> {
    await this.database.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
  }

  async saveResult(userId: number, results: Results, dominant: string): Promise<void> {
    await this.database
      .prepare(
        `INSERT INTO results
          (user_id, upholder, obliger, questioner, rebel, dominant, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        userId,
        results.upholder,
        results.obliger,
        results.questioner,
        results.rebel,
        dominant,
        new Date().toISOString(),
      )
      .run();
  }
}

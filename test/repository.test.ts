import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { BotRepository } from "../src/repository";

async function freshRepository(): Promise<BotRepository> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM results"),
    env.DB.prepare("DELETE FROM processed_updates"),
  ]);
  return new BotRepository(env.DB);
}

describe("BotRepository", () => {
  let repository: BotRepository;

  beforeEach(async () => {
    repository = await freshRepository();
  });

  it("round-trips and deletes an active test session", async () => {
    await repository.saveSession({
      userId: 42,
      questionIds: [16, 2, 8],
      answers: [{ tendency: "questioner", isYes: true }],
      currentIndex: 1,
    });

    expect(await repository.getSession(42)).toEqual({
      userId: 42,
      questionIds: [16, 2, 8],
      answers: [{ tendency: "questioner", isYes: true }],
      currentIndex: 1,
    });

    await repository.deleteSession(42);
    expect(await repository.getSession(42)).toBeNull();
  });

  it("claims each Telegram update only once", async () => {
    expect(await repository.claimUpdate(9001)).toBe(true);
    expect(await repository.claimUpdate(9001)).toBe(false);
  });

  it("persists a completed result", async () => {
    await repository.saveResult(42, {
      upholder: 40,
      obliger: 10,
      questioner: 30,
      rebel: 20,
    }, "Виконавець (Upholder)");

    const row = await env.DB.prepare(
      "SELECT user_id, upholder, obliger, questioner, rebel, dominant FROM results",
    ).first();
    expect(row).toEqual({
      user_id: 42,
      upholder: 40,
      obliger: 10,
      questioner: 30,
      rebel: 20,
      dominant: "Виконавець (Upholder)",
    });
  });
});

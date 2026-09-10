import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { processUpdate } from "../src/bot";
import { BotRepository } from "../src/repository";
import type { InlineKeyboard, TelegramClientPort, TelegramUpdate } from "../src/telegram";

type TelegramCall =
  | { method: "sendMessage"; chatId: number; text: string; keyboard?: InlineKeyboard }
  | { method: "editMessageText"; chatId: number; messageId: number; text: string; keyboard?: InlineKeyboard }
  | { method: "answerCallbackQuery"; callbackId: string; text?: string };

class RecordingTelegram implements TelegramClientPort {
  readonly calls: TelegramCall[] = [];

  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    this.calls.push({ method: "sendMessage", chatId, text, ...(keyboard ? { keyboard } : {}) });
  }

  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<void> {
    this.calls.push({
      method: "editMessageText",
      chatId,
      messageId,
      text,
      ...(keyboard ? { keyboard } : {}),
    });
  }

  async answerCallbackQuery(callbackId: string, text?: string): Promise<void> {
    this.calls.push({
      method: "answerCallbackQuery",
      callbackId,
      ...(text ? { text } : {}),
    });
  }
}

function messageUpdate(text: string): TelegramUpdate {
  return {
    update_id: 1,
    message: {
      message_id: 10,
      from: { id: 42 },
      chat: { id: 42 },
      text,
    },
  };
}

function callbackUpdate(data: string, id = "callback-1"): TelegramUpdate {
  return {
    update_id: 2,
    callback_query: {
      id,
      from: { id: 42 },
      data,
      message: {
        message_id: 10,
        chat: { id: 42 },
      },
    },
  };
}

async function cleanRepository(): Promise<BotRepository> {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions"),
    env.DB.prepare("DELETE FROM results"),
    env.DB.prepare("DELETE FROM processed_updates"),
  ]);
  return new BotRepository(env.DB);
}

describe("processUpdate", () => {
  let repository: BotRepository;
  let telegram: RecordingTelegram;

  beforeEach(async () => {
    repository = await cleanRepository();
    telegram = new RecordingTelegram();
  });

  it("starts with the Ukrainian welcome and start button", async () => {
    await processUpdate(messageUpdate("/start"), { repository, telegram, random: () => 0 });

    expect(telegram.calls).toHaveLength(1);
    expect(telegram.calls[0]).toMatchObject({
      method: "sendMessage",
      chatId: 42,
      text: expect.stringContaining("Чотири тенденції"),
      keyboard: [[{ text: "🚀 Почати тест", callback_data: "start_test" }]],
    });
  });

  it("starts a durable 22-question session from the button", async () => {
    await processUpdate(callbackUpdate("start_test"), {
      repository,
      telegram,
      random: () => 0,
    });

    expect((await repository.getSession(42))?.questionIds).toHaveLength(22);
    expect((await repository.getSession(42))?.currentIndex).toBe(0);
    expect(telegram.calls).toEqual([
      { method: "answerCallbackQuery", callbackId: "callback-1" },
      expect.objectContaining({
        method: "editMessageText",
        text: expect.stringContaining("Питання 1/22"),
      }),
    ]);
  });

  it("rejects an answer button when no active session exists", async () => {
    await processUpdate(callbackUpdate("ans:yes"), { repository, telegram });

    expect(telegram.calls).toEqual([
      {
        method: "answerCallbackQuery",
        callbackId: "callback-1",
        text: "Це питання вже неактуальне.",
      },
    ]);
  });

  it("finishes the test, stores the result, and clears the session", async () => {
    await repository.saveSession({
      userId: 42,
      questionIds: Array.from({ length: 22 }, (_, index) => index + 1),
      answers: Array.from({ length: 21 }, () => ({ tendency: "upholder" as const, isYes: false })),
      currentIndex: 21,
    });

    await processUpdate(callbackUpdate("ans:yes", "final-answer"), { repository, telegram });

    expect(await repository.getSession(42)).toBeNull();
    const resultCount = await env.DB.prepare("SELECT COUNT(*) AS count FROM results").first<{ count: number }>();
    expect(resultCount?.count).toBe(1);
    expect(telegram.calls).toContainEqual(
      expect.objectContaining({
        method: "sendMessage",
        text: expect.stringContaining("Тест завершено"),
        keyboard: [[{ text: "🔁 Пройти ще раз", callback_data: "repeat_test" }]],
      }),
    );
  });

  it("cancels and clears an active session", async () => {
    await repository.saveSession({
      userId: 42,
      questionIds: [16],
      answers: [],
      currentIndex: 0,
    });

    await processUpdate(messageUpdate("/cancel"), { repository, telegram });

    expect(await repository.getSession(42)).toBeNull();
    expect(telegram.calls[0]).toMatchObject({
      method: "sendMessage",
      text: "Тест скасовано. Напиши /start, щоб почати знову.",
    });
  });
});

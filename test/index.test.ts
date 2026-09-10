import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";

import { handleRequest } from "../src/index";
import type { InlineKeyboard, TelegramClientPort } from "../src/telegram";

class CountingTelegram implements TelegramClientPort {
  calls = 0;
  shouldFail = false;

  async sendMessage(_chatId: number, _text: string, _keyboard?: InlineKeyboard): Promise<void> {
    this.calls += 1;
    if (this.shouldFail) throw new Error("Telegram unavailable");
  }

  async editMessageText(
    _chatId: number,
    _messageId: number,
    _text: string,
    _keyboard?: InlineKeyboard,
  ): Promise<void> {
    this.calls += 1;
    if (this.shouldFail) throw new Error("Telegram unavailable");
  }

  async answerCallbackQuery(_callbackId: string, _text?: string): Promise<void> {
    this.calls += 1;
    if (this.shouldFail) throw new Error("Telegram unavailable");
  }
}

function webhookRequest(body: string, secret = "test-secret"): Request {
  return new Request("https://bot.example/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-telegram-bot-api-secret-token": secret,
    },
    body,
  });
}

const START_UPDATE = JSON.stringify({
  update_id: 101,
  message: {
    message_id: 1,
    from: { id: 42 },
    chat: { id: 42 },
    text: "/start",
  },
});

describe("Worker HTTP handler", () => {
  beforeEach(async () => {
    await env.DB.batch([
      env.DB.prepare("DELETE FROM sessions"),
      env.DB.prepare("DELETE FROM results"),
      env.DB.prepare("DELETE FROM processed_updates"),
    ]);
  });

  it("provides a small health endpoint", async () => {
    const response = await handleRequest(new Request("https://bot.example/health"), env);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("rejects a webhook with the wrong Telegram secret", async () => {
    const response = await handleRequest(webhookRequest(START_UPDATE, "wrong"), env);

    expect(response.status).toBe(401);
  });

  it("rejects malformed Telegram updates", async () => {
    const invalidJson = await handleRequest(webhookRequest("{"), env);
    const invalidShape = await handleRequest(
      webhookRequest(JSON.stringify({ update_id: "101" })),
      env,
    );

    expect(invalidJson.status).toBe(400);
    expect(invalidShape.status).toBe(400);
  });

  it("rejects oversized webhook bodies before parsing", async () => {
    const response = await handleRequest(webhookRequest("x".repeat(262_145)), env);

    expect(response.status).toBe(413);
  });

  it("processes a valid Telegram update only once", async () => {
    const telegram = new CountingTelegram();

    const first = await handleRequest(webhookRequest(START_UPDATE), env, { telegram });
    const duplicate = await handleRequest(webhookRequest(START_UPDATE), env, { telegram });

    expect(first.status).toBe(200);
    expect(duplicate.status).toBe(200);
    expect(telegram.calls).toBe(1);
  });

  it("releases a failed update so Telegram can retry it", async () => {
    const failingTelegram = new CountingTelegram();
    failingTelegram.shouldFail = true;
    const failed = await handleRequest(webhookRequest(START_UPDATE), env, {
      telegram: failingTelegram,
    });

    const workingTelegram = new CountingTelegram();
    const retried = await handleRequest(webhookRequest(START_UPDATE), env, {
      telegram: workingTelegram,
    });

    expect(failed.status).toBe(500);
    expect(retried.status).toBe(200);
    expect(workingTelegram.calls).toBe(1);
  });
});

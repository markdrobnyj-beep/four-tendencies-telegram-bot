import { afterEach, describe, expect, it, vi } from "vitest";

import { TelegramClient } from "../src/telegram";

describe("TelegramClient", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the default fetch without binding it to the client", async () => {
    vi.stubGlobal(
      "fetch",
      function (this: unknown): Promise<Response> {
        if (this !== undefined) throw new TypeError("Illegal invocation");
        return Promise.resolve(Response.json({ ok: true, result: {} }));
      },
    );
    const client = new TelegramClient("test-token");

    await expect(client.sendMessage(42, "Привіт")).resolves.toBeUndefined();
  });

  it("sends a Telegram Bot API request with the expected payload", async () => {
    let requestedUrl = "";
    let requestedBody = "";
    const client = new TelegramClient("test-token", async (input, init) => {
      requestedUrl = String(input);
      requestedBody = String(init?.body);
      return Response.json({ ok: true, result: {} });
    });

    await client.sendMessage(42, "Привіт", [[{ text: "Так", callback_data: "yes" }]]);

    expect(requestedUrl).toBe("https://api.telegram.org/bottest-token/sendMessage");
    expect(JSON.parse(requestedBody)).toEqual({
      chat_id: 42,
      text: "Привіт",
      reply_markup: { inline_keyboard: [[{ text: "Так", callback_data: "yes" }]] },
    });
  });

  it("surfaces a Telegram API rejection", async () => {
    const client = new TelegramClient("test-token", async () =>
      Response.json({ ok: false, description: "Bad Request" }),
    );

    await expect(client.sendMessage(42, "Привіт")).rejects.toThrow("Bad Request");
  });
});

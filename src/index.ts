import { processUpdate } from "./bot";
import { BotRepository } from "./repository";
import {
  TelegramClient,
  type TelegramCallbackQuery,
  type TelegramClientPort,
  type TelegramMessage,
  type TelegramUpdate,
} from "./telegram";

const MAX_WEBHOOK_BYTES = 256 * 1024;
const SECRET_HEADER = "x-telegram-bot-api-secret-token";

interface HandlerOverrides {
  telegram: TelegramClientPort;
}

class PayloadTooLargeError extends Error {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value);
}

function parseUser(value: unknown): { id: number } | null {
  if (!isRecord(value) || !isInteger(value.id)) return null;
  return { id: value.id };
}

function parseChat(value: unknown): { id: number } | null {
  if (!isRecord(value) || !isInteger(value.id)) return null;
  return { id: value.id };
}

function parseMessage(value: unknown): TelegramMessage | null {
  if (!isRecord(value) || !isInteger(value.message_id)) return null;
  const chat = parseChat(value.chat);
  if (!chat) return null;
  const from = value.from === undefined ? undefined : parseUser(value.from);
  if (value.from !== undefined && !from) return null;
  if (value.text !== undefined && typeof value.text !== "string") return null;
  return {
    message_id: value.message_id,
    chat,
    ...(from ? { from } : {}),
    ...(typeof value.text === "string" ? { text: value.text } : {}),
  };
}

function parseCallbackQuery(value: unknown): TelegramCallbackQuery | null {
  if (!isRecord(value) || typeof value.id !== "string") return null;
  const from = parseUser(value.from);
  if (!from) return null;
  const message = value.message === undefined ? undefined : parseMessage(value.message);
  if (value.message !== undefined && !message) return null;
  if (value.data !== undefined && typeof value.data !== "string") return null;
  return {
    id: value.id,
    from,
    ...(message ? { message } : {}),
    ...(typeof value.data === "string" ? { data: value.data } : {}),
  };
}

function parseTelegramUpdate(value: unknown): TelegramUpdate | null {
  if (!isRecord(value) || !isInteger(value.update_id)) return null;
  const message = value.message === undefined ? undefined : parseMessage(value.message);
  if (value.message !== undefined && !message) return null;
  const callback =
    value.callback_query === undefined
      ? undefined
      : parseCallbackQuery(value.callback_query);
  if (value.callback_query !== undefined && !callback) return null;
  return {
    update_id: value.update_id,
    ...(message ? { message } : {}),
    ...(callback ? { callback_query: callback } : {}),
  };
}

async function readJson(request: Request): Promise<unknown> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_WEBHOOK_BYTES) {
    throw new PayloadTooLargeError();
  }
  if (!request.body) return null;

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_WEBHOOK_BYTES) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

function secretsMatch(received: string | null, expected: string): boolean {
  if (received === null) return false;
  const encoder = new TextEncoder();
  const receivedBytes = encoder.encode(received);
  const expectedBytes = encoder.encode(expected);
  if (receivedBytes.byteLength !== expectedBytes.byteLength) return false;
  return crypto.subtle.timingSafeEqual(receivedBytes, expectedBytes);
}

export async function handleRequest(
  request: Request,
  env: Cloudflare.Env,
  overrides?: HandlerOverrides,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === "/health" && request.method === "GET") {
    return Response.json({ status: "ok" });
  }
  if (pathname !== "/webhook") return new Response("Not found", { status: 404 });
  if (request.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { allow: "POST" },
    });
  }
  const receivedSecret = request.headers.get(SECRET_HEADER);
  if (!secretsMatch(receivedSecret, env.WEBHOOK_SECRET)) {
    console.warn(
      JSON.stringify({
        event: "webhook_unauthorized",
        receivedSecretLength: receivedSecret?.length ?? 0,
        expectedSecretLength: env.WEBHOOK_SECRET?.length ?? 0,
      }),
    );
    return new Response("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await readJson(request);
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return new Response("Payload too large", { status: 413 });
    }
    return new Response("Invalid JSON", { status: 400 });
  }
  const update = parseTelegramUpdate(body);
  if (!update) return new Response("Invalid update", { status: 400 });

  const repository = new BotRepository(env.DB);
  let claimed = false;
  try {
    claimed = await repository.claimUpdate(update.update_id);
    if (!claimed) return new Response("OK");
    const telegram = overrides?.telegram ?? new TelegramClient(env.BOT_TOKEN);
    await processUpdate(update, { repository, telegram });
    return new Response("OK");
  } catch (error) {
    if (claimed) {
      try {
        await repository.releaseUpdate(update.update_id);
      } catch (releaseError) {
        console.error(
          JSON.stringify({
            event: "update_release_failed",
            updateId: update.update_id,
            error: String(releaseError),
          }),
        );
      }
    }
    console.error(
      JSON.stringify({
        event: "update_processing_failed",
        updateId: update.update_id,
        error: String(error),
      }),
    );
    return new Response("Processing failed", { status: 500 });
  }
}

export default {
  fetch(request: Request, env: Cloudflare.Env): Promise<Response> {
    return handleRequest(request, env);
  },
} satisfies ExportedHandler<Cloudflare.Env>;

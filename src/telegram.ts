export interface InlineKeyboardButton {
  text: string;
  callback_data: string;
}

export type InlineKeyboard = InlineKeyboardButton[][];

export interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  from?: { id: number };
  text?: string;
}

export interface TelegramCallbackQuery {
  id: string;
  from: { id: number };
  data?: string;
  message?: TelegramMessage;
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramMessage;
  callback_query?: TelegramCallbackQuery;
}

export interface TelegramClientPort {
  sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void>;
  editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<void>;
  answerCallbackQuery(callbackId: string, text?: string): Promise<void>;
}

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function keyboardPayload(keyboard?: InlineKeyboard): Record<string, unknown> {
  return keyboard ? { reply_markup: { inline_keyboard: keyboard } } : {};
}

export class TelegramClient implements TelegramClientPort {
  constructor(
    private readonly token: string,
    private readonly fetcher: Fetcher = fetch,
  ) {}

  async sendMessage(chatId: number, text: string, keyboard?: InlineKeyboard): Promise<void> {
    await this.call("sendMessage", {
      chat_id: chatId,
      text,
      ...keyboardPayload(keyboard),
    });
  }

  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    keyboard?: InlineKeyboard,
  ): Promise<void> {
    await this.call("editMessageText", {
      chat_id: chatId,
      message_id: messageId,
      text,
      ...keyboardPayload(keyboard),
    });
  }

  async answerCallbackQuery(callbackId: string, text?: string): Promise<void> {
    await this.call("answerCallbackQuery", {
      callback_query_id: callbackId,
      ...(text ? { text } : {}),
    });
  }

  private async call(method: string, payload: Record<string, unknown>): Promise<void> {
    const response = await this.fetcher(
      `https://api.telegram.org/bot${this.token}/${method}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
    const body: unknown = await response.json();
    if (
      !response.ok ||
      typeof body !== "object" ||
      body === null ||
      !("ok" in body) ||
      body.ok !== true
    ) {
      const description =
        typeof body === "object" &&
        body !== null &&
        "description" in body &&
        typeof body.description === "string"
          ? body.description
          : `HTTP ${response.status}`;
      throw new Error(`Telegram API ${method} failed: ${description}`);
    }
  }
}

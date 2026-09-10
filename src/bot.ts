import { QUESTIONS } from "./questions";
import { BotRepository, type SessionRecord } from "./repository";
import { calculateResults, findDominantTendencies } from "./scoring";
import type { InlineKeyboard, TelegramClientPort, TelegramUpdate } from "./telegram";
import { CONCLUSIONS, TENDENCY_NAMES, TEXTS } from "./texts";

export const CALLBACKS = {
  start: "start_test",
  repeat: "repeat_test",
  yes: "ans:yes",
  no: "ans:no",
} as const;

export interface BotDependencies {
  repository: BotRepository;
  telegram: TelegramClientPort;
  random?: () => number;
}

const startKeyboard: InlineKeyboard = [
  [{ text: TEXTS.buttons.start, callback_data: CALLBACKS.start }],
];
const answerKeyboard: InlineKeyboard = [
  [{ text: TEXTS.buttons.yes, callback_data: CALLBACKS.yes }],
  [{ text: TEXTS.buttons.no, callback_data: CALLBACKS.no }],
];
const repeatKeyboard: InlineKeyboard = [
  [{ text: TEXTS.buttons.repeat, callback_data: CALLBACKS.repeat }],
];

function secureRandom(): number {
  const value = crypto.getRandomValues(new Uint32Array(1))[0];
  return value === undefined ? 0 : value / 2 ** 32;
}

function shuffledQuestionIds(random: () => number): number[] {
  const ids = QUESTIONS.map((question) => question.id);
  for (let index = ids.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    const value = ids[index];
    const replacement = ids[target];
    if (value === undefined || replacement === undefined) continue;
    ids[index] = replacement;
    ids[target] = value;
  }
  return ids;
}

function getQuestion(questionId: number) {
  return QUESTIONS.find((question) => question.id === questionId);
}

function questionText(session: SessionRecord): string {
  const questionId = session.questionIds[session.currentIndex];
  const question = questionId === undefined ? undefined : getQuestion(questionId);
  if (!question) throw new Error("Session references an unknown question");
  return `Питання ${session.currentIndex + 1}/22\n\n${question.text}`;
}

function resultText(results: ReturnType<typeof calculateResults>, dominant: keyof typeof CONCLUSIONS, tied: boolean): string {
  return [
    TEXTS.completion,
    TEXTS.normalization,
    "",
    `🟦 Виконавець: ${results.upholder}%`,
    `🟩 Обов'язковий: ${results.obliger}%`,
    `🟨 Скептик: ${results.questioner}%`,
    `🟥 Бунтар: ${results.rebel}%`,
    "",
    `👉 Твоя провідна тенденція: ${TENDENCY_NAMES[dominant]}`,
    "",
    CONCLUSIONS[dominant],
    ...(tied ? ["", TEXTS.tie] : []),
    "",
    TEXTS.repeat,
  ].join("\n");
}

async function startTest(
  userId: number,
  chatId: number,
  messageId: number,
  callbackId: string,
  dependencies: BotDependencies,
): Promise<void> {
  const session: SessionRecord = {
    userId,
    questionIds: shuffledQuestionIds(dependencies.random ?? secureRandom),
    answers: [],
    currentIndex: 0,
  };
  await dependencies.telegram.answerCallbackQuery(callbackId);
  await dependencies.repository.saveSession(session);
  try {
    await dependencies.telegram.editMessageText(
      chatId,
      messageId,
      questionText(session),
      answerKeyboard,
    );
  } catch (error) {
    console.warn(JSON.stringify({ event: "telegram_edit_failed", error: String(error) }));
    await dependencies.telegram.sendMessage(chatId, questionText(session), answerKeyboard);
  }
}

async function answerQuestion(
  isYes: boolean,
  userId: number,
  chatId: number,
  messageId: number,
  callbackId: string,
  dependencies: BotDependencies,
): Promise<void> {
  const session = await dependencies.repository.getSession(userId);
  const questionId = session?.questionIds[session.currentIndex];
  const question = questionId === undefined ? undefined : getQuestion(questionId);
  if (!session || !question) {
    await dependencies.telegram.answerCallbackQuery(callbackId, TEXTS.stale);
    return;
  }

  const answers = [...session.answers, { tendency: question.tendency, isYes }];
  const nextIndex = session.currentIndex + 1;
  await dependencies.telegram.answerCallbackQuery(callbackId);
  if (nextIndex < session.questionIds.length) {
    const advanced = { ...session, answers, currentIndex: nextIndex };
    await dependencies.repository.saveSession(advanced);
    await dependencies.telegram.editMessageText(
      chatId,
      messageId,
      questionText(advanced),
      answerKeyboard,
    );
    return;
  }

  const results = calculateResults(answers);
  const leaders = findDominantTendencies(results);
  const dominant = leaders[0];
  if (!dominant) throw new Error("Could not determine a dominant tendency");
  try {
    await dependencies.repository.saveResult(userId, results, TENDENCY_NAMES[dominant]);
  } catch (error) {
    console.warn(JSON.stringify({ event: "result_save_failed", userId, error: String(error) }));
  }
  await dependencies.repository.deleteSession(userId);
  await dependencies.telegram.sendMessage(
    chatId,
    resultText(results, dominant, leaders.length > 1),
    repeatKeyboard,
  );
}

function commandOf(text: string): string {
  return text.trim().split(/\s+/, 1)[0]?.split("@", 1)[0]?.toLowerCase() ?? "";
}

export async function processUpdate(
  update: TelegramUpdate,
  dependencies: BotDependencies,
): Promise<void> {
  const message = update.message;
  if (message?.text && message.from) {
    const command = commandOf(message.text);
    if (command === "/start") {
      await dependencies.repository.deleteSession(message.from.id);
      await dependencies.telegram.sendMessage(message.chat.id, TEXTS.start, startKeyboard);
    } else if (command === "/help") {
      await dependencies.telegram.sendMessage(message.chat.id, TEXTS.help);
    } else if (command === "/cancel") {
      await dependencies.repository.deleteSession(message.from.id);
      await dependencies.telegram.sendMessage(message.chat.id, TEXTS.cancel);
    }
    return;
  }

  const callback = update.callback_query;
  if (!callback?.data || !callback.message) return;
  const { id: callbackId, from, data } = callback;
  const { id: chatId } = callback.message.chat;
  const messageId = callback.message.message_id;
  if (data === CALLBACKS.start || data === CALLBACKS.repeat) {
    await startTest(from.id, chatId, messageId, callbackId, dependencies);
  } else if (data === CALLBACKS.yes || data === CALLBACKS.no) {
    await answerQuestion(
      data === CALLBACKS.yes,
      from.id,
      chatId,
      messageId,
      callbackId,
      dependencies,
    );
  }
}

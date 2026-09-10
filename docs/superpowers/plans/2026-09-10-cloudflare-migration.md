# Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Run the current Four Tendencies Telegram bot on Cloudflare Workers with durable D1 state and Telegram webhooks.

**Architecture:** A TypeScript Worker receives authenticated Telegram webhook updates, routes commands and callback queries through pure bot logic, persists sessions/results/idempotency records in D1, and calls the Telegram Bot API through a small client. Existing Python files remain as historical source until the Worker is verified.

**Tech Stack:** TypeScript, Cloudflare Workers, D1, Wrangler 4, Vitest, `@cloudflare/vitest-pool-workers`

**Spec:** `docs/superpowers/specs/2026-09-10-cloudflare-migration-design.md`

## Global Constraints

- Preserve all current Ukrainian user-facing copy and the updated question 16.
- Use Telegram webhooks; do not run long polling on Cloudflare.
- Store active sessions, results, and processed update IDs in D1.
- Store `BOT_TOKEN` and `WEBHOOK_SECRET` only as Cloudflare secrets.
- Validate webhook authentication and Telegram payloads before processing.
- Enable Workers observability and use a current compatibility date.
- Existing Oracle SQLite history is unavailable and will not be migrated.

---

### Task 1: Worker project, scoring, and content

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `wrangler.jsonc`
- Create: `src/types.ts`
- Create: `src/questions.ts`
- Create: `src/texts.ts`
- Create: `src/scoring.ts`
- Test: `test/scoring.test.ts`
- Test: `test/content.test.ts`

**Interfaces:**
- Produces: `Question`, `Tendency`, `Results`, `QUESTIONS`, `TENDENCY_TOTALS`, `TEXTS`, `TENDENCY_NAMES`, `CONCLUSIONS`.
- Produces: `calculateResults(answers: Answer[]): Results` and `findDominantTendencies(results: Results): Tendency[]`.

- [ ] **Step 1: Add failing scoring and content tests**

Assert that the four scores total exactly 100, no positive answers yield 25% each, ties retain tendency order, there are exactly 22 questions, and question 16 equals `Я не приймаю правила заради правил.`.

- [ ] **Step 2: Verify the tests fail**

Run: `npm test -- --run test/scoring.test.ts test/content.test.ts`
Expected: FAIL because the TypeScript modules do not exist.

- [ ] **Step 3: Add the Worker toolchain and port pure data/logic**

Use ES modules and strict TypeScript. Port the question list, visible Ukrainian copy, tendency names, conclusions, and largest-remainder scoring without changing behavior. Configure Wrangler with `main: src/index.ts`, `compatibility_date: 2026-09-10`, `nodejs_compat`, observability, and a D1 binding named `DB`.

- [ ] **Step 4: Verify pure tests and types pass**

Run: `npm test -- --run test/scoring.test.ts test/content.test.ts`
Expected: PASS.

Run: `npm run typecheck`
Expected: PASS with no diagnostics.

- [ ] **Step 5: Commit**

Run: `git add package.json package-lock.json tsconfig.json vitest.config.ts wrangler.jsonc src/types.ts src/questions.ts src/texts.ts src/scoring.ts test/scoring.test.ts test/content.test.ts`

Run: `git commit -m "feat: port Four Tendencies core to Workers"`

### Task 2: D1 session and result repository

**Files:**
- Create: `migrations/0001_initial.sql`
- Create: `src/repository.ts`
- Test: `test/repository.test.ts`

**Interfaces:**
- Consumes: `Answer`, `Results`, and `Tendency` from `src/types.ts`.
- Produces: `SessionRecord` and `BotRepository` with `claimUpdate`, `getSession`, `saveSession`, `deleteSession`, and `saveResult`.

- [ ] **Step 1: Add failing D1 repository tests**

Cover creating/loading/updating/deleting a session, saving a completed result, and rejecting a duplicate Telegram `update_id` on the second `claimUpdate` call.

- [ ] **Step 2: Verify repository tests fail**

Run: `npm test -- --run test/repository.test.ts`
Expected: FAIL because the migration and repository are absent.

- [ ] **Step 3: Add schema and repository**

Create `sessions(user_id PRIMARY KEY, questions_json, answers_json, current_index, updated_at)`, `results(id PRIMARY KEY, user_id, four integer scores, dominant, created_at)`, and `processed_updates(update_id PRIMARY KEY, processed_at)`. Use prepared statements and JSON parsing with explicit validation.

- [ ] **Step 4: Verify repository tests pass**

Run: `npm test -- --run test/repository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add migrations/0001_initial.sql src/repository.ts test/repository.test.ts`

Run: `git commit -m "feat: persist Telegram sessions in D1"`

### Task 3: Telegram API client and bot flow

**Files:**
- Create: `src/telegram.ts`
- Create: `src/bot.ts`
- Test: `test/bot.test.ts`

**Interfaces:**
- Consumes: `BotRepository`, questions, texts, and scoring interfaces.
- Produces: `TelegramClient` with `sendMessage`, `editMessageText`, and `answerCallbackQuery`.
- Produces: `processUpdate(update: TelegramUpdate, dependencies: BotDependencies): Promise<void>`.

- [ ] **Step 1: Add failing bot-flow tests**

Use a recording Telegram client and local D1 repository. Cover `/start`, `/help`, `/cancel`, start button, yes/no progression, stale callbacks, repeat button, completion result persistence, and question 16 appearing during a deterministic question order.

- [ ] **Step 2: Verify bot-flow tests fail**

Run: `npm test -- --run test/bot.test.ts`
Expected: FAIL because the Telegram client and bot processor do not exist.

- [ ] **Step 3: Implement minimal Telegram client and flow**

Parse only the message and callback-query shapes the bot uses. Shuffle question IDs with an injected random source for deterministic tests. Preserve callback values `start_test`, `repeat_test`, `ans:yes`, and `ans:no`. Store progress after each answer and delete the session after completion or `/cancel`.

- [ ] **Step 4: Verify bot-flow tests pass**

Run: `npm test -- --run test/bot.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add src/telegram.ts src/bot.ts test/bot.test.ts`

Run: `git commit -m "feat: handle Telegram test flow in Worker"`

### Task 4: Authenticated webhook Worker

**Files:**
- Create: `src/index.ts`
- Create: `test/index.test.ts`
- Modify: `wrangler.jsonc`

**Interfaces:**
- Consumes: `processUpdate`, `TelegramClient`, `BotRepository`, `Env.DB`, `Env.BOT_TOKEN`, and `Env.WEBHOOK_SECRET`.
- Produces: Worker routes `GET /health` and `POST /webhook`.

- [ ] **Step 1: Add failing request tests**

Assert `GET /health` returns 200, other routes return 404, invalid methods return 405, missing/wrong Telegram secret returns 401, malformed JSON returns 400, duplicate updates return 200 without repeated Telegram calls, and valid updates are processed once.

- [ ] **Step 2: Verify request tests fail**

Run: `npm test -- --run test/index.test.ts`
Expected: FAIL because the Worker entry point does not exist.

- [ ] **Step 3: Implement Worker entry point**

Use `crypto.subtle.timingSafeEqual` on encoded secret bytes after checking equal lengths. Parse a bounded JSON request, claim the update in D1, await `processUpdate`, return explicit statuses, and write structured error logs without secrets or full update bodies.

- [ ] **Step 4: Generate binding types and verify**

Run: `npx wrangler types`
Expected: generated binding types include `DB`, `BOT_TOKEN`, and `WEBHOOK_SECRET`.

Run: `npm test -- --run`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npx wrangler deploy --dry-run`
Expected: successful bundle and config validation.

- [ ] **Step 5: Commit**

Run: `git add src/index.ts test/index.test.ts wrangler.jsonc worker-configuration.d.ts`

Run: `git commit -m "feat: expose authenticated Telegram webhook"`

### Task 5: Documentation and production deployment

**Files:**
- Modify: `README.md`
- Modify: `.env.example`

**Interfaces:**
- Consumes: deployed Worker URL and D1 binding.
- Produces: a production Worker URL and registered Telegram webhook.

- [ ] **Step 1: Update deployment documentation**

Document local tests, D1 migrations, secrets, deploy, webhook registration, health checks, and rollback. Replace Python long-polling instructions with the Worker workflow while noting the legacy Python source.

- [ ] **Step 2: Run final local verification**

Run: `npm test -- --run`
Expected: all tests PASS.

Run: `npm run typecheck`
Expected: PASS.

Run: `npx wrangler deploy --dry-run`
Expected: PASS.

- [ ] **Step 3: Provision and deploy Cloudflare resources**

Create a D1 database named `four-tendencies-bot`, update its generated ID in `wrangler.jsonc`, apply migrations remotely, set `BOT_TOKEN` and a cryptographically random `WEBHOOK_SECRET`, and deploy the Worker.

- [ ] **Step 4: Register and verify Telegram webhook**

Call Telegram `setWebhook` with the deployed `/webhook` URL and matching `secret_token`, then verify `getWebhookInfo` reports the new URL and no error. Confirm `/health` returns 200 and run `/start` plus a complete 22-answer test in Telegram-compatible API checks.

- [ ] **Step 5: Commit and push**

Run: `git add README.md .env.example wrangler.jsonc`

Run: `git commit -m "docs: document Cloudflare deployment"`

Run: `git push origin main`

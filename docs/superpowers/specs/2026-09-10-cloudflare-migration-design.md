# Cloudflare Migration Design

## Goal

Move the existing Ukrainian Four Tendencies Telegram bot from an inaccessible
Oracle Cloud server to Cloudflare while preserving its current user-visible
behavior and the updated wording of question 16.

## Architecture

The bot will run as a TypeScript Cloudflare Worker. Telegram will deliver each
update to the Worker through a webhook, replacing the current Python long
polling process. The Worker will call the Telegram Bot API directly over HTTPS.

Cloudflare D1 will store active test sessions and completed results. Bot tokens
and webhook credentials will be Cloudflare secrets and will never be committed.

## Components

- `src/index.ts`: HTTP entry point, health check, webhook authentication, update
  deduplication, and routing.
- `src/telegram.ts`: typed Telegram API client and response helpers.
- `src/bot.ts`: `/start`, `/help`, `/cancel`, start/repeat buttons, and answer
  processing.
- `src/questions.ts`, `src/texts.ts`, `src/scoring.ts`: the existing question
  bank, Ukrainian copy, and scoring logic ported without product changes.
- `migrations/`: D1 tables for sessions, completed results, and processed update
  IDs.
- `wrangler.jsonc`: Worker, D1, observability, and compatibility configuration.

## Data Flow

1. Telegram sends an update to the Worker webhook.
2. The Worker verifies Telegram's secret-token header and validates the payload.
3. A unique Telegram update ID is recorded in D1. Duplicate deliveries return
   success without repeating side effects.
4. Commands and button callbacks load or update the user's D1 session.
5. Telegram messages are sent or edited through the Bot API.
6. On the final answer, the Worker calculates the result, stores it in D1,
   clears the session, and displays the existing conclusion and repeat button.

## Storage

Each active session is keyed by Telegram user ID and contains the shuffled
question order, current index, answers, and update timestamp. Completed results
retain the same fields currently written to SQLite. Existing Oracle data cannot
be migrated without access to that server, so Cloudflare history starts empty.

## Security and Reliability

- Store `BOT_TOKEN` and `WEBHOOK_SECRET` with Wrangler secrets.
- Reject requests whose webhook secret is absent or invalid.
- Accept only POST requests on the private webhook path; expose a minimal health
  response separately.
- Use prepared D1 statements and validate Telegram payload fields.
- Deduplicate Telegram retries and log failures without exposing secrets.
- Enable Cloudflare Workers observability.

## Testing

Unit tests will cover scoring, Ukrainian content, commands, callback progress,
stale callbacks, duplicate updates, and invalid webhook authentication.
Integration-style Worker tests will use a local D1 database and a fake Telegram
API endpoint. Before deployment, TypeScript checks, the full test suite,
Wrangler configuration validation, and a deployment dry run must pass.

## Deployment

Create the D1 database, apply migrations, set Cloudflare secrets, deploy the
Worker, and register its URL with Telegram via `setWebhook`. Verify the health
endpoint, webhook status, `/start`, one full test run, and the updated question
16. After the Cloudflare version is confirmed, Telegram will send updates only
to the new webhook, so the inaccessible Oracle polling process will no longer
receive them.

## Out of Scope

- Recovering or shutting down the Oracle server.
- Migrating historical SQLite data from Oracle.
- Changing questions, scoring, conclusions, or the visible interaction beyond
  the already committed wording of question 16.

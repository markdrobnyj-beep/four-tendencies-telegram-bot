# Telegram Bot “Four Tendencies”

A Ukrainian-language Telegram bot that runs a “Four Tendencies” self-reflection
test. It presents 22 statements, calculates four normalized results that add up
to 100%, and describes the leading tendency. This is not a medical or
psychological diagnosis.

## Features

- 22-question Ukrainian-language test.
- Four result categories with exact 100% total after rounding.
- Durable sessions and result history in Cloudflare D1.
- `/start`, `/help`, and `/cancel` commands plus inline keyboards.
- Repeat-test flow after a result is shown.

## Production architecture

The production bot runs as a TypeScript Cloudflare Worker. Telegram sends
updates to `/webhook`; active sessions, completed results, and update
deduplication are stored in Cloudflare D1. `/health` is the public health check.

The original Python/aiogram implementation remains in the repository as legacy
source, but it is not used by the Cloudflare deployment.

## Local development

Requirements: Node.js 22+, npm, a Cloudflare account, and a Telegram token from
[@BotFather](https://t.me/BotFather).

```bash
npm install
copy .dev.vars.example .dev.vars
npm test -- --run
npm run typecheck
npx wrangler dev
```

Set `BOT_TOKEN` and `WEBHOOK_SECRET` in `.dev.vars`. Never commit that file.

## Cloudflare deployment

```bash
npx wrangler d1 create four-tendencies-bot
npx wrangler d1 migrations apply four-tendencies-bot --remote
npx wrangler secret put BOT_TOKEN
npx wrangler secret put WEBHOOK_SECRET
npx wrangler deploy
```

Register the deployed `https://<worker>.workers.dev/webhook` URL through
Telegram's `setWebhook` method and pass the same value as `secret_token` that
was stored in `WEBHOOK_SECRET`. Confirm the deployment with `/health` and
Telegram's `getWebhookInfo` method.

## Tests

```bash
npm test -- --run
npm run typecheck
npx wrangler deploy --dry-run
```

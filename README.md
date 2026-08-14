# Telegram Bot “Four Tendencies”

The bot runs the Ukrainian-language “Four Tendencies” test: 22 statements, four normalized results that add up to 100%, and a description of the leading tendency. This is not a medical or psychological diagnosis.

## Installation

Python 3.11 or newer is required.

```bash
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env
```

Open `.env` and enter the bot token.

To get a token, open [@BotFather](https://t.me/BotFather) in Telegram, run `/newbot`, and choose the bot's name and username. BotFather will send you a token—store it in `.env` and never publish it.

## Running

```bash
python bot.py
```

User messages and bot buttons are in Ukrainian. Result history is stored in `data/results.sqlite3`. The MVP uses `MemoryStorage`; replace it with `RedisStorage` in production.

## Tests

```bash
pytest tests/
```

# Telegram Bot “Four Tendencies”

A Ukrainian-language Telegram bot that runs a “Four Tendencies” self-reflection
test. It presents 22 statements, calculates four normalized results that add up
to 100%, and describes the leading tendency. This is not a medical or
psychological diagnosis.

## Features

- 22-question Ukrainian-language test.
- Four result categories with exact 100% total after rounding.
- Saved result history in SQLite at `data/results.sqlite3`.
- `/start`, `/help`, and `/cancel` commands plus inline keyboards.
- Repeat-test flow after a result is shown.

## Requirements

- Python 3.11 or newer
- A Telegram bot token from [@BotFather](https://t.me/BotFather)

## Installation

Create a virtual environment and install the dependencies:

```bash
python -m venv .venv
```

Activate the environment with the command for your platform:

```powershell
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
```

```bash
# macOS/Linux
source .venv/bin/activate
```

Install the dependencies after activating the environment:

```bash
python -m pip install -r requirements.txt
```

Copy `.env.example` to `.env` and add the token:

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

```bash
# macOS/Linux
cp .env.example .env
```

Never publish the token or commit `.env`.

## Running

```bash
python bot.py
```

User messages and bot buttons are in Ukrainian. The MVP uses aiogram's
`MemoryStorage`; replace it with `RedisStorage` for a multi-process production
deployment.

## Tests

```bash
python -m pytest tests/
```

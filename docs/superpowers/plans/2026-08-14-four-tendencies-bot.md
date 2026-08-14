# Four Tendencies Telegram Bot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Ukrainian-language Telegram bot that runs the 22-question Four Tendencies test and reports independent percentage scores.

**Architecture:** Keep the question bank, Ukrainian copy, FSM states, keyboards, handlers, scoring, and optional SQLite persistence in separate modules. The bot uses aiogram 3 routers with `MemoryStorage`, while scoring remains a pure synchronous service covered by pytest.

**Tech Stack:** Python 3.11+, aiogram 3.x, python-dotenv, aiosqlite, pytest, standard logging.

## Global Constraints

- All user-facing bot text and buttons are Ukrainian.
- Use `MemoryStorage`; document replacing it with `RedisStorage` in production.
- Shuffle the 22 questions once per session and persist the order in FSM data.
- Edit the current question message between answers, with a send-new-message fallback.
- Percentages use each tendency's own question total and ordinary half-up rounding; they are independent and need not sum to 100%.
- Ignore stale callbacks safely and support `/start`, `/help`, `/cancel`, and repeat testing.

### Task 1: Scoring foundation

**Files:**
- Create: `tests/test_scoring.py`
- Create: `data/questions.py`
- Create: `services/scoring.py`

- [ ] Write tests for full score, half-up rounding, and tied leaders.
- [ ] Run `pytest tests/test_scoring.py -q` and confirm the missing implementation fails.
- [ ] Add the question model, 22-question bank, totals, and pure scoring helpers.
- [ ] Run the scoring tests and confirm they pass.

### Task 2: Bot modules

**Files:**
- Create: `config.py`, `bot.py`, `.env.example`, `requirements.txt`
- Create: `texts/ua_texts.py`, `states/test_states.py`, `keyboards/inline.py`
- Create: `handlers/start.py`, `handlers/test_flow.py`, `handlers/results.py`
- Create: package `__init__.py` files

- [ ] Add Ukrainian copy, inline keyboards, FSM states, and constants.
- [ ] Implement `/start`, `/help`, `/cancel`, test progression, stale callback handling, and result display.
- [ ] Register one router per handler module in `bot.py`.

### Task 3: Persistence and documentation

**Files:**
- Create: `storage/db.py`
- Create: `README.md`

- [ ] Add a best-effort SQLite results table and insert function.
- [ ] Document setup, BotFather token creation, launch, tests, and Ukrainian UI.

### Task 4: Verification

- [ ] Run `pytest tests/ -q`.
- [ ] Run `python -m compileall -q .`.
- [ ] Inspect the final file tree and verify every Definition of Done item.

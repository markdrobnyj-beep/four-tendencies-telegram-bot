"""Best-effort SQLite storage for completed test results."""

from datetime import datetime, timezone
from pathlib import Path

import aiosqlite

DB_PATH = Path("data/results.sqlite3")


async def init_db(db_path: Path = DB_PATH) -> None:
    """Create the results table if it does not exist."""
    db_path.parent.mkdir(parents=True, exist_ok=True)
    async with aiosqlite.connect(db_path) as database:
        await database.execute(
            """CREATE TABLE IF NOT EXISTS results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                upholder INTEGER NOT NULL,
                obliger INTEGER NOT NULL,
                questioner INTEGER NOT NULL,
                rebel INTEGER NOT NULL,
                dominant TEXT NOT NULL,
                created_at TEXT NOT NULL
            )"""
        )
        await database.commit()


async def save_result(
    user_id: int, results: dict[str, int], dominant: str, db_path: Path = DB_PATH
) -> None:
    """Persist one completed result in SQLite."""
    await init_db(db_path)
    async with aiosqlite.connect(db_path) as database:
        await database.execute(
            """INSERT INTO results
               (user_id, upholder, obliger, questioner, rebel, dominant, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                results["upholder"],
                results["obliger"],
                results["questioner"],
                results["rebel"],
                dominant,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        await database.commit()

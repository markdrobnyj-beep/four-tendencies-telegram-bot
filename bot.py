"""Application entry point for the Telegram bot."""

import asyncio
import logging

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from config import BOT_TOKEN
from handlers import results, start, test_flow
from storage.db import init_db


async def main() -> None:
    """Create the dispatcher and run long polling."""
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    await init_db()
    bot = Bot(token=BOT_TOKEN)
    dispatcher = Dispatcher(storage=MemoryStorage())
    # MemoryStorage is convenient for the MVP; use RedisStorage in production.
    dispatcher.include_router(start.router)
    dispatcher.include_router(test_flow.router)
    dispatcher.include_router(results.router)
    try:
        await dispatcher.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())

"""Result formatting and repeat-test handler."""

import logging

from aiogram import Router
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from keyboards.inline import REPEAT_CALLBACK, repeat_keyboard
from services.scoring import calculate_results, find_dominant_tendencies
from storage.db import save_result
from texts.ua_texts import CONCLUSIONS, TENDENCY_NAMES

router = Router(name="results")
logger = logging.getLogger(__name__)


async def show_results(
    message: Message, answers: list[tuple[str, bool]], user_id: int
) -> None:
    """Calculate, persist, and send a completed test result."""
    results = calculate_results(answers)
    leaders = find_dominant_tendencies(results)
    dominant = leaders[0]
    tie_note = (
        "До речі, у тебе однакові показники одразу в кількох категоріях — це нормально: більшість людей поєднують риси кількох тенденцій. Обрана вище — та, що трохи точніша, але придивись і до другої."
        if len(leaders) > 1
        else ""
    )
    text = (
        "🎉 Тест завершено! Ось твої результати:\n"
        "Відсотки нормалізовані: разом вони дають 100% і показують, як розподілилися твої відповіді «Так» між тенденціями.\n\n"
        f"🟦 Виконавець: {results['upholder']}%\n"
        f"🟩 Обов'язковий: {results['obliger']}%\n"
        f"🟨 Скептик: {results['questioner']}%\n"
        f"🟥 Бунтар: {results['rebel']}%\n\n"
        f"👉 Твоя провідна тенденція: {TENDENCY_NAMES[dominant]}\n\n"
        f"{CONCLUSIONS[dominant]}\n\n"
        f"{tie_note}\n"
        "Якщо хочеш пройти тест ще раз — натисни кнопку нижче або напиши /start."
    )
    try:
        await save_result(user_id, results, TENDENCY_NAMES[dominant])
    except Exception:
        logger.warning("Could not save test result for user %s", user_id, exc_info=True)
    await message.answer(text, reply_markup=repeat_keyboard())


@router.callback_query(lambda callback: callback.data == REPEAT_CALLBACK)
async def callback_repeat(callback: CallbackQuery, state: FSMContext) -> None:
    """Start another test from the result message."""
    await callback.answer()
    if isinstance(callback.message, Message):
        from handlers.test_flow import start_test_session

        await start_test_session(callback.message, state, edit=True)

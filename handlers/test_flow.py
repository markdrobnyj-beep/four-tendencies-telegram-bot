"""Question presentation and answer processing."""

import logging
import random

from aiogram import F, Router
from aiogram.exceptions import TelegramAPIError
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from data.questions import QUESTIONS
from keyboards.inline import ANSWER_NO_CALLBACK, ANSWER_YES_CALLBACK, answer_keyboard
from states.test_states import TestStates
from texts.ua_texts import QUESTION_TEMPLATE, STALE_CALLBACK_TEXT

router = Router(name="test_flow")
logger = logging.getLogger(__name__)
ANSWER_CALLBACKS = {ANSWER_YES_CALLBACK, ANSWER_NO_CALLBACK}


async def start_test_session(
    message: Message, state: FSMContext, *, edit: bool = False
) -> None:
    """Create a shuffled test session and display its first question."""
    questions = list(QUESTIONS)
    random.shuffle(questions)
    serialised = [
        {"id": question.id, "tendency": question.tendency, "text": question.text}
        for question in questions
    ]
    await state.set_state(TestStates.question)
    await state.update_data(questions=serialised, index=0, answers=[])
    await _show_question(message, state, edit=edit)


async def _show_question(message: Message, state: FSMContext, *, edit: bool) -> None:
    data = await state.get_data()
    questions = data.get("questions", [])
    index = data.get("index", 0)
    if index >= len(questions):
        return
    question = questions[index]
    text = QUESTION_TEMPLATE.format(i=index + 1, question=question["text"])
    if not edit:
        await message.answer(text, reply_markup=answer_keyboard())
        return
    try:
        await message.edit_text(text, reply_markup=answer_keyboard())
    except TelegramAPIError:
        logger.warning(
            "Could not edit question message; sending a new one", exc_info=True
        )
        await message.answer(text, reply_markup=answer_keyboard())


@router.callback_query(F.data.in_(ANSWER_CALLBACKS))
async def callback_answer(callback: CallbackQuery, state: FSMContext) -> None:
    """Record an answer, advance the test, or show the final result."""
    if await state.get_state() != TestStates.question.state:
        await callback.answer(STALE_CALLBACK_TEXT)
        return

    data = await state.get_data()
    questions = data.get("questions")
    index = data.get("index")
    answers = data.get("answers")
    if (
        not isinstance(questions, list)
        or not isinstance(index, int)
        or not isinstance(answers, list)
    ):
        await callback.answer(STALE_CALLBACK_TEXT)
        return
    if index >= len(questions) or callback.data not in ANSWER_CALLBACKS:
        await callback.answer(STALE_CALLBACK_TEXT)
        return

    question = questions[index]
    answers.append((question["tendency"], callback.data == ANSWER_YES_CALLBACK))
    next_index = index + 1
    await callback.answer()
    if next_index < len(questions):
        await state.update_data(index=next_index, answers=answers)
        if isinstance(callback.message, Message):
            await _show_question(callback.message, state, edit=True)
        return

    await state.clear()
    logger.info("Test completed for user %s", callback.from_user.id)
    if isinstance(callback.message, Message):
        from handlers.results import show_results

        await show_results(callback.message, answers, callback.from_user.id)

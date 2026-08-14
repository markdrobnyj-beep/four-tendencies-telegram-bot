"""Handlers for commands and starting a test."""

import logging

from aiogram import Router
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, Message

from handlers.test_flow import start_test_session
from keyboards.inline import START_CALLBACK, start_keyboard
from texts.ua_texts import CANCEL_TEXT, HELP_TEXT, START_TEXT

router = Router(name="start")
logger = logging.getLogger(__name__)


@router.message(CommandStart())
async def command_start(message: Message, state: FSMContext) -> None:
    """Send the welcome message and reset any previous test."""
    await state.clear()
    await message.answer(START_TEXT, reply_markup=start_keyboard())


@router.message(Command("help"))
async def command_help(message: Message) -> None:
    """Explain the test and available commands."""
    await message.answer(HELP_TEXT)


@router.message(Command("cancel"))
async def command_cancel(message: Message, state: FSMContext) -> None:
    """Cancel the active test and clear its FSM data."""
    await state.clear()
    await message.answer(CANCEL_TEXT)


@router.callback_query(lambda callback: callback.data == START_CALLBACK)
async def callback_start(callback: CallbackQuery, state: FSMContext) -> None:
    """Start a test after the user presses the welcome button."""
    await callback.answer()
    if isinstance(callback.message, Message):
        logger.info("Starting test for user %s", callback.from_user.id)
        await start_test_session(callback.message, state, edit=True)

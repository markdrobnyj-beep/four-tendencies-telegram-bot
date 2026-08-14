"""Inline keyboards and callback-data constants."""

from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup

START_CALLBACK = "start_test"
REPEAT_CALLBACK = "repeat_test"
ANSWER_YES_CALLBACK = "ans:yes"
ANSWER_NO_CALLBACK = "ans:no"


def start_keyboard() -> InlineKeyboardMarkup:
    """Return the keyboard that starts a test."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🚀 Почати тест", callback_data=START_CALLBACK)]
        ]
    )


def answer_keyboard() -> InlineKeyboardMarkup:
    """Return the yes/no answer keyboard."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="✅ Так, це про мене", callback_data=ANSWER_YES_CALLBACK
                )
            ],
            [
                InlineKeyboardButton(
                    text="❌ Ні, не про мене", callback_data=ANSWER_NO_CALLBACK
                )
            ],
        ]
    )


def repeat_keyboard() -> InlineKeyboardMarkup:
    """Return the keyboard that starts another test."""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(
                    text="🔁 Пройти ще раз", callback_data=REPEAT_CALLBACK
                )
            ]
        ]
    )

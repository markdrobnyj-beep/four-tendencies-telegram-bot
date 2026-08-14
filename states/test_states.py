"""Finite-state machine definitions."""

from aiogram.fsm.state import State, StatesGroup


class TestStates(StatesGroup):
    """States used while a user answers the test."""

    question = State()

"""Scoring functions for the Four Tendencies test."""

from math import floor

from data.questions import TENDENCY_TOTALS


def calculate_results(answers: list[tuple[str, bool]]) -> dict[str, int]:
    """Calculate normalized percentages whose sum is exactly 100.

    ``answers`` contains ``(tendency, is_yes)`` pairs. Every positive answer
    has equal weight; the result is the share of all positive answers assigned
    to each tendency. Largest-remainder rounding keeps the displayed total at
    exactly 100 percent. If there are no positive answers, all tendencies are
    shown as an even 25 percent because the test provides no evidence for a
    leader.
    """
    yes_counts = dict.fromkeys(TENDENCY_TOTALS, 0)
    for tendency, is_yes in answers:
        if tendency not in TENDENCY_TOTALS:
            raise ValueError(f"Unknown tendency: {tendency}")
        if is_yes:
            yes_counts[tendency] += 1

    total_yes = sum(yes_counts.values())
    if total_yes == 0:
        return {tendency: 25 for tendency in TENDENCY_TOTALS}

    raw_percentages = {
        tendency: yes_count * 100 / total_yes
        for tendency, yes_count in yes_counts.items()
    }
    results = {tendency: floor(value) for tendency, value in raw_percentages.items()}
    remaining_points = 100 - sum(results.values())
    by_remainder = sorted(
        raw_percentages,
        key=lambda tendency: raw_percentages[tendency] - results[tendency],
        reverse=True,
    )
    for tendency in by_remainder[:remaining_points]:
        results[tendency] += 1
    return results


def find_dominant_tendencies(results: dict[str, int]) -> list[str]:
    """Return all tendencies tied for the highest score, in input order."""
    if not results:
        return []
    highest = max(results.values())
    return [tendency for tendency, score in results.items() if score == highest]

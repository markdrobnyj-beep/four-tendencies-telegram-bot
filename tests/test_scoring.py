from data.questions import TENDENCY_TOTALS
from services.scoring import calculate_results, find_dominant_tendencies


def test_all_yes_answers_for_one_tendency_reach_one_hundred_percent() -> None:
    answers = [("upholder", True)] * TENDENCY_TOTALS["upholder"]

    results = calculate_results(answers)

    assert results["upholder"] == 100


def test_mixed_answers_use_half_up_percentage_rounding() -> None:
    answers = (
        [("questioner", True)]
        + [("questioner", False)] * 5
        + [("upholder", True)] * 2
        + [("upholder", False)] * 3
    )

    results = calculate_results(answers)

    assert results["questioner"] == 33
    assert results["upholder"] == 67


def test_tied_maximum_returns_both_tendencies() -> None:
    results = {"upholder": 60, "obliger": 60, "questioner": 20, "rebel": 0}

    leaders = find_dominant_tendencies(results)

    assert leaders == ["upholder", "obliger"]


def test_results_are_normalized_to_one_hundred_percent() -> None:
    answers = (
        [("upholder", True)] * 2
        + [("obliger", True)] * 4
        + [("questioner", True)] * 4
        + [("rebel", True)] * 3
    )

    results = calculate_results(answers)

    assert results == {
        "upholder": 15,
        "obliger": 31,
        "questioner": 31,
        "rebel": 23,
    }
    assert sum(results.values()) == 100


def test_no_positive_answers_are_split_evenly() -> None:
    results = calculate_results([])

    assert results == {
        "upholder": 25,
        "obliger": 25,
        "questioner": 25,
        "rebel": 25,
    }

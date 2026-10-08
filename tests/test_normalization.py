from __future__ import annotations

import pytest

from moderation import ModelResponseError, fallback, normalize


def model_result(**overrides):
    result = {
        "decision": "approved",
        "confidence": 0.95,
        "categories": [],
        "severity": "low",
        "reason": "No violation detected.",
        "escalate": False,
    }
    result.update(overrides)
    return result


def test_safe_content_is_approved():
    assert normalize(model_result())["decision"] == "approved"


@pytest.mark.parametrize("category", ["hate_speech", "violence"])
def test_clear_violation_is_rejected(category):
    result = normalize(model_result(decision="rejected", categories=[category], severity="high"))
    assert result["decision"] == "rejected"
    assert result["categories"] == [category]


def test_ambiguous_content_is_reviewed():
    result = normalize(model_result(decision="review", confidence=0.55, severity="medium"))
    assert result["decision"] == "review"
    assert result["escalate"] is True


@pytest.mark.parametrize("category", ["rape_threat", "child_sexual_abuse"])
def test_critical_categories_are_forced_to_severe_rejection(category):
    result = normalize(model_result(decision="approved", confidence=0.2, categories=[category]))
    assert result["decision"] == "rejected"
    assert result["severity"] == "severe"
    assert result["escalate"] is True


@pytest.mark.parametrize("category", ["self_harm", "animal_abuse"])
def test_actionable_high_priority_categories_are_forced_to_rejection(category):
    result = normalize(model_result(decision="review", confidence=0.6, categories=[category]))
    assert result["decision"] == "rejected"
    assert result["severity"] == "high"
    assert result["escalate"] is True


def test_confidence_above_one_is_clamped():
    assert normalize(model_result(confidence=7))["confidence"] == 1.0


def test_confidence_below_zero_is_clamped_and_low_confidence_routes_to_review():
    result = normalize(model_result(confidence=-1))
    assert result["confidence"] == 0.0
    assert result["decision"] == "review"


def test_unknown_categories_are_removed():
    result = normalize(model_result(categories=["made_up", "hate_speech"], decision="rejected"))
    assert result["categories"] == ["hate_speech"]


def test_low_confidence_rejection_routes_to_review():
    result = normalize(model_result(decision="rejected", confidence=0.69, categories=["harassment"]))
    assert result["decision"] == "review"


def test_malformed_model_json_is_rejected():
    with pytest.raises(ModelResponseError):
        normalize("not-json")


def test_fallback_never_approves():
    result = fallback()
    assert result == {
        "decision": "review",
        "confidence": 0.0,
        "categories": [],
        "severity": "medium",
        "reason": "Automated moderation unavailable; human review required.",
        "escalate": True,
    }

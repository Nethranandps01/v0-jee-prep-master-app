from __future__ import annotations

import json
import re
from typing import Any

from app.services.ai_service import call_openai


QUESTION_TEMPLATES: dict[str, list[dict[str, Any]]] = {
    "Physics": [
        {
            "text": "A particle moving uniformly in a circle has acceleration directed:",
            "options": [
                "Along tangent",
                "Towards center",
                "Away from center",
                "Zero",
            ],
            "correct": 1,
            "explanation": "Centripetal acceleration always points towards the center of circular motion.",
        },
        {
            "text": "If force is doubled and mass is unchanged, acceleration becomes:",
            "options": ["Half", "Same", "Double", "Four times"],
            "correct": 2,
            "explanation": "From Newton's second law, a = F/m. Doubling force doubles acceleration.",
        },
        {
            "text": "Work done by a conservative force over a closed path is:",
            "options": ["Positive", "Negative", "Zero", "Infinite"],
            "correct": 2,
            "explanation": "Conservative forces do zero net work over a closed path.",
        },
    ],
    "Chemistry": [
        {
            "text": "For an exothermic reaction, increasing temperature shifts equilibrium:",
            "options": [
                "To products",
                "To reactants",
                "No change",
                "Becomes irreversible",
            ],
            "correct": 1,
            "explanation": "By Le Chatelier's principle, heat acts like a product for exothermic reactions.",
        },
        {
            "text": "The pH of a 10^-3 M HCl solution is:",
            "options": ["1", "2", "3", "4"],
            "correct": 2,
            "explanation": "For strong acid HCl, [H+] = 10^-3, therefore pH = 3.",
        },
        {
            "text": "Hybridization of carbon in CO2 is:",
            "options": ["sp", "sp2", "sp3", "dsp2"],
            "correct": 0,
            "explanation": "CO2 has two electron domains around carbon, giving sp hybridization.",
        },
    ],
    "Mathematics": [
        {
            "text": "If f(x) = x^2, then f'(x) is:",
            "options": ["x", "2x", "x^2", "2"],
            "correct": 1,
            "explanation": "Derivative of x^2 with respect to x is 2x.",
        },
        {
            "text": "Value of integral from 0 to pi of sin(x) dx is:",
            "options": ["0", "1", "2", "pi"],
            "correct": 2,
            "explanation": "Integral of sin(x) over [0, pi] equals 2.",
        },
        {
            "text": "Determinant of matrix [[a,b],[c,d]] is:",
            "options": ["ab-cd", "ad-bc", "ac-bd", "a+b+c+d"],
            "correct": 1,
            "explanation": "For a 2x2 matrix, determinant is ad - bc.",
        },
    ],
}


def build_question_set(
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    *,
    require_ai: bool = False,
) -> list[dict]:
    questions, source = build_question_set_with_source(subject, total_questions, difficulty)
    if require_ai and source != "ai":
        raise RuntimeError("AI question generation failed for this paper. Please try again.")
    return questions


def build_question_set_with_source(
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    topic: str | None = None,
) -> tuple[list[dict], str]:
    if total_questions <= 0:
        return [], "none"

    ai_questions = _build_question_set_with_ai(subject, total_questions, difficulty, topic)
    if ai_questions:
        return ai_questions, "ai"

    return _build_template_question_set(subject, total_questions, difficulty), "template"


def _build_template_question_set(subject: str, total_questions: int, difficulty: str) -> list[dict]:
    templates = QUESTION_TEMPLATES.get(subject, QUESTION_TEMPLATES["Physics"])
    questions: list[dict] = []

    for index in range(total_questions):
        template = templates[index % len(templates)]
        question_id = f"q{index + 1}"
        questions.append(
            {
                "id": question_id,
                "subject": subject,
                "text": f"Q{index + 1}. [{difficulty}] {template['text']}",
                "options": list(template["options"]),
                "correct": int(template["correct"]),
                "explanation": str(template["explanation"]),
            }
        )

    return questions


def _build_question_set_with_ai(subject: str, total_questions: int, difficulty: str, topic: str | None = None) -> list[dict]:
    topic_str = f"Topic: {topic}\n" if topic else ""
    prompt = (
        "Role: JEE Question Setter. Task: JSON Questions.\n"
        f"Subject: {subject}. {topic_str}"
        f"Difficulty: {difficulty}. Count: {total_questions}.\n\n"
        "Output: { \"questions\": [ { \"text\": \"\", \"options\": [\"\", \"\", \"\", \"\"], \"correct\": 0-3, \"explanation\": \"\" } ] }\n"
        "Note: No markdown. Accurate and unique questions."
    )

    attempts: list[tuple[float, int]] = [
        (0.4, 8000), # Reduced attempts for faster failure/fallback
        (0.2, 10000),
    ]

    for temperature, max_output_tokens in attempts:
        try:
            raw = call_openai(
                prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type="application/json",
                thinking_budget=0,
            )
        except Exception as e:  # noqa: BLE001
            continue

        parsed = _extract_json_array(raw)
        if isinstance(parsed, dict):
            maybe_list = parsed.get("questions") or parsed.get("items")
            if isinstance(maybe_list, list):
                parsed = maybe_list

        normalized = _normalize_ai_questions(parsed, subject, total_questions, difficulty)
        if normalized:
            return normalized

    return []


def _normalize_ai_questions(
    parsed: Any,
    subject: str,
    total_questions: int,
    difficulty: str,
) -> list[dict]:
    if not isinstance(parsed, list):
        return []

    raw_questions: list[dict[str, Any]] = []
    correct_values: list[int] = []
    for item in parsed[:total_questions]:
        if not isinstance(item, dict):
            return []

        text = item.get("text")
        options = item.get("options")
        correct = item.get("correct")
        explanation = item.get("explanation")

        if not isinstance(text, str) or not text.strip():
            return []
        if not isinstance(options, list) or len(options) < 4:
            return []
        options_text = [str(option).strip() for option in options[:4]]
        if any(not option for option in options_text):
            return []

        try:
            correct_idx = int(correct)
        except (TypeError, ValueError):
            return []

        correct_values.append(correct_idx)
        raw_questions.append(
            {
                "text": text.strip(),
                "options": options_text,
                "correct": correct_idx,
                "explanation": explanation,
            }
        )

    if len(raw_questions) < total_questions:
        return []

    # Some models return 1-based option indexes. Detect and normalize.
    one_based = bool(correct_values) and all(1 <= value <= 4 for value in correct_values) and 0 not in correct_values

    normalized: list[dict] = []
    for index, question in enumerate(raw_questions, start=1):
        correct_idx = int(question["correct"])
        if one_based:
            correct_idx -= 1

        if correct_idx < 0 or correct_idx > 3:
            return []

        explanation = question.get("explanation")
        normalized.append(
            {
                "id": f"q{index}",
                "subject": subject,
                "text": f"Q{index}. [{difficulty}] {question['text']}",
                "options": list(question["options"]),
                "correct": correct_idx,
                "explanation": str(explanation).strip()
                if isinstance(explanation, str) and explanation.strip()
                else "Review this concept and practice similar JEE questions.",
            }
        )

    return normalized


def _extract_json_array(raw: str) -> Any | None:
    text = raw.strip()
    if not text:
        return None

    # Support markdown-wrapped JSON (both array and object).
    fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, flags=re.DOTALL)
    candidate = fenced.group(1) if fenced else text

    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        bracket_match = re.search(r"(\[.*\])", text, flags=re.DOTALL)
        if not bracket_match:
            return None
        try:
            return json.loads(bracket_match.group(1))
        except json.JSONDecodeError:
            object_match = re.search(r"(\{.*\})", text, flags=re.DOTALL)
            if not object_match:
                return None
            try:
                return json.loads(object_match.group(1))
            except json.JSONDecodeError:
                return None

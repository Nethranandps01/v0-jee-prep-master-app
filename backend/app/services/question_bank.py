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


async def build_question_set(
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    *,
    require_ai: bool = False,
) -> list[dict]:
    questions, source = await build_question_set_with_source(subject, total_questions, difficulty)
    if require_ai and source != "ai":
        raise RuntimeError("AI question generation failed for this paper. Please try again.")
    return questions


async def build_question_set_with_source(
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    topic: str | None = None,
) -> tuple[list[dict], str]:
    if total_questions <= 0:
        return [], "none"

    ai_questions = await _build_question_set_with_ai(subject, total_questions, difficulty, topic)
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


async def _build_question_set_with_ai(subject: str, total_questions: int, difficulty: str, topic: str | None = None) -> list[dict]:
    import asyncio
    from app.services.ai_service import async_call_openai
    
    # Configuration for parallel generation
    BATCH_SIZE = 10
    num_batches = (total_questions + BATCH_SIZE - 1) // BATCH_SIZE
    
    async def generate_batch(count: int, start_index: int) -> list[dict]:
        topic_str = f"Topic: {topic}\n" if topic else ""
        prompt = (
            "Role: JEE Question Setter. Task: JSON Questions.\n"
            f"Subject: {subject}. {topic_str}"
            f"Difficulty: {difficulty}. Generating {count} unique questions.\n\n"
            "Output Format (STRICT JSON): { \"questions\": [ { \"text\": \"\", \"options\": [\"\", \"\", \"\", \"\"], \"correct\": 0-3, \"explanation\": \"\" } ] }\n"
        )
        
        try:
            raw = await async_call_openai(
                prompt,
                temperature=0.4,
                max_output_tokens=3000, 
                response_mime_type="application/json",
            )
            parsed = _extract_json_array(raw)
            if isinstance(parsed, dict):
                parsed = parsed.get("questions") or parsed.get("items") or []
            return parsed if isinstance(parsed, list) else []
        except Exception:
            return []

    tasks = [generate_batch(min(BATCH_SIZE, total_questions - (i * BATCH_SIZE)), i * BATCH_SIZE) for i in range(num_batches)]
    results = await asyncio.gather(*tasks)
    
    all_raw_questions = []
    for batch_res in results:
        all_raw_questions.extend(batch_res)
    
    # Normalize AI questions
    ai_normalized = _normalize_ai_questions(all_raw_questions, subject, total_questions, difficulty)
    
    if len(ai_normalized) >= total_questions:
        return ai_normalized[:total_questions]

    # Fill the gap with templates if AI under-generated
    gap_count = total_questions - len(ai_normalized)
    if gap_count > 0:
        templates = _build_template_question_set(subject, total_questions, difficulty)
        # Use templates that don't overlap in ID ideally, but here we just re-ID them anyway
        for i in range(gap_count):
            tmpl = templates[i % len(templates)]
            index = len(ai_normalized) + 1
            ai_normalized.append({
                "id": f"q{index}",
                "subject": subject,
                "text": f"Q{index}. [{difficulty}] {tmpl['text']}",
                "options": list(tmpl["options"]),
                "correct": int(tmpl["correct"]),
                "explanation": str(tmpl["explanation"]),
            })

    return ai_normalized


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
    
    for item in parsed:
        if not isinstance(item, dict): continue
        text = item.get("text")
        options = item.get("options")
        correct = item.get("correct")
        explanation = item.get("explanation")

        if not isinstance(text, str) or not text.strip(): continue
        if not isinstance(options, list) or len(options) < 4: continue
        
        options_text = [str(option).strip() for option in options[:4]]
        if any(not option for option in options_text): continue

        try:
            correct_idx = int(correct)
            correct_values.append(correct_idx)
            raw_questions.append({
                "text": text.strip(),
                "options": options_text,
                "correct": correct_idx,
                "explanation": explanation,
            })
        except (TypeError, ValueError): continue

    if not raw_questions:
        return []

    # Detect 1-based indexing
    one_based = all(1 <= v <= 4 for v in correct_values) and 0 not in correct_values
    
    normalized: list[dict] = []
    for index, question in enumerate(raw_questions, start=1):
        if len(normalized) >= total_questions: break
        
        correct_idx = int(question["correct"])
        if one_based: correct_idx -= 1
        if correct_idx < 0 or correct_idx > 3: continue

        explanation = question.get("explanation")
        normalized.append({
            "id": f"q{index}",
            "subject": subject,
            "text": f"Q{index}. [{difficulty}] {question['text']}",
            "options": list(question["options"]),
            "correct": correct_idx,
            "explanation": str(explanation).strip() if explanation else "JEE practice question.",
        })

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

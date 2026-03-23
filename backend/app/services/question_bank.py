from __future__ import annotations
from datetime import datetime, timezone
import hashlib
import json
import re
from typing import Any
from pymongo.database import Database

from app.services.ai_service import call_openai


def generate_question_hash(text: str, options: list[str]) -> str:
    """Creates a unique hash for a question based on its text and options to prevent duplicates."""
    base = text.strip().lower() + "|" + "|".join(opt.strip().lower() for opt in options)
    return hashlib.md5(base.encode()).hexdigest()


def deduplicate_questions(questions: list[dict]) -> list[dict]:
    """Filters out duplicate questions from a list based on their content hash."""
    seen = set()
    unique = []
    for q in questions:
        h = generate_question_hash(q["text"], q["options"])
        if h not in seen:
            seen.add(h)
            unique.append(q)
    return unique


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
    db: Database | None,
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    *,
    require_ai: bool = False,
    topic: str | None = None,
) -> list[dict]:
    questions, source = await build_question_set_with_source(db, subject, total_questions, difficulty, topic)
    if require_ai and source == "template":
        raise RuntimeError("AI question generation failed for this paper. Please try again.")
    return questions


async def build_question_set_with_source(
    db: Database | None,
    subject: str,
    total_questions: int,
    difficulty: str = "Medium",
    topic: str | None = None,
) -> tuple[list[dict], str]:
    if total_questions <= 0:
        return [], "none"

    # Stage 1: Attempt to retrieve from Question Pool (Pseudo-RAG)
    retrieved: list[dict] = []
    if db is not None:
        query = {"subject": subject, "difficulty": difficulty}
        if topic:
            query["topic"] = topic
        
        # Aggregate with $sample to get random set every time
        pool_cursor = db.question_pool.aggregate([
            {"$match": query},
            {"$sample": {"size": total_questions}}
        ])
        retrieved = list(pool_cursor)

    if len(retrieved) >= total_questions:
        # Instant win: we have enough in the bank.
        normalized = _reformat_from_pool(retrieved[:total_questions])
        return normalized, "pool"

    # Stage 2: Hybrid AI Generation for the gap
    needed = total_questions - len(retrieved)
    ai_questions = await _build_question_set_with_ai(subject, needed, difficulty, topic)
    
    # Store newly generated questions in the pool for future reuse
    if ai_questions and db is not None:
        to_store = []
        for q in ai_questions:
            store_item = {
                "hash": generate_question_hash(q["text"], q["options"]),
                "subject": subject,
                "difficulty": difficulty,
                "topic": topic,
                # Store clean version in pool
                "text": q["text"].split("] ", 1)[-1] if "] " in q["text"] else q["text"],
                "options": q["options"],
                "correct": q["correct"],
                "explanation": q["explanation"],
                "source": "ai_generated",
                "created_at": datetime.now(timezone.utc)
            }
            to_store.append(store_item)
        if to_store:
            try:
                # Ensure unique index exists in DB (run once or assume exist)
                # db.question_pool.create_index([("hash", 1)], unique=True)
                db.question_pool.insert_many(to_store, ordered=False)
            except Exception:
                pass # Silently proceed if duplicates or other issues

    # Combine retrieved and newly generated with deduplication (Step 1 Fix)
    pool_formatted = _reformat_from_pool(retrieved)
    combined = deduplicate_questions(pool_formatted + ai_questions)
    
    # If deduplication dropped us below target, fetch more from AI (Important Fix)
    if len(combined) < total_questions:
        missing = total_questions - len(combined)
        extra_ai = await _build_question_set_with_ai(subject, missing, difficulty, topic)
        combined.extend(deduplicate_questions(extra_ai))
    
    if len(combined) >= total_questions:
        return combined[:total_questions], "ai"

    # Stage 3: Template fallback if AI/Pool still failed to fulfill gap
    return _build_template_question_set(subject, total_questions, difficulty), "template"


def _reformat_from_pool(questions: list[dict]) -> list[dict]:
    """Helper to ensure retrieved questions have the standard q1, q2... ID format for the UI"""
    results: list[dict] = []
    for i, q in enumerate(questions, start=1):
        difficulty = q.get("difficulty", "Medium")
        results.append({
            "id": f"q{i}",
            "subject": q["subject"],
            "text": f"Q{i}. [{difficulty}] {q['text']}",
            "options": list(q["options"]),
            "correct": int(q["correct"]),
            "explanation": str(q.get("explanation", "")),
        })
    return results


async def _build_question_set_with_ai(subject: str, total_questions: int, difficulty: str, topic: str | None = None) -> list[dict]:
    import asyncio
    from app.services.ai_service import async_call_openai
    
    # Extreme Parallelism: Generate in very small batches for maximum speed.
    BATCH_SIZE = 4
    num_batches = (total_questions + BATCH_SIZE - 1) // BATCH_SIZE
    
    async def generate_batch(count: int, start_index: int) -> list[dict]:
        topic_str = f"Topic: {topic}. " if topic else ""
        used_texts = "\n".join([q["text"] for q in all_raw_questions[-10:]]) if all_raw_questions else "None"
        prompt = (
            f"""
Generate {count} HIGH-QUALITY JEE {subject} questions.

Difficulty: {difficulty}
{f"Topic: {topic}" if topic else "Cover mixed topics across syllabus"}

STRICT RULES (VERY IMPORTANT):
1. Each question MUST test a DIFFERENT concept
2. DO NOT repeat similar questions or patterns
3. DO NOT use same formulas repeatedly
4. Avoid common textbook or standard repeated questions
5. Ensure diversity across topics and subtopics
6. Use varied numerical values and problem styles
7. Previously generated questions (DO NOT REPEAT OR SIMILAR):
{used_texts}

QUALITY RULES:
- Questions should be JEE level (conceptual + tricky)
- Avoid direct formula substitution questions
- Mix conceptual, numerical (float/int answer), and multiples (more than 1 correct option).

OUTPUT FORMAT (STRICT JSON ONLY):
{{
  "questions": [
    {{
      "text": "Clear question text",
      "type": "MCQ_MAIN | NUMERICAL_MAIN | ADV_SINGLE | ADV_MULTIPLE",
      "options": ["Option A", "Option B", "Option C", "Option D"], 
      "correct": 0,
      "explanation": "Step by step explanation"
    }}
  ]
}}

NOTE FOR CORRECT FIELD:
- For MCQ_MAIN/ADV_SINGLE: index 0-3
- For NUMERICAL_MAIN: a result (number)
- For ADV_MULTIPLE: a list of correct indexes [0, 2]

SELF-CHECK BEFORE FINALIZING:
- Ensure no two questions are similar or use same logic
- Diversity in question types (mix of MCQ and Numerical/Multiple if possible)

IMPORTANT:
- Do NOT include numbering like Q1, Q2
- Return ONLY valid JSON
"""
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
        # Allow more than total_questions during normalization for deduplication later
        
        correct_idx = int(question["correct"])
        if one_based: correct_idx -= 1
        if correct_idx < 0 or correct_idx > 3: continue

        explanation = question.get("explanation")
        normalized.append({
            "id": f"tmp{index}", # Temporary ID, will be reformatted
            "subject": subject,
            "text": f"{question['text']}", # Clean text
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


# from __future__ import annotations

# import asyncio
# import hashlib
# import json
# import re
# from datetime import datetime, timezone
# from typing import Any

# from pymongo.database import Database

# from app.services.ai_service import async_call_openai

# # ---------------------------------------------------------------------------
# # JEE Syllabus Topic Grid
# # ---------------------------------------------------------------------------

# TOPIC_GRID: dict[str, list[str]] = {
#     "Physics": [
#         "Kinematics", "Newton's Laws of Motion", "Work, Energy and Power",
#         "Rotational Motion and Moment of Inertia", "Gravitation",
#         "Properties of Solids and Fluids", "Thermodynamics",
#         "Kinetic Theory of Gases", "Simple Harmonic Motion", "Waves and Sound",
#         "Electrostatics and Coulomb's Law", "Current Electricity and Ohm's Law",
#         "Magnetic Effects of Current", "Electromagnetic Induction",
#         "Alternating Current Circuits", "Ray Optics and Mirrors",
#         "Wave Optics and Interference", "Dual Nature of Matter",
#         "Atoms and Nuclei", "Semiconductor Devices",
#     ],
#     "Chemistry": [
#         "Atomic Structure and Periodic Table", "Chemical Bonding and Molecular Structure",
#         "States of Matter", "Thermodynamics and Thermochemistry",
#         "Chemical Equilibrium", "Ionic Equilibrium and Buffer Solutions",
#         "Electrochemistry", "Chemical Kinetics", "Surface Chemistry",
#         "s-Block Elements", "p-Block Elements", "d and f Block Elements",
#         "Coordination Compounds", "Haloalkanes and Haloarenes",
#         "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids",
#         "Amines and Diazonium Salts", "Biomolecules", "Polymers",
#         "Environmental Chemistry",
#     ],
#     "Mathematics": [
#         "Sets, Relations and Functions", "Complex Numbers",
#         "Quadratic Equations and Inequalities", "Permutations and Combinations",
#         "Binomial Theorem", "Sequences and Series", "Limits and Continuity",
#         "Differentiability and Derivatives", "Applications of Derivatives",
#         "Indefinite Integration", "Definite Integration", "Differential Equations",
#         "Straight Lines and Pair of Lines", "Circles and Conic Sections",
#         "Three Dimensional Geometry", "Vectors", "Matrices and Determinants",
#         "Probability and Statistics", "Trigonometry and Inverse Trigonometry",
#         "Mathematical Reasoning",
#     ],
# }

# # ---------------------------------------------------------------------------
# # Template fallback
# # ---------------------------------------------------------------------------

# QUESTION_TEMPLATES: dict[str, list[dict[str, Any]]] = {
#     "Physics": [
#         {
#             "text": "A particle moving uniformly in a circle has acceleration directed:",
#             "options": ["Along tangent", "Towards center", "Away from center", "Zero"],
#             "correct": 1,
#             "explanation": "Centripetal acceleration always points towards the center of circular motion.",
#         },
#         {
#             "text": "If force is doubled and mass is unchanged, acceleration becomes:",
#             "options": ["Half", "Same", "Double", "Four times"],
#             "correct": 2,
#             "explanation": "From Newton's second law, a = F/m. Doubling force doubles acceleration.",
#         },
#         {
#             "text": "Work done by a conservative force over a closed path is:",
#             "options": ["Positive", "Negative", "Zero", "Infinite"],
#             "correct": 2,
#             "explanation": "Conservative forces do zero net work over a closed path.",
#         },
#     ],
#     "Chemistry": [
#         {
#             "text": "For an exothermic reaction, increasing temperature shifts equilibrium:",
#             "options": ["To products", "To reactants", "No change", "Becomes irreversible"],
#             "correct": 1,
#             "explanation": "By Le Chatelier's principle, heat acts like a product for exothermic reactions.",
#         },
#         {
#             "text": "The pH of a 10^-3 M HCl solution is:",
#             "options": ["1", "2", "3", "4"],
#             "correct": 2,
#             "explanation": "For strong acid HCl, [H+] = 10^-3, therefore pH = 3.",
#         },
#         {
#             "text": "Hybridization of carbon in CO2 is:",
#             "options": ["sp", "sp2", "sp3", "dsp2"],
#             "correct": 0,
#             "explanation": "CO2 has two electron domains around carbon, giving sp hybridization.",
#         },
#     ],
#     "Mathematics": [
#         {
#             "text": "If f(x) = x^2, then f'(x) is:",
#             "options": ["x", "2x", "x^2", "2"],
#             "correct": 1,
#             "explanation": "Derivative of x^2 with respect to x is 2x.",
#         },
#         {
#             "text": "Value of integral from 0 to pi of sin(x) dx is:",
#             "options": ["0", "1", "2", "pi"],
#             "correct": 2,
#             "explanation": "Integral of sin(x) over [0, pi] equals 2.",
#         },
#         {
#             "text": "Determinant of matrix [[a,b],[c,d]] is:",
#             "options": ["ab-cd", "ad-bc", "ac-bd", "a+b+c+d"],
#             "correct": 1,
#             "explanation": "For a 2x2 matrix, determinant is ad - bc.",
#         },
#     ],
# }

# # ---------------------------------------------------------------------------
# # Hashing & deduplication
# # ---------------------------------------------------------------------------


# def generate_question_hash(text: str, options: list[str]) -> str:
#     clean_text = re.sub(r"^Q\d+\.\s*\[[^\]]+\]\s*", "", text.strip()).lower()
#     base = clean_text + "|" + "|".join(opt.strip().lower() for opt in options)
#     return hashlib.md5(base.encode()).hexdigest()


# def deduplicate_questions(questions: list[dict]) -> list[dict]:
#     seen: set[str] = set()
#     unique: list[dict] = []
#     for q in questions:
#         h = generate_question_hash(q["text"], q["options"])
#         if h not in seen:
#             seen.add(h)
#             unique.append(q)
#     return unique


# # ---------------------------------------------------------------------------
# # Public API
# # ---------------------------------------------------------------------------


# async def build_question_set(
#     db: Database | None,
#     subject: str,
#     total_questions: int,
#     difficulty: str = "Medium",
#     *,
#     require_ai: bool = False,
#     topic: str | None = None,
# ) -> list[dict]:
#     questions, source = await build_question_set_with_source(
#         db, subject, total_questions, difficulty, topic
#     )
#     if require_ai and source == "template":
#         raise RuntimeError("AI question generation failed. Please try again.")
#     return questions


# async def build_question_set_with_source(
#     db: Database | None,
#     subject: str,
#     total_questions: int,
#     difficulty: str = "Medium",
#     topic: str | None = None,
# ) -> tuple[list[dict], str]:
#     if total_questions <= 0:
#         return [], "none"

#     # ------------------------------------------------------------------
#     # Stage 1 + 2: Pool fetch and AI generation fire simultaneously
#     # ------------------------------------------------------------------
#     pool_task = asyncio.create_task(
#         _fetch_from_pool(db, subject, difficulty, topic, total_questions)
#     )
#     ai_task = asyncio.create_task(
#         _build_question_set_with_ai(
#             subject=subject,
#             total_questions=total_questions,
#             difficulty=difficulty,
#             topic=topic,
#         )
#     )

#     retrieved_raw, ai_questions = await asyncio.gather(pool_task, ai_task)
#     pool_formatted = _reformat_from_pool(retrieved_raw)

#     # Pool alone is enough — use it, discard AI results
#     if len(pool_formatted) >= total_questions:
#         return pool_formatted[:total_questions], "pool"

#     # Persist new AI questions (fire-and-forget, does NOT block the response)
#     if ai_questions and db is not None:
#         asyncio.create_task(
#             _store_ai_questions_async(db, ai_questions, subject, difficulty, topic)
#         )

#     combined = deduplicate_questions(pool_formatted + ai_questions)

#     # Rare top-up pass if deduplication caused a gap
#     if len(combined) < total_questions:
#         missing = total_questions - len(combined)
#         extra_ai = await _build_question_set_with_ai(
#             subject=subject,
#             total_questions=missing,
#             difficulty=difficulty,
#             topic=topic,
#             exclude_concepts=[q.get("concept_tag", "") for q in combined],
#             exclude_stems=[
#                 re.sub(r"^Q\d+\.\s*\[[^\]]+\]\s*", "", q["text"].strip())
#                 for q in combined
#             ],
#         )
#         combined = deduplicate_questions(combined + extra_ai)

#     if len(combined) >= total_questions:
#         return _renumber_questions(combined[:total_questions], difficulty), "ai"

#     # ------------------------------------------------------------------
#     # Stage 3: Template fallback
#     # ------------------------------------------------------------------
#     return _build_template_question_set(subject, total_questions, difficulty), "template"


# # ---------------------------------------------------------------------------
# # Pool fetch (runs in executor so it doesn't block the event loop)
# # ---------------------------------------------------------------------------


# async def _fetch_from_pool(
#     db: Database | None,
#     subject: str,
#     difficulty: str,
#     topic: str | None,
#     limit: int,
# ) -> list[dict]:
#     if db is None:
#         return []
#     query: dict[str, Any] = {"subject": subject, "difficulty": difficulty}
#     if topic:
#         query["topic"] = topic
#     loop = asyncio.get_event_loop()
#     return await loop.run_in_executor(
#         None,
#         lambda: list(
#             db.question_pool.aggregate(
#                 [{"$match": query}, {"$sample": {"size": limit}}]
#             )
#         ),
#     )


# # ---------------------------------------------------------------------------
# # Core AI generator — fully parallel with pre-assigned topic slots
# # ---------------------------------------------------------------------------


# async def _build_question_set_with_ai(
#     subject: str,
#     total_questions: int,
#     difficulty: str,
#     topic: str | None = None,
#     exclude_concepts: list[str] | None = None,
#     exclude_stems: list[str] | None = None,
# ) -> list[dict]:
#     """
#     Fires ALL batches in parallel via asyncio.gather.

#     Uniqueness is guaranteed BEFORE runtime:
#       - Each batch is pre-assigned a distinct non-overlapping slice of
#         the topic grid, so batches structurally cannot cover the same concept.
#       - exclude_concepts / exclude_stems are injected at call time for
#         the rare top-up pass after deduplication.

#     This is ~8x faster than sequential batching for 30 questions.
#     """
#     BATCH_SIZE = 5

#     topic_pool = [topic] if topic else TOPIC_GRID.get(subject, TOPIC_GRID["Physics"])
#     exclude_concepts = exclude_concepts or []
#     exclude_stems = exclude_stems or []

#     # Pre-assign topic slices to every batch before firing any request
#     num_batches = (total_questions + BATCH_SIZE - 1) // BATCH_SIZE
#     batch_specs: list[tuple[int, list[str]]] = []

#     for batch_idx in range(num_batches):
#         count = min(BATCH_SIZE, total_questions - batch_idx * BATCH_SIZE)
#         start = (batch_idx * BATCH_SIZE) % len(topic_pool)
#         assigned = topic_pool[start : start + count]
#         if len(assigned) < count:
#             assigned += topic_pool[: count - len(assigned)]
#         batch_specs.append((count, assigned))

#     # Fire all batches simultaneously
#     tasks = [
#         _generate_single_batch(
#             subject=subject,
#             count=count,
#             difficulty=difficulty,
#             batch_topics=assigned_topics,
#             covered_concepts=exclude_concepts,
#             covered_stems=exclude_stems,
#         )
#         for count, assigned_topics in batch_specs
#     ]

#     results = await asyncio.gather(*tasks, return_exceptions=True)

#     all_raw: list[dict] = []
#     for res in results:
#         if isinstance(res, list):
#             all_raw.extend(res)

#     return _normalize_ai_questions(all_raw, subject, difficulty)


# async def _generate_single_batch(
#     subject: str,
#     count: int,
#     difficulty: str,
#     batch_topics: list[str],
#     covered_concepts: list[str],
#     covered_stems: list[str],
# ) -> list[dict]:
#     topics_str = ", ".join(batch_topics)
#     concepts_str = (
#         "\n".join(f"  - {c}" for c in covered_concepts[-40:])
#         if covered_concepts else "  None"
#     )
#     stems_str = (
#         "\n".join(f"  - {s}" for s in covered_stems[-20:])
#         if covered_stems else "  None"
#     )

#     prompt = f"""You are a senior JEE question paper setter.

# Generate exactly {count} HIGH-QUALITY JEE {subject} MCQ(s).

# ASSIGNMENT:
# Difficulty : {difficulty}
# Topics     : {topics_str}
# Count      : {count} question(s) — one per topic listed.

# DO NOT REPEAT these concepts:
# {concepts_str}

# DO NOT replicate or paraphrase these stems:
# {stems_str}

# QUALITY RULES:
# - JEE Advanced level: conceptual + tricky, not direct formula substitution.
# - Mix styles: conceptual reasoning, numerical, multi-step application.
# - All four options must be plausible; distractors should reflect common mistakes.
# - Vary numerical values; never reuse the same scenario or setup.

# OUTPUT (strict JSON only — no markdown, no extra text):
# {{
#   "questions": [
#     {{
#       "concept_tag": "Short label e.g. 'Projectile Range Formula'",
#       "text": "Question stem — no Q-number prefix",
#       "options": ["Option A", "Option B", "Option C", "Option D"],
#       "correct": 0,
#       "explanation": "Step-by-step explanation"
#     }}
#   ]
# }}

# "correct" is 0-based (0 = first option). Return ONLY the JSON."""

#     try:
#         raw = await async_call_openai(
#             prompt,
#             temperature=0.75,
#             max_output_tokens=3000,
#             response_mime_type="application/json",
#         )
#         parsed = _extract_json_object(raw)
#         if isinstance(parsed, dict):
#             questions = parsed.get("questions") or []
#             return questions if isinstance(questions, list) else []
#         return []
#     except Exception:
#         return []


# # ---------------------------------------------------------------------------
# # Normalization & formatting
# # ---------------------------------------------------------------------------


# def _normalize_ai_questions(
#     raw_questions: list[Any],
#     subject: str,
#     difficulty: str,
# ) -> list[dict]:
#     if not isinstance(raw_questions, list):
#         return []

#     validated: list[dict] = []
#     correct_values: list[int] = []

#     for item in raw_questions:
#         if not isinstance(item, dict):
#             continue
#         text = item.get("text", "")
#         options = item.get("options", [])
#         correct = item.get("correct")
#         explanation = item.get("explanation", "")
#         concept_tag = str(item.get("concept_tag", "")).strip()

#         if not isinstance(text, str) or not text.strip():
#             continue
#         if not isinstance(options, list) or len(options) < 4:
#             continue
#         options_text = [str(o).strip() for o in options[:4]]
#         if any(not o for o in options_text):
#             continue

#         try:
#             correct_idx = int(correct)
#             correct_values.append(correct_idx)
#         except (TypeError, ValueError):
#             continue

#         validated.append({
#             "text": text.strip(),
#             "options": options_text,
#             "correct": correct_idx,
#             "explanation": str(explanation).strip() or "JEE practice question.",
#             "concept_tag": concept_tag,
#             "subject": subject,
#         })

#     if not validated:
#         return []

#     one_based = bool(
#         correct_values
#         and all(1 <= v <= 4 for v in correct_values)
#         and 0 not in correct_values
#     )

#     result: list[dict] = []
#     for idx, q in enumerate(validated, start=1):
#         correct_idx = q["correct"] - 1 if one_based else q["correct"]
#         if not (0 <= correct_idx <= 3):
#             continue
#         result.append({
#             "id": f"tmp{idx}",
#             "subject": q["subject"],
#             "text": q["text"],
#             "options": q["options"],
#             "correct": correct_idx,
#             "explanation": q["explanation"],
#             "concept_tag": q["concept_tag"],
#         })

#     return result


# def _renumber_questions(questions: list[dict], difficulty: str) -> list[dict]:
#     result: list[dict] = []
#     for i, q in enumerate(questions, start=1):
#         clean_text = re.sub(r"^Q\d+\.\s*\[[^\]]+\]\s*", "", q["text"].strip())
#         result.append({
#             "id": f"q{i}",
#             "subject": q["subject"],
#             "text": f"Q{i}. [{difficulty}] {clean_text}",
#             "options": list(q["options"]),
#             "correct": int(q["correct"]),
#             "explanation": str(q.get("explanation", "")),
#         })
#     return result


# def _reformat_from_pool(questions: list[dict]) -> list[dict]:
#     results: list[dict] = []
#     for i, q in enumerate(questions, start=1):
#         results.append({
#             "id": f"q{i}",
#             "subject": q["subject"],
#             "text": q["text"],
#             "options": list(q["options"]),
#             "correct": int(q["correct"]),
#             "explanation": str(q.get("explanation", "")),
#             "concept_tag": q.get("concept_tag", ""),
#         })
#     return results


# def _build_template_question_set(
#     subject: str, total_questions: int, difficulty: str
# ) -> list[dict]:
#     templates = QUESTION_TEMPLATES.get(subject, QUESTION_TEMPLATES["Physics"])
#     questions: list[dict] = []
#     for index in range(total_questions):
#         template = templates[index % len(templates)]
#         questions.append({
#             "id": f"q{index + 1}",
#             "subject": subject,
#             "text": f"Q{index + 1}. [{difficulty}] {template['text']}",
#             "options": list(template["options"]),
#             "correct": int(template["correct"]),
#             "explanation": str(template["explanation"]),
#         })
#     return questions


# # ---------------------------------------------------------------------------
# # DB persistence (async, fire-and-forget, non-blocking)
# # ---------------------------------------------------------------------------


# async def _store_ai_questions_async(
#     db: Database,
#     questions: list[dict],
#     subject: str,
#     difficulty: str,
#     topic: str | None,
# ) -> None:
#     to_store = []
#     for q in questions:
#         clean_text = re.sub(r"^Q\d+\.\s*\[[^\]]+\]\s*", "", q["text"].strip())
#         to_store.append({
#             "hash": generate_question_hash(clean_text, q["options"]),
#             "subject": subject,
#             "difficulty": difficulty,
#             "topic": topic,
#             "concept_tag": q.get("concept_tag", ""),
#             "text": clean_text,
#             "options": q["options"],
#             "correct": q["correct"],
#             "explanation": q["explanation"],
#             "source": "ai_generated",
#             "created_at": datetime.now(timezone.utc),
#         })

#     if not to_store:
#         return

#     loop = asyncio.get_event_loop()
#     try:
#         await loop.run_in_executor(
#             None,
#             lambda: db.question_pool.insert_many(to_store, ordered=False),
#         )
#     except Exception:
#         pass  # Duplicate key errors silently ignored


# # ---------------------------------------------------------------------------
# # JSON extraction
# # ---------------------------------------------------------------------------


# def _extract_json_object(raw: str) -> Any:
#     text = raw.strip()
#     if not text:
#         return None

#     fenced = re.search(r"```(?:json)?\s*(\{.*?\}|\[.*?\])\s*```", text, re.DOTALL)
#     candidate = fenced.group(1) if fenced else text

#     try:
#         return json.loads(candidate)
#     except json.JSONDecodeError:
#         pass

#     for pattern in [r"(\{.*\})", r"(\[.*\])"]:
#         match = re.search(pattern, text, re.DOTALL)
#         if match:
#             try:
#                 return json.loads(match.group(1))
#             except json.JSONDecodeError:
#                 continue

#     return None
import json
import urllib.request
import urllib.error
from typing import AsyncGenerator, Any

import httpx

from app.core.config import get_settings

async def stream_call_openai(
    prompt: str,
    *,
    temperature: float = 0.4,
    max_output_tokens: int = 1024,
    thinking_budget: int | None = None,
) -> AsyncGenerator[str, None]:
    settings = get_settings()
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        yield "AI API key is not configured"
        return

    model = settings.openai_model.strip() or DEFAULT_OPENAI_MODELS[0]
    
    url = "https://api.openai.com/v1/chat/completions"
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert JEE tutor and question setter."},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_output_tokens,
        "stream": True,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {api_key}",
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=body, headers=headers) as response:
                if response.status_code != 200:
                    yield f"Error: {response.status_code}"
                    return

                async for line in response.aiter_lines():
                    if line.startswith("data: "):
                        data = line[6:]
                        if data.strip() == "[DONE]":
                            break
                        try:
                            chunk = json.loads(data)
                            content = chunk["choices"][0]["delta"].get("content", "")
                            if content:
                                yield content
                        except json.JSONDecodeError:
                            continue
    except Exception as e:
        yield f"Connection error: {str(e)}"

async def stream_chat_reply(query: str) -> AsyncGenerator[str, None]:
    prompt = (
        "You are an expert JEE tutor. Give clear, practical help for the student query.\n"
        "Rules:\n"
        "- Keep response concise (3-8 bullet points or short paragraphs).\n"
        "- Prioritize exam strategy, concept clarity, and common mistakes.\n"
        "- Keep response complete and self-contained.\n\n"
        f"Student query: {query}"
    )
    async for chunk in stream_call_openai(prompt, temperature=0.35, max_output_tokens=900):
        yield chunk

# ... (keep existing synchronous functions if needed, or deprecate them)

DEFAULT_OPENAI_MODELS = ("gpt-4o-mini", "gpt-4.1-mini", "gpt-5-mini")
QUESTION_PATTERN_HINTS = (
    "what questions",
    "question can",
    "questions can",
    "can be asked",
    "types of questions",
    "question pattern",
    "question patterns",
    "practice question",
    "practice questions",
    "pyq",
    "mcq",
    "quiz",
)


def call_openai(
    prompt: str,
    *,
    temperature: float = 0.4,
    max_output_tokens: int = 1024,
    response_mime_type: str | None = None,
    thinking_budget: int | None = None,
) -> str:
    settings = get_settings()
    api_key = (settings.openai_api_key or "").strip()
    if not api_key:
        raise RuntimeError("AI API key is not configured")

    configured_model = settings.openai_model.strip()
    model_candidates: list[str] = []
    if configured_model:
        model_candidates.append(configured_model)
    for fallback_model in DEFAULT_OPENAI_MODELS:
        if fallback_model not in model_candidates:
            model_candidates.append(fallback_model)

    not_found_error: RuntimeError | None = None
    for model in model_candidates:
        try:
            return _generate_with_model(
                api_key=api_key,
                model=model,
                prompt=prompt,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type=response_mime_type,
                thinking_budget=thinking_budget,
            )
        except RuntimeError as exc:
            detail = str(exc).lower()
            if (
                "model_not_found" in detail
                or "not found" in detail
                or "does not exist" in detail
                or "unsupported_model" in detail
            ):
                not_found_error = exc
                continue
            raise

    if not_found_error:
        raise not_found_error
    raise RuntimeError("AI provider request failed")


def _generate_with_model(
    *,
    api_key: str,
    model: str,
    prompt: str,
    temperature: float,
    max_output_tokens: int,
    response_mime_type: str | None,
    thinking_budget: int | None,
) -> str:
    url = "https://api.openai.com/v1/chat/completions"
    body: dict[str, Any] = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are an expert JEE tutor and question setter."},
            {"role": "user", "content": prompt},
        ],
        "temperature": temperature,
        "max_tokens": max_output_tokens,
    }
    if response_mime_type == "application/json":
        # Ask OpenAI to return JSON-formatted output for question generation flows.
        body["response_format"] = {"type": "json_object"}
    _ = thinking_budget  # Not used by OpenAI chat completions, kept for call-site compatibility.

    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {api_key}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"AI provider HTTP error for model '{model}': {detail}") from exc
    except Exception as exc:  # noqa: BLE001
        raise RuntimeError(f"AI provider request failed for model '{model}'") from exc

    text = _extract_text(payload)
    if not text:
        raise RuntimeError(f"AI provider returned an empty response for model '{model}'")
    return text


def generate_chat_reply(query: str) -> str:
    if _is_question_pattern_request(query):
        prompt = (
            "You are an expert JEE tutor.\n"
            "The student is asking what types of questions can be asked in exam from a topic.\n"
            "Write a practical learning response in this exact section order:\n"
            "1) Most asked JEE question types\n"
            "2) High-probability question patterns\n"
            "3) Practice questions (8 total: 4 conceptual + 4 numerical)\n"
            "4) Formula checklist\n"
            "5) Common traps\n"
            "Rules:\n"
            "- Use clear, student-friendly language.\n"
            "- Keep each question exam-style and specific.\n"
            "- Do not add long derivations.\n"
            "- Keep response complete and self-contained. Do not end mid-sentence.\n"
            "- Do not mention being an AI model.\n\n"
            f"Student query: {query}"
        )
        return call_openai(
            prompt,
            temperature=0.35,
            max_output_tokens=1200,
            thinking_budget=0,
        )

    prompt = (
        "You are an expert JEE tutor. Give clear, practical help for the student query.\n"
        "Rules:\n"
        "- Keep response concise (3-8 bullet points or short paragraphs).\n"
        "- Prioritize exam strategy, concept clarity, and common mistakes.\n"
        "- If relevant, include a short step-by-step method.\n"
        "- Keep response complete and self-contained. Do not end mid-sentence.\n"
        "- Do not mention being an AI model.\n\n"
        f"Student query: {query}"
    )
    return call_openai(
        prompt,
        temperature=0.35,
        max_output_tokens=900,
        thinking_budget=0,
    )


def _is_question_pattern_request(query: str) -> bool:
    lower = query.lower()
    return any(hint in lower for hint in QUESTION_PATTERN_HINTS)


def _extract_text(payload: dict[str, Any]) -> str:
    output_text = payload.get("output_text")
    if isinstance(output_text, str) and output_text.strip():
        return output_text.strip()

    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        choices = payload.get("choices")
        if not isinstance(choices, list):
            return ""
        for choice in choices:
            if not isinstance(choice, dict):
                continue
            message = choice.get("message")
            if not isinstance(message, dict):
                continue
            content = message.get("content")
            if isinstance(content, str) and content.strip():
                return content.strip()
            if isinstance(content, list):
                chunks: list[str] = []
                for part in content:
                    if not isinstance(part, dict):
                        continue
                    text = part.get("text")
                    if isinstance(text, str) and text.strip():
                        chunks.append(text.strip())
                if chunks:
                    return "\n".join(chunks).strip()
        return ""

    for candidate in candidates:
        content = candidate.get("content") if isinstance(candidate, dict) else None
        parts = content.get("parts") if isinstance(content, dict) else None
        if not isinstance(parts, list):
            continue
        chunks: list[str] = []
        for part in parts:
            if not isinstance(part, dict):
                continue
            text = part.get("text")
            if isinstance(text, str) and text.strip():
                chunks.append(text.strip())
        if chunks:
            return "\n".join(chunks).strip()
    return ""

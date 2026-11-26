"""Klien REST Gemini (generateContent) memakai httpx, tanpa SDK tambahan.

Keamanan:
- API key dikirim lewat header `x-goog-api-key`, BUKAN di URL, sehingga tidak masuk log URL.
- Pesan galat hanya memuat kategori + kode status; header & isi permintaan tidak pernah dicatat.
"""
import logging
import re

import httpx

log = logging.getLogger("hitunghemat.tutor")

BASE_URL = "https://generativelanguage.googleapis.com/v1beta"
MODEL_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

# Untuk uji otomatis: httpx.MockTransport. None = jaringan sungguhan.
transport: httpx.BaseTransport | None = None

SAFETY = [
    {"category": c, "threshold": "BLOCK_LOW_AND_ABOVE"}
    for c in (
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
    )
]


class GeminiError(Exception):
    """reason: timeout | network | quota | upstream | blocked | empty | config"""

    def __init__(self, reason: str, status: int | None = None):
        super().__init__(reason if status is None else f"{reason} ({status})")
        self.reason = reason
        self.status = status


def _client(timeout: float) -> httpx.Client:
    return httpx.Client(timeout=timeout, transport=transport)


def generate(system: str, user: str, *, api_key: str, model: str, timeout: float = 8.0) -> str:
    if not api_key or not MODEL_RE.match(model or ""):
        raise GeminiError("config")
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "safetySettings": SAFETY,
        "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512, "candidateCount": 1},
    }
    try:
        with _client(timeout) as c:
            r = c.post(f"{BASE_URL}/models/{model}:generateContent", headers={"x-goog-api-key": api_key}, json=body)
    except httpx.TimeoutException:
        raise GeminiError("timeout") from None
    except httpx.HTTPError:
        raise GeminiError("network") from None
    if r.status_code == 429:
        raise GeminiError("quota", 429)
    if r.status_code >= 400:
        raise GeminiError("upstream", r.status_code)
    try:
        data = r.json()
    except ValueError:
        raise GeminiError("upstream", r.status_code) from None
    if (data.get("promptFeedback") or {}).get("blockReason"):
        raise GeminiError("blocked")
    cands = data.get("candidates") or []
    if not cands:
        raise GeminiError("empty")
    if cands[0].get("finishReason") in ("SAFETY", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"):
        raise GeminiError("blocked")
    parts = (cands[0].get("content") or {}).get("parts") or []
    text = " ".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
    if not text:
        raise GeminiError("empty")
    return text


def list_models(*, api_key: str, timeout: float = 8.0) -> list[dict]:
    """Daftar model yang bisa dipakai key ini (untuk app.tools.gemini_check)."""
    if not api_key:
        raise GeminiError("config")
    try:
        with _client(timeout) as c:
            r = c.get(f"{BASE_URL}/models", headers={"x-goog-api-key": api_key}, params={"pageSize": 200})
    except httpx.TimeoutException:
        raise GeminiError("timeout") from None
    except httpx.HTTPError:
        raise GeminiError("network") from None
    if r.status_code >= 400:
        raise GeminiError("quota" if r.status_code == 429 else "upstream", r.status_code)
    return r.json().get("models", [])

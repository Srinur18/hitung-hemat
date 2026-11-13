import hashlib
import json
from functools import lru_cache

from .config import CONTENT_DIR

FILES = ("curriculum", "glossary", "diagnostic", "assessment", "literacy", "material", "journey", "shop")


@lru_cache
def load(name: str) -> dict:
    if name not in FILES:
        raise KeyError(name)
    return json.loads((CONTENT_DIR / f"{name}.json").read_text(encoding="utf-8"))


@lru_cache
def version() -> str:
    h = hashlib.sha256()
    for name in FILES:
        h.update((CONTENT_DIR / f"{name}.json").read_bytes())
    return h.hexdigest()[:12]

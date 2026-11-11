"""PRNG mulberry32 — identik bit-per-bit dengan frontend/src/domain/rng.js,
sehingga seed yang sama menghasilkan soal yang sama di Python dan JavaScript."""

MASK = 0xFFFFFFFF


def _imul(a: int, b: int) -> int:
    return (a * b) & MASK


def mulberry32(seed: int):
    state = seed & MASK

    def nxt() -> float:
        nonlocal state
        state = (state + 0x6D2B79F5) & MASK
        t = _imul(state ^ (state >> 15), state | 1)
        t = ((t + _imul(t ^ (t >> 7), t | 61)) & MASK) ^ t
        return ((t ^ (t >> 14)) & MASK) / 4294967296

    return nxt

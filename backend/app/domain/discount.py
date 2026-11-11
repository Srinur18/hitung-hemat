"""Fungsi diskon. Semua fungsi EKSAK: mengembalikan int, atau None bila hasil tidak bulat/tidak sah.

Generator soal menolak undian yang menghasilkan None, sehingga soal selalu berangka bulat.
"""
from fractions import Fraction

from .money import BP


def _int(x: Fraction) -> int | None:
    return int(x) if x.denominator == 1 and x >= 0 else None


def discount_amount(price: int, bp: int) -> int | None:
    return _int(Fraction(price * bp, BP))


def final_price(price: int, bp: int) -> int | None:
    d = discount_amount(price, bp)
    return None if d is None else subtract(price, d)


def subtract(a: int, b: int) -> int | None:
    return a - b if a >= b else None


def add(a: int, b: int) -> int:
    return a + b


def mul(a: int, k: int) -> int:
    return a * k


def div(a: int, k: int) -> int | None:
    return _int(Fraction(a, k)) if k else None


def complement_bp(bp: int) -> int | None:
    return BP - bp if 0 <= bp <= BP else None


def original_from_final(final: int, bp: int) -> int | None:
    if bp >= BP:
        return None
    return _int(Fraction(final * BP, BP - bp))


def percent_from_prices(original: int, final: int) -> int | None:
    if original <= 0 or final > original:
        return None
    return _int(Fraction((original - final) * BP, original))


def effective_bp(p1: int, p2: int) -> int | None:
    return _int(BP - Fraction((BP - p1) * (BP - p2), BP))


def stacked_final_price(price: int, pcts: list[int]) -> int | None:
    cur: int | None = price
    for p in pcts:
        if cur is None:
            return None
        cur = final_price(cur, p)
    return cur


def with_extras(final: int, tax_bp: int = 0, shipping: int = 0) -> int | None:
    tax = discount_amount(final, tax_bp)
    return None if tax is None else final + tax + shipping


# Registri nama fungsi yang boleh dipakai di template konten (tanpa eval).
FN = {
    "discountAmount": discount_amount,
    "finalPrice": final_price,
    "subtract": subtract,
    "add": add,
    "mul": mul,
    "div": div,
    "complementBp": complement_bp,
    "originalFromFinal": original_from_final,
    "percentFromPrices": percent_from_prices,
    "effectiveBp": effective_bp,
}

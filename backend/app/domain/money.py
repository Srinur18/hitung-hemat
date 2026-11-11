"""Format uang dan persen.

Konvensi: Rupiah = int, persen = basis point (Bp), 12,5% = 1250.
"""

BP = 10_000


def _trim(num: int, den: int) -> str:
    """num/den sebagai desimal Indonesia (koma), tanpa nol berlebih. den harus pangkat 10."""
    sign = "-" if num < 0 else ""
    num = abs(num)
    whole, frac = divmod(num, den)
    if frac == 0:
        return f"{sign}{whole}"
    width = len(str(den)) - 1
    return f"{sign}{whole},{str(frac).zfill(width).rstrip('0')}"


def format_rp(value: int) -> str:
    """120000 -> 'Rp120.000'"""
    return "Rp" + f"{value:,}".replace(",", ".")


def format_bp(bp: int) -> str:
    """1250 -> '12,5%'"""
    return _trim(bp, 100) + "%"


def pct_to_bp(pct: str | float | int) -> int:
    """'12,5' -> 1250"""
    if isinstance(pct, str):
        pct = pct.replace(",", ".").replace("%", "").strip()
    return round(float(pct) * 100)


def format_value(value, fmt: str | None) -> str:
    """Format placeholder: sama persis dengan frontend/src/domain/format.js."""
    if isinstance(value, str):
        return value
    if fmt in ("price", "discount", "result", "rupiah"):
        return format_rp(value)
    if fmt == "percent":
        return format_bp(value)
    if fmt == "plainpct":
        return _trim(value, 100)
    if fmt == "frac":
        return _trim(value, 100) + "/100"
    if fmt == "dec":
        return _trim(value, BP)
    if fmt == "milli":
        return _trim(value, 10)
    return str(value)

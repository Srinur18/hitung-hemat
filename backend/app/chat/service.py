
"""Layanan percakapan bebas Teman Mikir."""

from .. import config
from ..tutor import gemini
from ..tutor.service import limiter


SYSTEM_PROMPT = """
Kamu adalah Plum, teman belajar matematika dalam aplikasi Hitung Hemat.

Tugasmu:
1. Berkomunikasi dalam bahasa Indonesia yang ramah, alami, dan mudah dipahami.
2. Membantu siswa memahami matematika, terutama aritmatika sosial.
3. Membahas keuntungan, kerugian, harga beli, harga jual, diskon,
   persentase, bruto, neto, tara, dan materi matematika terkait.
4. Menjelaskan konsep secara bertahap menggunakan contoh sederhana.
5. Jika siswa belum memahami penjelasan, coba gunakan cara lain.
6. Jangan merendahkan atau menghakimi siswa.
7. Jika siswa meminta bantuan soal, bantu memahami prosesnya,
   bukan sekadar memberikan jawaban akhir.
8. Jawab sesuai pertanyaan dan jangan mengarang informasi.

Gunakan bahasa yang santai tetapi tetap sopan.
Hindari jawaban terlalu panjang jika tidak diperlukan.
"""


LIMIT_REPLY = {
    "daily_limit": "Plum sudah banyak menjawab hari ini dan perlu istirahat. Coba lagi besok, ya.",
    "session_limit": "Kamu sudah banyak bertanya hari ini. Coba lagi besok, atau pakai petunjuk di layar soal.",
}


def respond(message: str, history: list[dict], client_key: str = "local") -> dict:
    """Menghasilkan balasan Plum berdasarkan pesan dan riwayat chat.

    client_key = alamat IP pengirim (hanya untuk kuota di memori; tidak disimpan, tidak dikirim ke Gemini).
    """

    if not config.GEMINI_API_KEY or not config.GEMINI_MODEL:
        return {
            "reply": "Maaf, layanan Teman Mikir belum tersedia. Silakan coba lagi nanti.",
            "source": "fallback",
        }

    reason = limiter.take(f"chat:{client_key}", limit=config.CHAT_CLIENT_LIMIT)
    if reason:
        return {"reply": LIMIT_REPLY[reason], "source": "fallback"}

    conversation = []

    for item in history[-20:]:
        role = item.get("role")
        content = str(item.get("content", "")).strip()

        if role in ("user", "assistant") and content:
            label = "Siswa" if role == "user" else "Plum"
            conversation.append(f"{label}: {content}")

    conversation.append(f"Siswa: {message.strip()}")

    prompt = "\n".join(conversation)

    try:
        reply = gemini.generate(
            SYSTEM_PROMPT,
            prompt,
            api_key=config.GEMINI_API_KEY,
            model=config.GEMINI_MODEL,
            timeout=config.GEMINI_TIMEOUT,
        )

        return {
            "reply": reply,
            "source": "gemini",
        }

    except gemini.GeminiError:
        return {
            "reply": "Maaf, Plum sedang mengalami kendala. Coba kirim pesanmu sekali lagi, ya.",
            "source": "fallback",
        }

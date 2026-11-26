"""Teman Mikir: tutor mediasi berbasis RMT (interpretasi desain) dengan Gemini sebagai penyusun kalimat.

Prinsip:
- Benar/salah SELALU ditentukan domain eksak (app/domain, tidak diubah). Gemini tidak menilai.
- Mesin langkah (engine.py) memilih tahap mediasi secara deterministik dari konten tutor.json.
- Gemini hanya menyusun satu balasan ≤ 40 kata di dalam batas tahap itu; guard.py menolak
  balasan yang membocorkan angka kunci atau melanggar aturan beban kognitif, lalu memakai teks cadangan.
- Tidak ada identitas siswa yang diterima endpoint maupun dikirim ke Gemini.
"""

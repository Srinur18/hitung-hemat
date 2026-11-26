// @vitest-environment jsdom
// Tata letak menu Beranda: Teman Mikir tepat di bawah Mulai Belajar, lebar penuh, ikon bendera yang sama.
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { Home } from '../src/features/Home.jsx';

beforeAll(() => {
  HTMLCanvasElement.prototype.getContext = () => null;
  window.scrollTo = () => {};
});
afterEach(cleanup);

const menu = (onMenu = () => {}) => {
  const { container } = render(<Home profile={null} onMenu={onMenu} />);
  const nav = container.querySelector('nav.home-menu');
  return { nav, buttons: [...nav.querySelectorAll('button.menu-btn')] };
};
const label = (b) => b.querySelector('.menu-txt b').textContent;

describe('menu Beranda', () => {
  it('urutan: Mulai Belajar, Teman Mikir, lalu Materi, Simulasi Belanja, Kuis / Tes, Profil', () => {
    const { buttons } = menu();
    expect(buttons.map(label)).toEqual(['Mulai Belajar', 'Teman Mikir', 'Materi', 'Simulasi Belanja', 'Kuis / Tes', 'Profil']);
  });

  it('Teman Mikir lebar penuh; empat menu lain tetap kartu grid dua kolom', () => {
    const { buttons } = menu();
    const [start, chat, ...rest] = buttons;
    expect(start.classList.contains('menu-main')).toBe(true);
    expect(chat.classList.contains('menu-wide')).toBe(true);
    expect(chat.classList.contains('menu-main')).toBe(false); // warna kartunya sendiri (mint) tetap
    expect(chat.classList.contains('tone-mint')).toBe(true);
    for (const b of rest) {
      expect(b.classList.contains('menu-wide')).toBe(false);
      expect(b.classList.contains('menu-main')).toBe(false);
    }
  });

  it('judul & deskripsi Teman Mikir tetap', () => {
    const { buttons } = menu();
    expect(within(buttons[1]).getByText('Teman Mikir')).toBeTruthy();
    expect(within(buttons[1]).getByText('Diskusi matematika bersama Plum')).toBeTruthy();
  });

  it('ikon Teman Mikir = ikon bendera Mulai Belajar (komponen & path yang sama), bukan gelembung chat', () => {
    const { buttons } = menu();
    const svg = (b) => b.querySelector('.menu-ic svg').innerHTML;
    expect(svg(buttons[1])).toBe(svg(buttons[0]));
    for (const b of buttons.slice(2)) expect(svg(b)).not.toBe(svg(buttons[0]));
  });

  it('navigasi tiap menu tidak berubah', () => {
    vi.useFakeTimers();
    try {
      const onMenu = vi.fn();
      const { buttons } = menu(onMenu);
      for (const b of buttons) {
        fireEvent.click(b);
        vi.advanceTimersByTime(200);
      }
      expect(onMenu.mock.calls.map((c) => c[0])).toEqual(['start', 'chat', 'material', 'sim', 'test', 'profile']);
    } finally {
      vi.useRealTimers();
    }
  });
});

// Mengurai teks konten: {nama|format} = angka bertanda peran, [[istilah]] = kartu istilah.
import { formatValue } from './money.js';

const RE = /\{(\w+)(?:\|(\w+))?\}|\[\[([\w-]+)\]\]/g;
export const SIGNAL_ROLES = new Set(['price', 'percent', 'discount', 'result']);

/** @returns {Array<{type:'text',text:string}|{type:'num',name:string,role:string,value:any,text:string}|{type:'term',id:string}>} */
export function parseText(str, vars) {
  const out = [];
  let last = 0;
  for (const m of str.matchAll(RE)) {
    if (m.index > last) out.push({ type: 'text', text: str.slice(last, m.index) });
    if (m[3]) {
      out.push({ type: 'term', id: m[3] });
    } else {
      const [, name, fmt = 'plain'] = m;
      const value = vars[name];
      const role = SIGNAL_ROLES.has(fmt) ? fmt : name === 'item' ? 'item' : 'plain';
      out.push({ type: 'num', name, role, value, text: formatValue(value, fmt) });
    }
    last = m.index + m[0].length;
  }
  if (last < str.length) out.push({ type: 'text', text: str.slice(last) });
  return out;
}

export function fillText(str, vars, glossary = {}) {
  return parseText(str, vars)
    .map((s) => (s.type === 'term' ? glossary[s.id]?.term?.toLowerCase() ?? s.id : s.text))
    .join('');
}

export function refs(str) {
  return new Set([...String(str).matchAll(RE)].filter((m) => m[1]).map((m) => m[1]));
}

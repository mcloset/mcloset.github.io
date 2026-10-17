// Lê a "ficha" em texto que a IA de edição de fotos devolve e transforma nos campos da peça.
// Tudo o que vem da ficha é só um ponto de partida: você pode editar qualquer campo depois.
import { CATEGORIES, ESTAMPAS, OCASIOES, ESTILOS, CARTELAS, SEASONS, DETAIL_FIELDS } from './catalog.js';
import { FAMILIES, namedHex, nearestName, familyOfName, canonicalName, cartelaOfColors, familyOfColors } from './color.js';
import { norm } from './util.js';

const KEYS = [
  [/^codigo|^cod\b/, 'code'], [/^nome/, 'name'], [/^categoria/, 'categoria'], [/^(tipo|subcategoria)\b|^peca$/, 'tipo'],
  [/^cor(es)?$|^cores? /, 'cores'], [/^paleta/, 'paleta'], [/^cartela|^coloracao/, 'cartela'],
  [/^estampa$/, 'estampa'], [/^(clima|estacao do ano)/, 'clima'],
  [/^ocasi/, 'ocasioes'], [/^estilo/, 'estilo'], [/^marca/, 'marca'], [/^material$/, 'material'],
  [/^piramide/, 'piramide'], [/^tamanho$/, 'size'], [/^descri/, 'descricao'], [/^prompt/, 'promptImg'], [/^observ/, 'notes'],
];
const letters = s => norm(s).replace(/[^a-z]/g, '');
const DETAIL_KEYS = DETAIL_FIELDS.map(d => [letters(d.name), d.id]);

export function looksLikeFicha(text) {
  return /(categoria|cores?|tipo)\s*[:：]/i.test(text || '');
}

function keyOf(label) {
  const k = norm(label), l = letters(label);
  // campos que o próprio app escreve ao exportar e que não voltam para a peça
  if (/^(pessoa|uso|situacao|preco pago|custo por uso)$/.test(k)) return 'ignore';
  const exact = DETAIL_KEYS.find(([n]) => n === l);
  if (exact) return 'd:' + exact[1];
  const hit = KEYS.find(([re]) => re.test(k));
  if (hit) return hit[1];
  const pre = DETAIL_KEYS.find(([n]) => l.length >= 5 && (n.startsWith(l) || l.startsWith(n.slice(0, 8))));
  return pre ? 'd:' + pre[1] : null;
}

// Um arquivo de texto pode ter várias fichas (ex.: a conversa inteira com a IA). Separa uma por peça.
export function splitFichas(text) {
  const t = String(text || '');
  const blocks = [...t.matchAll(/```[a-z]*\n?([\s\S]*?)```/gi)].map(m => m[1]).filter(b => /categoria\s*[:：]/i.test(b));
  if (blocks.length) return blocks;
  const parts = t.split(/^(?=[ \t]*[#*]*[ \t]*FICHA\b)/im).filter(p => /categoria\s*[:：]/i.test(p));
  return parts.length ? parts : (/categoria\s*[:：]/i.test(t) ? [t] : []);
}

export function parseFicha(text) {
  const header = String(text || '').match(/^[ \t]*[#*]*[ \t]*FICHA[ \t]+([A-Za-z0-9][\w.-]*)/im);
  const f = parseFichaBody(text);
  if (!f.code && header && !/^\[|^codigo$/i.test(header[1])) f.code = header[1].toUpperCase();
  return f;
}

function parseFichaBody(text) {
  let t = String(text || '');
  // se a IA mandou o texto dentro de um bloco de código, usa só o bloco da ficha
  const blocks = [...t.matchAll(/```[a-z]*\n?([\s\S]*?)```/gi)].map(m => m[1]);
  const block = blocks.find(b => /categoria\s*[:：]/i.test(b));
  if (block) t = block;
  const raw = {}, det = {};
  let last = null;
  for (const line of t.split(/\r?\n/)) {
    const clean = line.replace(/\*\*/g, '').trim();
    if (!clean || /^```/.test(clean) || /^ficha\b/i.test(clean)) { if (!clean) last = last; continue; }
    const m = clean.match(/^[-*•]?\s*([^:：]{2,45}?)\s*[:：]\s*(.*)$/);
    const key = m ? keyOf(m[1]) : null;
    if (key === 'ignore') { last = null; continue; }
    if (key) {
      const v = m[2].trim();
      if (key.startsWith('d:')) { det[key.slice(2)] = v; last = { obj: det, k: key.slice(2) }; }
      else if (!raw[key]) { raw[key] = v; last = { obj: raw, k: key }; }
      else last = null;
    } else if (m && !['descricao', 'promptImg', 'notes'].includes(last?.k)) {
      last = null;   // campo que o app não usa (ex.: "Pessoa:", "Uso:") — ignora
    } else if (last) {
      // continuação da linha anterior (descrições longas em vários parágrafos)
      last.obj[last.k] = (last.obj[last.k] ? last.obj[last.k] + (/[.!?]$/.test(last.obj[last.k]) ? ' ' : ' ') : '') + clean.replace(/^[-*•]\s*/, '');
    }
  }
  const f = toFields(raw);
  const detalhes = {};
  for (const [k, v] of Object.entries(det)) if (!empty(v) && !/^nao visivel/.test(norm(v))) detalhes[k] = v;
  if (Object.keys(detalhes).length) f.detalhes = detalhes;
  if (raw.descricao && !empty(raw.descricao)) f.descricao = raw.descricao;
  if (raw.promptImg && !empty(raw.promptImg)) f.promptImg = raw.promptImg;
  if (raw.code && !empty(raw.code) && !/escreva/i.test(raw.code)) f.code = raw.code.replace(/[\[\]]/g, '').trim().toUpperCase();
  return f;
}

const empty = v => !v || /^(-|—|nao|não|n\/a|nenhum|nenhuma|desconhecid|nao visivel|não visível)/i.test(norm(v));

function toFields(r) {
  const f = {};
  if (r.name && !empty(r.name)) f.name = r.name;
  // categoria e subcategoria
  let cat = null, sub = '';
  if (r.categoria) cat = CATEGORIES.find(c => norm(c.name).includes(norm(r.categoria)) || norm(r.categoria).includes(norm(c.name)));
  if (r.tipo) {
    const t = norm(r.tipo);
    const pool = cat ? [cat, ...CATEGORIES.filter(c => c !== cat)] : CATEGORIES;
    outer: for (const c of pool) for (const s of c.subs) {
      const ns = norm(s);
      if (ns === t || t.includes(ns) || ns.includes(t)) { sub = s; if (!cat) cat = c; break outer; }
    }
    if (!sub) sub = r.tipo;
  }
  if (!cat && r.categoria) {
    const t = norm(r.categoria);
    for (const c of CATEGORIES) if (c.subs.some(s => t.includes(norm(s)))) { cat = c; break; }
  }
  if (cat) f.category = cat.id;
  if (sub) f.sub = sub;
  if (!f.name && sub) f.name = sub;

  if (r.cores) {
    const colors = [];
    for (const part of r.cores.split(/[;,]|\s+e\s+/i)) {
      const p = part.trim(); if (!p) continue;
      const hex = (p.match(/#([0-9a-f]{6}|[0-9a-f]{3})\b/i) || [])[0];
      const pct = +(p.match(/(\d{1,3})\s*%/) || [])[1] || 0;
      const written = p.replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/ig, '').replace(/\(?\s*\d{1,3}\s*%\s*\)?/g, '').replace(/[()]/g, '').trim();
      let h = hex ? hex.toUpperCase() : null;
      if (h && h.length === 4) h = '#' + h.slice(1).split('').map(c => c + c).join('');
      // o nome oficial vem da lista do app; se a IA inventou outro nome, usa o mais próximo pelo código da cor
      const name = canonicalName(written) || (h ? nearestName(h).name : null);
      if (!name) continue;
      h = h || namedHex(name);
      colors.push({ hex: h, name, family: familyOfName(name) || nearestName(h).family, pct });
      if (colors.length >= 4) break;
    }
    if (colors.length) {
      const sum = colors.reduce((s, c) => s + c.pct, 0);
      if (!sum) colors.forEach(c => c.pct = Math.round(100 / colors.length));
      f.colors = colors;
      f.family = familyOfColors(colors);
      f.cartela = cartelaOfColors(colors);
    }
  }
  if (r.paleta && !empty(r.paleta)) {
    const t = norm(r.paleta);
    if (/estamp|colorid|multi/.test(t)) f.family = 'estampado';
    else { const fam = Object.entries(FAMILIES).find(([, n]) => t.includes(norm(n).slice(0, 5))); if (fam) f.family = fam[0]; }
  }
  if (r.cartela && !empty(r.cartela)) {
    const t = norm(r.cartela);
    const c = CARTELAS.find(c => t.includes(norm(c.name))) || CARTELAS.find(c => t.startsWith(norm(c.name).split(' ')[0]) && t.includes(norm(c.name).split(' ')[1].slice(0, 4)));
    if (c) f.cartela = c.id;
    else { const s = SEASONS.find(s => t.includes(norm(s.name))); if (s && !(f.cartela || '').startsWith(s.id)) f.cartela = s.id + '-' + { primavera: 'clara', verao: 'suave', outono: 'quente', inverno: 'frio' }[s.id]; }
  }
  if (r.estampa && !empty(r.estampa)) {
    const t = norm(r.estampa);
    f.estampa = /^lis[ao]\b/.test(t) ? 'Lisa' : (ESTAMPAS.find(e => t.includes(norm(e).slice(0, 5))) || 'Outra estampa');
  } else if (r.estampa) f.estampa = 'Lisa';
  if (r.clima) {
    const t = norm(r.clima), c = [];
    if (/ano todo|todas|qualquer/.test(t)) c.push('calor', 'meia', 'frio');
    else {
      if (/calor|verao|quente/.test(t)) c.push('calor');
      if (/meia|outono|primavera|ameno/.test(t)) c.push('meia');
      if (/frio|inverno/.test(t)) c.push('frio');
    }
    if (c.length) f.climas = c;
  }
  if (r.ocasioes) {
    const t = norm(r.ocasioes);
    const oc = OCASIOES.filter(o => t.includes(norm(o)));
    if (oc.length) f.ocasioes = oc;
  }
  if (r.estilo) { const t = norm(r.estilo); const e = ESTILOS.find(x => t.includes(norm(x))); if (e) f.estilo = e; }
  if (r.piramide) {
    const t = norm(r.piramide);
    f.piramide = /topo|cereja/.test(t) ? 'topo' : /meio|coringa/.test(t) ? 'meio' : /base|basic/.test(t) ? 'base' : undefined;
    if (!f.piramide) delete f.piramide;
  }
  if (r.marca && !empty(r.marca)) f.brand = r.marca;
  if (r.size && !empty(r.size)) f.size = r.size;
  const notes = [r.material && !empty(r.material) ? 'Material: ' + r.material : '', r.notes && !empty(r.notes) ? r.notes : ''].filter(Boolean).join('\n');
  if (notes) f.notes = notes;
  return f;
}

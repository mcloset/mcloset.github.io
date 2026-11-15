// Detecção de cores na foto (roda no próprio aparelho, sem internet) e regras de combinação.

export const FAMILIES = {
  neutros: 'Neutros', terrosos: 'Terrosos', pasteis: 'Pastéis', vibrantes: 'Vibrantes',
  profundos: 'Profundos', metalicos: 'Metálicos',
};

// Lista FIXA de cores do app. O prompt da IA manda escolher só destes nomes,
// assim o que a IA devolve sempre bate com o que o app conhece.
export const NAMED = [
  // Neutros
  ['Branco', '#FFFFFF', 'neutros'], ['Off-white', '#F4EFE6', 'neutros'], ['Creme', '#EFE2C4', 'neutros'],
  ['Areia', '#D8C6A8', 'neutros'], ['Bege', '#CDB592', 'neutros'], ['Nude', '#E2B99B', 'neutros'],
  ['Cinza claro', '#CACACA', 'neutros'], ['Cinza', '#8C8C8C', 'neutros'], ['Grafite', '#3E4146', 'neutros'],
  ['Preto', '#141414', 'neutros'], ['Azul marinho', '#1F2A48', 'neutros'],
  ['Jeans claro', '#9DB4CF', 'neutros'], ['Jeans', '#5876A0', 'neutros'], ['Jeans escuro', '#2F4466', 'neutros'],
  // Terrosos
  ['Camel', '#B8875A', 'terrosos'], ['Caramelo', '#C08A4E', 'terrosos'], ['Cáqui', '#B5A47A', 'terrosos'],
  ['Marrom', '#7A4E2D', 'terrosos'], ['Chocolate', '#4A2E22', 'terrosos'], ['Terracota', '#C2653F', 'terrosos'],
  ['Ferrugem', '#A4502A', 'terrosos'], ['Tijolo', '#9C4A3A', 'terrosos'], ['Ocre', '#CC8E35', 'terrosos'],
  ['Mostarda', '#C9A12B', 'terrosos'], ['Verde oliva', '#77743A', 'terrosos'], ['Verde militar', '#4E5434', 'terrosos'],
  ['Verde musgo', '#5E6B3A', 'terrosos'],
  // Pastéis
  ['Rosa bebê', '#F6D3DA', 'pasteis'], ['Rosa chá', '#E8B4A8', 'pasteis'], ['Azul bebê', '#BCD8EE', 'pasteis'],
  ['Azul serenity', '#9FB4D8', 'pasteis'], ['Lilás', '#C6AEDC', 'pasteis'], ['Lavanda', '#B9A7D9', 'pasteis'],
  ['Verde menta', '#AEE0C6', 'pasteis'], ['Verde água', '#9ED9CC', 'pasteis'], ['Amarelo manteiga', '#F6E7A1', 'pasteis'],
  ['Pêssego', '#F7C6A3', 'pasteis'], ['Salmão', '#F4A88E', 'pasteis'],
  // Vibrantes
  ['Vermelho', '#C8242F', 'vibrantes'], ['Coral', '#F06F5E', 'vibrantes'], ['Goiaba', '#E9667A', 'vibrantes'],
  ['Laranja', '#EE7A2C', 'vibrantes'], ['Amarelo', '#F3C623', 'vibrantes'], ['Rosa', '#E77C9C', 'vibrantes'],
  ['Pink', '#E0287F', 'vibrantes'], ['Fúcsia', '#C21E78', 'vibrantes'], ['Azul celeste', '#4FA3E0', 'vibrantes'],
  ['Azul royal', '#2D4FC1', 'vibrantes'], ['Turquesa', '#20B2AA', 'vibrantes'], ['Verde bandeira', '#1E8A3E', 'vibrantes'],
  ['Verde limão', '#A6D63B', 'vibrantes'],
  // Profundos
  ['Vinho', '#6A1B2E', 'profundos'], ['Marsala', '#8B3A44', 'profundos'], ['Bordô', '#8A1E3A', 'profundos'],
  ['Berinjela', '#4B2240', 'profundos'], ['Roxo', '#5E2E8C', 'profundos'], ['Verde esmeralda', '#0F6B4F', 'profundos'],
  ['Azul petróleo', '#1D4F5C', 'profundos'],
  // Metálicos
  ['Dourado', '#C8A54B', 'metalicos'], ['Prateado', '#BFC4C9', 'metalicos'], ['Rosé gold', '#C99A86', 'metalicos'],
];
// nomes que a IA (ou você) pode escrever diferente
export const ALIASES = {
  'rosa claro': 'Rosa bebê', 'azul claro': 'Azul bebê', 'azul': 'Azul celeste', 'verde': 'Verde bandeira',
  'cinza escuro': 'Grafite', 'chumbo': 'Grafite', 'offwhite': 'Off-white', 'off white': 'Off-white', 'camelo': 'Camel',
  'azul turquesa': 'Turquesa', 'petroleo': 'Azul petróleo', 'petróleo': 'Azul petróleo', 'amarelo claro': 'Amarelo manteiga',
  'cinza mescla': 'Cinza', 'bordo': 'Bordô', 'fucsia': 'Fúcsia', 'marrom claro': 'Caramelo', 'kaki': 'Cáqui', 'caqui': 'Cáqui',
  'denim': 'Jeans', 'azul jeans': 'Jeans', 'azul navy': 'Azul marinho', 'navy': 'Azul marinho', 'cobre': 'Ferrugem',
};

export function hexToRgb(h) {
  h = String(h || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase();

const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
export function rgbToLab([r, g, b]) {
  const R = lin(r), G = lin(g), B = lin(b);
  const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const Y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116;
  return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
export const deltaE = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
export const hexLab = hex => rgbToLab(hexToRgb(hex));

export function rgbToHsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  let h = 0, s = 0; const l = (mx + mn) / 2;
  if (mx !== mn) {
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    if (mx === r) h = ((g - b) / d + (g < b ? 6 : 0));
    else if (mx === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}

const NAMED_LAB = NAMED.map(([name, hex, family]) => ({ name, hex, family, lab: hexLab(hex) }));
export function nearestName(hex) {
  const lab = hexLab(hex);
  let best = NAMED_LAB[0], bd = Infinity;
  for (const n of NAMED_LAB) { const d = deltaE(lab, n.lab); if (d < bd) { bd = d; best = n; } }
  return { name: best.name, family: best.family };
}
const plain = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
// devolve o nome oficial da lista para um nome escrito de qualquer jeito
export function canonicalName(name) {
  const p = plain(name);
  if (!p) return null;
  const exact = NAMED.find(n => plain(n[0]) === p);
  if (exact) return exact[0];
  const alias = Object.entries(ALIASES).find(([k]) => plain(k) === p);
  if (alias) return alias[1];
  const start = NAMED.filter(n => p.startsWith(plain(n[0]))).sort((a, b) => b[0].length - a[0].length)[0];
  return start ? start[0] : null;
}
export const namedHex = name => { const c = canonicalName(name); return c ? NAMED.find(n => n[0] === c)[1] : undefined; };
export const familyOfName = name => { const c = canonicalName(name); return c ? NAMED.find(n => n[0] === c)[2] : undefined; };

// ---------- detecção ----------
export function detectColors(data, w, h) {
  const N = w * h;
  // cor do fundo = média da borda
  let sr = 0, sg = 0, sb = 0, n = 0;
  const border = [];
  for (let x = 0; x < w; x++) { border.push(x, (h - 1) * w + x); }
  for (let y = 0; y < h; y++) { border.push(y * w, y * w + w - 1); }
  for (const p of border) { const i = p * 4; sr += data[i]; sg += data[i + 1]; sb += data[i + 2]; n++; }
  const bgc = [sr / n, sg / n, sb / n];
  const bgLike = p => {
    const i = p * 4;
    if (data[i + 3] < 20) return true;
    return Math.hypot(data[i] - bgc[0], data[i + 1] - bgc[1], data[i + 2] - bgc[2]) < 30;
  };
  // "inundação" a partir da borda para separar o fundo da peça
  const mask = new Uint8Array(N);
  const stack = border.filter(bgLike);
  while (stack.length) {
    const p = stack.pop();
    if (mask[p]) continue;
    mask[p] = 1;
    const x = p % w, y = (p - x) / w;
    if (x > 0 && !mask[p - 1] && bgLike(p - 1)) stack.push(p - 1);
    if (x < w - 1 && !mask[p + 1] && bgLike(p + 1)) stack.push(p + 1);
    if (y > 0 && !mask[p - w] && bgLike(p - w)) stack.push(p - w);
    if (y < h - 1 && !mask[p + w] && bgLike(p + w)) stack.push(p + w);
  }
  let fg = [];
  for (let p = 0; p < N; p++) if (!mask[p] && data[p * 4 + 3] >= 20) fg.push(p);
  if (fg.length < N * 0.03) {
    fg = [];
    for (let p = 0; p < N; p++) { const i = p * 4; if (!(data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240)) fg.push(p); }
  }
  if (fg.length < N * 0.01) fg = [...Array(N).keys()];
  const step = Math.max(1, Math.floor(fg.length / 5000));
  const rgb = [], lab = [];
  for (let k = 0; k < fg.length; k += step) {
    const i = fg[k] * 4; const c = [data[i], data[i + 1], data[i + 2]];
    rgb.push(c); lab.push(rgbToLab(c));
  }
  // k-means em Lab
  const K = Math.min(5, lab.length);
  const order = lab.map((_, i) => i).sort((a, b) => lab[a][0] - lab[b][0]);
  let centers = Array.from({ length: K }, (_, j) => [...lab[order[Math.floor((j + 0.5) * order.length / K)]]]);
  const assign = new Int32Array(lab.length);
  for (let it = 0; it < 12; it++) {
    for (let i = 0; i < lab.length; i++) {
      let b = 0, bd = Infinity;
      for (let j = 0; j < K; j++) { const d = deltaE(lab[i], centers[j]); if (d < bd) { bd = d; b = j; } }
      assign[i] = b;
    }
    const acc = centers.map(() => [0, 0, 0, 0]);
    for (let i = 0; i < lab.length; i++) { const a = acc[assign[i]]; a[0] += lab[i][0]; a[1] += lab[i][1]; a[2] += lab[i][2]; a[3]++; }
    centers = acc.map((a, j) => a[3] ? [a[0] / a[3], a[1] / a[3], a[2] / a[3]] : centers[j]);
  }
  let clusters = centers.map(() => ({ r: 0, g: 0, b: 0, n: 0 }));
  for (let i = 0; i < rgb.length; i++) { const c = clusters[assign[i]]; c.r += rgb[i][0]; c.g += rgb[i][1]; c.b += rgb[i][2]; c.n++; }
  clusters = clusters.filter(c => c.n).map(c => { const m = [c.r / c.n, c.g / c.n, c.b / c.n]; return { rgb: m, lab: rgbToLab(m), n: c.n }; });
  // junta tons muito parecidos
  let merged = true;
  while (merged && clusters.length > 1) {
    merged = false;
    outer: for (let i = 0; i < clusters.length; i++) for (let j = i + 1; j < clusters.length; j++) {
      if (deltaE(clusters[i].lab, clusters[j].lab) < 14) {
        const a = clusters[i], b = clusters[j], t = a.n + b.n;
        const m = a.rgb.map((v, k) => (v * a.n + b.rgb[k] * b.n) / t);
        clusters[i] = { rgb: m, lab: rgbToLab(m), n: t };
        clusters.splice(j, 1); merged = true; break outer;
      }
    }
  }
  const total = clusters.reduce((s, c) => s + c.n, 0);
  clusters.forEach(c => c.pct = c.n / total);
  // descarta sombras claras e acinzentadas que sobraram do fundo branco
  const bgLight = rgbToLab(bgc)[0] > 85;
  let keep = clusters.filter(c => {
    const chroma = Math.hypot(c.lab[1], c.lab[2]);
    if (bgLight && c.lab[0] > 78 && chroma < 8 && c.pct < 0.25) return false;
    return c.pct >= 0.06;
  });
  if (!keep.length) keep = clusters;
  keep.sort((a, b) => b.n - a.n);
  keep = keep.slice(0, 3);
  const t2 = keep.reduce((s, c) => s + c.n, 0);
  return keep.map(c => {
    const hex = rgbToHex(...c.rgb);
    const nm = nearestName(hex);
    return { hex, name: nm.name, family: nm.family, pct: Math.round(c.n / t2 * 100) };
  });
}

// ---------- cartela de coloração pessoal ----------
// Devolve uma das 12 cartelas (ex.: "outono-profundo") pela temperatura, profundidade e intensidade da cor.
export function cartelaOfHex(hex) {
  const [L, a, b] = hexLab(hex);
  const C = Math.hypot(a, b);
  if (C < 8) {
    if (L > 93) return 'inverno-frio';
    if (L < 22) return 'inverno-profundo';
    if (b > 3) return L < 55 ? 'outono-profundo' : L < 78 ? 'outono-suave' : 'primavera-clara';
    return L > 70 ? 'verao-claro' : L > 40 ? 'verao-suave' : 'inverno-frio';
  }
  let hue = Math.atan2(b, a) * 180 / Math.PI; if (hue < 0) hue += 360;
  const [hh, hs, hl] = rgbToHsl(hexToRgb(hex));
  // vermelhos puxados para o azul (vermelho puro, cereja) são frios
  const warm = hue >= 22 && hue <= 125 && !(hh >= 340 && hs > 0.55);
  // primavera = quentes limpas/vivas ou bem claras; outono = quentes "rebaixadas" (terracota, mostarda, camel)
  const season = warm
    ? (L > 78 || (hs > 0.72 && hl > 0.5) ? 'primavera' : 'outono')
    : ((L > 62 && C <= 42) || L > 75 ? 'verao' : 'inverno');
  const clamp = v => Math.max(-1, Math.min(1.6, v));
  const s = {
    light: clamp((L - 65) / 20), deep: clamp((50 - L) / 18),
    bright: clamp((C - 50) / 20), soft: clamp((35 - C) / 15),
    temp: clamp(warm ? 1 - Math.abs(hue - 65) / 45 : 1 - Math.abs(hue - 265) / 60),
  };
  const opts = {
    primavera: [['clara', s.light], ['quente', s.temp], ['brilhante', s.bright]],
    verao: [['claro', s.light], ['frio', s.temp], ['suave', s.soft]],
    outono: [['suave', s.soft], ['quente', s.temp], ['profundo', s.deep]],
    inverno: [['brilhante', s.bright], ['frio', s.temp], ['profundo', s.deep]],
  }[season];
  return season + '-' + opts.sort((x, y) => y[1] - x[1])[0][0];
}
export function cartelaOfColors(colors) {
  if (!colors?.length) return '';
  const main = colors.find(c => !isNeutralFamily(c.family) && c.pct >= 25) || colors[0];
  return cartelaOfHex(main.hex);
}
export function familyOfColors(colors) {
  if (!colors?.length) return '';
  const vivid = colors.filter(c => !isNeutralFamily(c.family) && c.pct >= 20);
  if (vivid.length >= 2) return 'estampado';
  return colors[0].family;
}

// ---------- paletas para looks em grupo ----------
const BLUES = ['Azul marinho', 'Jeans claro', 'Jeans', 'Jeans escuro', 'Azul bebê', 'Azul serenity', 'Azul celeste', 'Azul royal', 'Azul petróleo', 'Turquesa'];
const LIGHT_NEUTRALS = ['Branco', 'Off-white', 'Creme', 'Areia', 'Bege', 'Nude', 'Cinza claro'];
export const GROUP_PALETTES = [
  { id: '', name: 'Livre', desc: 'só pela harmonia das cores' },
  { id: 'neutros', name: 'Neutros', desc: 'branco, bege, cinza, preto, marinho, jeans', families: ['neutros', 'metalicos'] },
  { id: 'terrosos', name: 'Terrosos', desc: 'camel, caramelo, terracota, oliva + neutros', families: ['terrosos', 'neutros', 'metalicos'] },
  { id: 'pasteis', name: 'Pastéis', desc: 'rosa bebê, azul bebê, lilás, menta + claros', families: ['pasteis', 'metalicos'], names: LIGHT_NEUTRALS },
  { id: 'vibrantes', name: 'Vibrantes', desc: 'vermelho, pink, laranja, royal + neutros', families: ['vibrantes', 'neutros', 'metalicos'] },
  { id: 'profundos', name: 'Profundos', desc: 'vinho, marsala, esmeralda, petróleo + neutros', families: ['profundos', 'neutros', 'metalicos'] },
  { id: 'pb', name: 'Preto e branco', desc: 'preto, branco, off-white, cinzas', names: ['Preto', 'Branco', 'Off-white', 'Cinza claro', 'Cinza', 'Grafite', 'Prateado'] },
  { id: 'azul', name: 'Azul e branco', desc: 'todos os azuis e jeans + branco', names: [...BLUES, 'Branco', 'Off-white', 'Creme', 'Prateado', 'Dourado'] },
  { id: 'tom', name: 'Tom sobre tom', desc: 'todo mundo na mesma cor (escolha a cor)' },
];
// quanto (0 a 1) das cores da peça está dentro da paleta
export function paletteFit(it, palId, baseHex) {
  const pal = GROUP_PALETTES.find(p => p.id === palId);
  const cols = it.colors || [];
  if (!pal || !pal.id || !cols.length) return 1;
  let total = 0, inside = 0;
  for (const c of cols) {
    const w = c.pct || 1; total += w;
    const nm = canonicalName(c.name) || nearestName(c.hex).name;
    const fam = c.family || familyOfName(nm);
    let ok;
    if (pal.id === 'tom') {
      if (!baseHex) ok = true;
      else if (isNeutralFamily(fam)) ok = true;
      else { let d = Math.abs(rgbToHsl(hexToRgb(c.hex))[0] - rgbToHsl(hexToRgb(baseHex))[0]); if (d > 180) d = 360 - d; ok = d <= 28; }
    } else ok = (pal.families || []).includes(fam) || (pal.names || []).includes(nm);
    if (ok) inside += w;
  }
  return inside / total;
}

// ---------- combinação ----------
export const isNeutralFamily = f => f === 'neutros' || f === 'metalicos';

function pairScore(c1, c2) {
  if (isNeutralFamily(c1.family) || isNeutralFamily(c2.family)) return { s: 86, k: 'neutro' };
  const [h1, s1, l1] = rgbToHsl(hexToRgb(c1.hex));
  const [h2, s2, l2] = rgbToHsl(hexToRgb(c2.hex));
  if (s1 < 0.18 || s2 < 0.18) return { s: 80, k: 'neutro' };
  let d = Math.abs(h1 - h2); if (d > 180) d = 360 - d;
  const pastel = c1.family === 'pasteis' && c2.family === 'pasteis';
  let r;
  if (d <= 18) r = { s: 92, k: 'tom sobre tom' };
  else if (d <= 50) r = { s: 82, k: 'cores análogas' };
  else if (d >= 150) r = { s: 76, k: 'complementares' };
  else if (d >= 105 && d <= 135) r = { s: 64, k: 'tríade' };
  else if (s1 > 0.55 && s2 > 0.55 && l1 > 0.3 && l1 < 0.72 && l2 > 0.3 && l2 < 0.72) r = { s: 38, k: 'contraste forte' };
  else r = { s: 52, k: 'contraste' };
  if (pastel) r.s = Math.min(95, r.s + 10);
  if (c1.family === 'terrosos' && c2.family === 'terrosos') r.s = Math.min(95, r.s + 8);
  return r;
}

const patterned = it => it.estampa && it.estampa !== 'Lisa';

export function itemScore(a, b) {
  const ca = (a.colors || []).slice(0, 2), cb = (b.colors || []).slice(0, 2);
  let score = 72, kind = '';
  if (ca.length && cb.length) {
    let ws = 0, wt = 0, best = null;
    for (const x of ca) for (const y of cb) {
      const p = pairScore(x, y), w = (x.pct || 50) * (y.pct || 50);
      ws += p.s * w; wt += w;
      if (!best || w > best.w) best = { w, k: p.k };
    }
    score = ws / wt; kind = best.k;
  }
  if (patterned(a) && patterned(b)) score -= 15;
  const cla = a.climas || [], clb = b.climas || [];
  if (cla.length && clb.length && !cla.some(c => clb.includes(c))) score -= 20;
  if (a.estilo && a.estilo === b.estilo) score += 4;
  if ((a.ocasioes || []).some(o => (b.ocasioes || []).includes(o))) score += 4;
  return { score: Math.max(0, Math.min(100, Math.round(score))), kind };
}

export function scoreAgainst(item, others) {
  const list = others.filter(o => o.id !== item.id);
  if (!list.length) return null;
  const rs = list.map(o => itemScore(item, o));
  const avg = rs.reduce((s, r) => s + r.score, 0) / rs.length;
  const kinds = rs.map(r => r.kind).filter(Boolean);
  return { score: Math.round(avg), kind: kinds[0] || '' };
}

// "Consultoria" do look feita por regras, sem IA paga
export function analyzeLook(items) {
  const notes = [];
  if (items.length < 2) return { score: null, notes: ['Adicione pelo menos duas peças para analisar o look.'] };
  let sum = 0, cnt = 0;
  const per = items.map(it => {
    const r = scoreAgainst(it, items);
    sum += r.score; cnt++;
    return { it, s: r.score };
  });
  const score = Math.round(sum / cnt);
  if (score >= 80) notes.push('✨ Ótima harmonia: as cores conversam muito bem entre si.');
  else if (score >= 65) notes.push('👍 Boa combinação no geral.');
  else notes.push('🤔 As peças disputam atenção — vale trocar alguma.');
  const weakest = per.sort((a, b) => a.s - b.s)[0];
  if (weakest && weakest.s < 62) notes.push(`A peça “${weakest.it.name}” é a que menos combina com as outras.`);

  const vivid = [];
  for (const it of items) {
    const c = (it.colors || [])[0];
    if (!c || isNeutralFamily(c.family)) continue;
    const h = rgbToHsl(hexToRgb(c.hex))[0];
    if (!vivid.some(v => { let d = Math.abs(v - h); if (d > 180) d = 360 - d; return d < 25; })) vivid.push(h);
  }
  if (vivid.length === 0) notes.push('Look todo em neutros: elegante e fácil. Um acessório colorido pode dar vida.');
  else if (vivid.length === 1) notes.push('Uma cor de destaque com neutros: combinação segura e equilibrada.');
  else if (vivid.length === 2) notes.push('Duas cores de destaque: fica ótimo se forem análogas ou complementares.');
  else if (vivid.length === 3) notes.push('Três cores de destaque: é o limite para o look não ficar carregado.');
  else notes.push(`São ${vivid.length} cores de destaque — tente manter no máximo 3 no mesmo look.`);

  const prints = items.filter(patterned);
  if (prints.length >= 2) notes.push('Mais de uma estampa: funciona melhor quando elas repetem uma mesma cor.');
  const onlyHot = items.some(i => (i.climas || []).length && !i.climas.includes('frio') && !i.climas.includes('meia'));
  const onlyCold = items.some(i => (i.climas || []).length && !i.climas.includes('calor') && !i.climas.includes('meia'));
  if (onlyHot && onlyCold) notes.push('Mistura peças de calor e de frio — confira se faz sentido para o dia.');
  const topo = items.filter(i => i.piramide === 'topo').length;
  const base = items.filter(i => i.piramide === 'base').length;
  if (topo >= 3) notes.push('Muitas “cerejas do bolo” juntas: escolha uma para ser a protagonista.');
  else if (topo === 0 && base >= 3) notes.push('Só peças básicas: que tal uma cereja do bolo para finalizar?');
  const cats = new Set(items.map(i => i.category));
  const roupa = ['cima', 'baixo', 'unicas', 'praia', 'fitness'].some(c => cats.has(c));
  if (roupa && !cats.has('calcados')) notes.push('Falta escolher o calçado.');
  if (roupa && !cats.has('bolsas') && !cats.has('joias') && !cats.has('acessorios')) notes.push('Um acessório (bolsa, brinco, colar) ajuda a finalizar.');
  return { score, notes };
}

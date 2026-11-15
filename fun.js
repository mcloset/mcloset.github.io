// Cartão "Hoje" (tempo + o que vestir), medidor de felicidade, meta de aproveitamento,
// desafio sem compras e comparação com o ano passado.
import { S, saveSettings, isActive, itemUsage } from './store.js';
import { todayWeather, wearRecs, weatherIcon, climaFromTemp, searchCity } from './weather.js';
import { icon, openSheet, closeSheet, nav, chips } from './ui.js';
import { $, esc, brl, todayStr, addDays, daysBetween, fmtDate, toast } from './util.js';

export const HAPPY_NAMES = ['Marido', 'Esposa', 'Pai', 'Mãe', 'Cartão', 'Namorado', 'Namorada', 'Bolso'];
const LEVELS = [
  { min: 90, e: '😍', t: '{n} está apaixonado! Já está planejando um jantar.' },
  { min: 75, e: '😄', t: '{n} está feliz da vida — nem abriu a fatura.' },
  { min: 60, e: '🙂', t: '{n} está tranquilo… por enquanto.' },
  { min: 45, e: '😐', t: '{n} desconfiado: perguntou “essa roupa é nova?”.' },
  { min: 30, e: '😟', t: '{n} preocupado, conferindo o extrato.' },
  { min: 15, e: '😱', t: '{n} em choque com a fatura do cartão!' },
  { min: 0, e: '🚨', t: 'Alerta máximo: {n} escondeu o cartão!' },
];

export function fun() {
  S.settings.fun ||= { who: 'Marido', budget: null, meta: 70, show: true, noBuy: null };
  return S.settings.fun;
}
const ownPids = () => S.profiles.filter(p => !p.sharedFrom).map(p => p.id);

export function spending(pids, from, to) {
  return S.items.filter(i => pids.includes(i.profileId) && i.purchaseDate && i.purchaseDate >= from && i.purchaseDate <= to)
    .reduce((s, i) => s + (Number(i.price) || 0), 0);
}
export function purchases(pids, from, to) {
  return S.items.filter(i => pids.includes(i.profileId) && i.purchaseDate && i.purchaseDate >= from && i.purchaseDate <= to);
}
export function avgMonthly(pids) {
  const t = todayStr();
  const v = spending(pids, addDays(t, -364), t);
  return v ? v / 12 : null;
}
// % das peças usadas entre duas datas
export function utilization(pids, from, to = todayStr()) {
  const items = S.items.filter(i => pids.includes(i.profileId) && isActive(i));
  if (!items.length) return 0;
  const ids = new Set(items.map(i => i.id));
  const used = new Set(S.events.filter(e => e.status === 'registrado' && e.date >= from && e.date <= to).flatMap(e => e.itemIds || []).filter(id => ids.has(id)));
  return Math.round(used.size / items.length * 100);
}

export function happiness(pids = ownPids()) {
  const f = fun();
  const t = todayStr();
  const spent = spending(pids, addDays(t, -29), t);
  const budget = Number(f.budget) || avgMonthly(pids) || 300;
  const ratio = spent / budget;
  const spendScore = ratio <= 0 ? 100 : ratio <= 1 ? 100 - ratio * 50 : Math.max(0, 50 - (ratio - 1) * 50);
  const util = utilization(pids, addDays(t, -29));
  const score = Math.max(0, Math.min(100, Math.round(spendScore * 0.6 + util * 0.4)));
  const lv = LEVELS.find(l => score >= l.min);
  return { score, emoji: lv.e, text: lv.t.replace('{n}', f.who), who: f.who, spent, budget, util, budgetAuto: !Number(f.budget) };
}

export function metaInfo(pids = ownPids()) {
  const f = fun();
  const t = todayStr();
  const start = t.slice(0, 8) + '01';
  const util = utilization(pids, start);
  const items = S.items.filter(i => pids.includes(i.profileId) && isActive(i)).length;
  const need = Math.max(0, Math.ceil(items * f.meta / 100) - Math.round(items * util / 100));
  const d = new Date();
  const left = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() - d.getDate();
  return { meta: f.meta, util, need, left, done: util >= f.meta };
}

export function noBuyInfo(pids = ownPids()) {
  const nb = fun().noBuy;
  if (!nb?.start) return null;
  const t = todayStr();
  const broke = purchases(pids, nb.start, t).sort((a, b) => a.purchaseDate.localeCompare(b.purchaseDate))[0];
  const end = broke ? broke.purchaseDate : t;
  const days = daysBetween(nb.start, end);
  const avg = nb.avg || 0;
  const saved = Math.max(0, avg * days / 30.4);
  return { start: nb.start, days, broke, saved, avg };
}

// ano até hoje × mesmo período do ano passado
export function yearCompare(pids = ownPids()) {
  const t = todayStr();
  const y = Number(t.slice(0, 4));
  const a1 = `${y}-01-01`, b1 = t, a0 = `${y - 1}-01-01`, b0 = `${y - 1}${t.slice(4)}`;
  const uses = (a, b) => S.events.filter(e => e.status === 'registrado' && e.date >= a && e.date <= b)
    .reduce((s, e) => s + (e.itemIds || []).filter(id => pids.includes(S.items.find(i => i.id === id)?.profileId)).length, 0);
  return {
    y, rows: [
      { k: 'Gasto com roupas', now: spending(pids, a1, b1), prev: spending(pids, a0, b0), money: true, lessIsBetter: true },
      { k: 'Compras', now: purchases(pids, a1, b1).length, prev: purchases(pids, a0, b0).length, lessIsBetter: true },
      { k: 'Usos registrados', now: uses(a1, b1), prev: uses(a0, b0) },
      { k: 'Peças doadas/vendidas', now: S.items.filter(i => pids.includes(i.profileId) && ['doada', 'vendida'].includes(i.status) && (i.statusSince || '') >= a1).length, prev: S.items.filter(i => pids.includes(i.profileId) && ['doada', 'vendida'].includes(i.status) && (i.statusSince || '') >= a0 && (i.statusSince || '') <= b0).length },
    ],
  };
}

// medidor em meia-lua
export function gauge(score) {
  const segs = ['#e34948', '#eb6834', '#eda100', '#8cc63e', '#1baf7a'];
  const R = 80, cx = 100, cy = 100;
  const pt = a => [cx + R * Math.cos(Math.PI - a), cy - R * Math.sin(Math.PI - a)];
  const arcs = segs.map((c, i) => {
    const a0 = Math.PI * i / 5 + 0.02, a1 = Math.PI * (i + 1) / 5 - 0.02;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1);
    return `<path d="M${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1}" stroke="${c}" stroke-width="18" fill="none" stroke-linecap="round"/>`;
  }).join('');
  const a = Math.PI * score / 100;
  const [nx, ny] = [cx + 62 * Math.cos(Math.PI - a), cy - 62 * Math.sin(Math.PI - a)];
  return `<svg class="gauge-svg" viewBox="0 0 200 112" role="img" aria-label="Nível ${score} de 100">${arcs}
    <line x1="${cx}" y1="${cy}" x2="${nx}" y2="${ny}" stroke="#3a3a3a" stroke-width="4" stroke-linecap="round"/><circle cx="${cx}" cy="${cy}" r="7" fill="#3a3a3a"/></svg>`;
}

export function happyCard(pids, { compact = false } = {}) {
  if (!fun().show) return '';
  const h = happiness(pids);
  if (compact) return `<a class="happy-mini" href="#/painel"><span class="he">${h.emoji}</span><span><small>Nível de felicidade do ${esc(h.who)}</small><b>${h.score}/100</b></span>${icon('chev')}</a>`;
  return `<div class="happy">
    <div class="happy-head"><b>Nível de felicidade do ${esc(h.who)}</b><button class="icon-btn" data-act="fun-settings" aria-label="Editar">${icon('edit')}</button></div>
    <div class="happy-gauge">${gauge(h.score)}<div class="happy-num"><span>${h.emoji}</span><b>${h.score}</b></div></div>
    <p class="happy-txt">${esc(h.text)}</p>
    <div class="happy-why small muted">Gastou ${brl(h.spent)} nos últimos 30 dias (orçamento ${brl(h.budget)}${h.budgetAuto ? ', média dos seus gastos' : ''}) · usou ${h.util}% do closet. Menos gastos e mais aproveitamento = ${esc(h.who)} mais feliz.</div>
  </div>`;
}

export function funSettingsSheet() {
  const f = fun();
  const custom = !HAPPY_NAMES.includes(f.who);
  const draw = () => `
    <div class="field"><label>Felicidade de quem?</label>${chips([...HAPPY_NAMES, 'Outro…'].map(n => ({ id: n, name: n })), custom ? 'Outro…' : f.who, 'who')}
      ${custom ? `<input id="fwho" value="${esc(f.who)}" placeholder="Ex.: Sogra" style="margin-top:8px">` : ''}</div>
    <div class="field"><label>Orçamento mensal para roupas (R$)</label><input id="fbud" inputmode="decimal" value="${esc(f.budget ?? '')}" placeholder="Automático: ${brl(avgMonthly(ownPids()) || 300)} (média dos seus gastos)"></div>
    <div class="field"><label>Meta de aproveitamento do mês</label>${chips([50, 60, 70, 80, 90].map(n => ({ id: String(n), name: n + '%' })), String(f.meta), 'meta')}</div>
    <label class="ck"><input type="checkbox" id="fshow" ${f.show ? 'checked' : ''}><span>Mostrar o nível de felicidade</span></label>
    <button class="btn block" data-act="ok">Salvar</button>`;
  const body = openSheet(draw(), {
    title: 'Metas e diversão',
    onAct: async (act, el) => {
      const keep = () => { if ($('#fwho')) f.who = $('#fwho').value.trim() || 'Marido'; const b = $('#fbud').value.replace(/[^\d,.]/g, '').replace(',', '.'); f.budget = b ? Number(b) : null; f.show = $('#fshow').checked; };
      if (act === 'who') { keep(); f.who = el.dataset.v === 'Outro…' ? (HAPPY_NAMES.includes(f.who) ? '' : f.who) || 'Outro' : el.dataset.v; body.innerHTML = draw(); }
      else if (act === 'meta') { keep(); f.meta = Number(el.dataset.v); body.innerHTML = draw(); }
      else if (act === 'ok') { keep(); await saveSettings(); closeSheet(); toast('Salvo!'); nav.refresh(); }
    },
  });
}

export async function startNoBuy() {
  const f = fun();
  f.noBuy = { start: todayStr(), avg: avgMonthly(ownPids()) || 0 };
  await saveSettings();
  toast('Desafio começou! Boa sorte 💪');
  nav.refresh();
}
export async function stopNoBuy() {
  if (!confirm('Encerrar o desafio sem compras?')) return;
  fun().noBuy = null;
  await saveSettings();
  nav.refresh();
}

// ---------- cartão "Hoje" ----------
let loadingWx = false;
export function todayCardHTML() {
  const pl = S.settings.homePlace;
  if (!pl) return `<button class="today-empty" data-act="wx-place">${icon('sun')}<span>Ver o tempo de hoje e o que vestir</span><b>Escolher cidade</b></button>`;
  const w = S.settings.homeWx?.data;
  refreshToday();
  if (!w) return `<div class="today-card"><div class="tc-row"><span>${icon('sun')} ${esc(pl.name)}</span><small class="muted">${loadingWx ? 'buscando o tempo…' : 'sem internet agora'}</small></div></div>`;
  const [emo, desc] = weatherIcon(w.code);
  const recs = wearRecs(w);
  const clima = climaFromTemp(w);
  return `<div class="today-card">
    <div class="tc-row"><button class="tc-city" data-act="wx-place">${esc(pl.name)} ${icon('chev')}</button><small class="muted">hoje</small></div>
    <div class="tc-main"><b>${Math.round(w.temp ?? w.max)}°</b><div><span>${emo} ${desc}</span><small>máx ${Math.round(w.max)}° · mín ${Math.round(w.min)}°${w.feels != null ? ` · sensação ${Math.round(w.feels)}°` : ''}${w.rain != null ? ` · 💧 ${w.rain}%` : ''}</small></div></div>
    ${recs.length ? `<div class="tc-recs">${recs.map(r => `<span title="${esc(r.why)}"><i>${r.e}</i>${r.n}</span>`).join('')}</div>` : ''}
    <a class="btn small block" href="#/hoje?clima=${clima}">${icon('dice')} Sugerir look para este clima</a>
  </div>`;
}
async function refreshToday(force = false) {
  const pl = S.settings.homePlace;
  if (!pl || loadingWx || !navigator.onLine) return;
  const fresh = S.settings.homeWx && S.settings.homeWx.day === todayStr() && Date.now() - new Date(S.settings.homeWx.at).getTime() < 3600e3;
  if (fresh && !force) return;
  loadingWx = true;
  try {
    const data = await todayWeather(pl);
    S.settings.homeWx = { at: new Date().toISOString(), day: todayStr(), data };
    await saveSettings();
  } catch { }
  loadingWx = false;
  if (location.hash.startsWith('#/armario') || location.hash === '' || location.hash === '#/') nav.refresh();
}

export function placeSheet() {
  let results = [];
  const draw = () => `
    <button class="btn block ghost" data-act="geo">${icon('sun')} Usar minha localização</button>
    <div class="field" style="margin-top:14px"><label>Ou procure a cidade</label>
      <div class="tag-in"><span>${icon('search')}</span><input id="cityq" placeholder="Ex.: Varginha" enterkeyhint="search"><button class="icon-btn" data-act="find">${icon('chev')}</button></div></div>
    <div class="menu">${results.map((r, i) => `<button class="menu-item" data-act="pick" data-i="${i}">${icon('sun')}<span>${esc(r.label)}</span></button>`).join('')}</div>
    ${S.settings.homePlace ? '<button class="link small" data-act="off">Não mostrar o tempo</button>' : ''}`;
  const set = async pl => { S.settings.homePlace = pl; S.settings.homeWx = null; await saveSettings(); closeSheet(); nav.refresh(); };
  const body = openSheet(draw(), {
    title: 'Cidade para o tempo de hoje',
    onAct: async (act, el) => {
      if (act === 'find') {
        const q = $('#cityq').value.trim(); if (!q) return;
        try { results = await searchCity(q); } catch { return toast('Sem internet agora.'); }
        if (!results.length) toast('Não encontrei essa cidade.');
        body.innerHTML = draw(); $('#cityq').value = q;
      } else if (act === 'pick') { const r = results[+el.dataset.i]; await set({ name: r.name, lat: r.lat, lon: r.lon, tz: r.tz }); }
      else if (act === 'geo') {
        if (!navigator.geolocation) return toast('Este aparelho não informa a localização.');
        navigator.geolocation.getCurrentPosition(p => set({ name: 'Minha localização', lat: +p.coords.latitude.toFixed(3), lon: +p.coords.longitude.toFixed(3), tz: 'auto' }),
          () => toast('Permita a localização, ou procure a cidade.'), { timeout: 10000 });
      } else if (act === 'off') { S.settings.homePlace = null; S.settings.homeWx = null; await saveSettings(); closeSheet(); nav.refresh(); }
    },
  });
  body.addEventListener('keydown', e => { if (e.target.id === 'cityq' && e.key === 'Enter') { e.preventDefault(); body.querySelector('[data-act="find"]').click(); } });
}

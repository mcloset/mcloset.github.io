// Painel (dashboard): indicadores e gráficos do closet. Toque numa fatia/barra para ver as peças.
import { S, curProfile, profile, isActive, itemUsage, itemBand, daysUnused, costPerUse, lookItems } from '../store.js';
import { CATEGORIES, catName, BANDS, band, CLIMAS, ESTILOS, OCASIOES, ESTAMPAS, PIRAMIDE, statusName, cartelaName, CARTELAS, GONE } from '../catalog.js';
import { FAMILIES, NAMED } from '../color.js';
import { header, icon, hydrate, nav, itemRow, emptyState } from '../ui.js';
import { esc, brl, todayStr, addDays, daysBetween, parseYmd, fmtDate } from '../util.js';
import { applyFilter } from './armario.js';
import { happyCard, funSettingsSheet, metaInfo, noBuyInfo, startNoBuy, stopNoBuy, yearCompare, fun } from '../fun.js';

// paleta categórica validada (ordem fixa) e cor do "Outros"
const SERIES = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHER = '#c9c6bf';
const ACCENT = '#7a2340';
const FAM_COLOR = { neutros: '#b9ae9e', terrosos: '#a4502a', pasteis: '#f3c6cf', vibrantes: '#e0287f', profundos: '#6a1b2e', metalicos: '#c8a54b', estampado: '#7fc4a0' };
const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const P = { who: null, period: '90', dim: 'cat', measure: 'qtd', sel: null, buy: 'valor' };

const DIMS = [
  { id: 'cat', name: 'Categoria', keys: i => [i.category], label: catName, filter: k => ({ cat: k }) },
  { id: 'estilo', name: 'Estilo', keys: i => [i.estilo || ''], label: k => k || 'Sem estilo', filter: k => k && { estilo: k } },
  { id: 'clima', name: 'Estação', keys: i => (i.climas || []).length ? i.climas : [''], label: k => CLIMAS.find(c => c.id === k)?.name || 'Sem clima', filter: k => k && { clima: k }, multi: true },
  { id: 'paleta', name: 'Paleta', keys: i => [i.family || ''], label: k => FAMILIES[k] || (k === 'estampado' ? 'Colorido / estampado' : 'Sem cor'), color: k => FAM_COLOR[k], filter: k => k && { family: k } },
  { id: 'cor', name: 'Cores', keys: i => [i.colors?.[0]?.name || ''], label: k => k || 'Sem cor', color: k => NAMED.find(n => n[0] === k)?.[1], filter: k => k && { color: k } },
  { id: 'cartela', name: 'Cartela', keys: i => [i.cartela || ''], label: k => cartelaName(k) || 'Sem cartela', filter: k => k && { cartela: k } },
  { id: 'ocasiao', name: 'Ocasião', keys: i => (i.ocasioes || []).length ? i.ocasioes : [''], label: k => k || 'Sem ocasião', filter: k => k && { ocasiao: k }, multi: true },
  { id: 'estampa', name: 'Estampa', keys: i => [i.estampa || 'Lisa'], label: k => k, filter: k => ({ estampa: k }) },
  { id: 'marca', name: 'Marcas', keys: i => [i.brand || ''], label: k => k || 'Sem marca', filter: k => k && { brand: k } },
  { id: 'tag', name: 'Tags', keys: i => (i.tags || []).length ? i.tags : [''], label: k => k ? '#' + k : 'Sem tag', filter: k => k && { tag: k }, multi: true },
  { id: 'status', name: 'Status', keys: i => [i.status || 'armario'], label: statusName, filter: k => ({ status: k === 'armario' ? 'ativas' : k }) },
  { id: 'piramide', name: 'Pirâmide', keys: i => [i.piramide || ''], label: k => PIRAMIDE.find(p => p.id === k)?.name || 'Sem pirâmide', filter: k => k && { piramide: k } },
  { id: 'termo', name: 'Termômetro', keys: i => [itemBand(i)], label: k => band(k).name, color: k => band(k).color, filter: k => ({ band: k }) },
  { id: 'pessoa', name: 'Pessoa', keys: i => [i.profileId], label: k => profile(k)?.name || '?', color: k => profile(k)?.color, multiPeople: true },
];

export function render(main) {
  if (P.who == null) P.who = curProfile().id;
  const pids = P.who === 'todos' ? S.profiles.filter(p => !p.sharedFrom).map(p => p.id) : [P.who];
  const today = todayStr();
  const start = P.period === 'tudo' ? '0000-00-00' : addDays(today, -Number(P.period) + 1);
  const inPeriod = d => d && d >= start && d <= today;
  const all = S.items.filter(i => pids.includes(i.profileId));
  const items = all.filter(isActive);
  const gone = all.filter(i => GONE.includes(i.status));
  const idSet = new Set(all.map(i => i.id));
  const evs = S.events.filter(e => e.status === 'registrado' && (e.itemIds || []).some(id => idSet.has(id)));
  const evsP = evs.filter(e => inPeriod(e.date));

  // ---------- indicadores ----------
  const usedP = new Set(evsP.flatMap(e => e.itemIds).filter(id => idSet.has(id)));
  const usesP = evsP.reduce((s, e) => s + e.itemIds.filter(id => idSet.has(id)).length, 0);
  const value = items.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const priced = items.filter(i => i.price);
  const idle = items.filter(i => ['alerta', 'esquecida'].includes(itemBand(i)));
  const idleValue = idle.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const totalUses = items.reduce((s, i) => s + itemUsage(i).uses, 0);
  const pricedUses = priced.reduce((s, i) => s + itemUsage(i).uses, 0);
  const bought = all.filter(i => inPeriod(i.purchaseDate));
  const spent = bought.reduce((s, i) => s + (Number(i.price) || 0), 0);
  const wishes = S.wishes.filter(w => pids.includes(w.profileId));
  const wishOpen = wishes.filter(w => !w.done);
  const looks = S.looks.filter(l => lookItems(l).some(i => pids.includes(i.profileId)));
  const looksUsedP = new Set(evsP.map(e => e.lookId).filter(Boolean));
  const away = items.filter(i => i.status && i.status !== 'armario');
  const newP = items.filter(i => inPeriod((i.createdAt || '').slice(0, 10)));
  const days = P.period === 'tudo' ? Math.max(1, daysBetween(evs.map(e => e.date).sort()[0] || today, today) + 1) : Number(P.period);
  const util = items.length ? Math.round(usedP.size / items.length * 100) : 0;
  const periodTxt = { 30: 'nos últimos 30 dias', 90: 'nos últimos 90 dias', 365: 'nos últimos 12 meses', tudo: 'desde o início' }[P.period];

  const tiles = [
    { k: 'Peças no closet', v: items.length, s: newP.length ? `+${newP.length} cadastradas ${periodTxt}` : 'nenhuma nova no período', go: {} },
    { k: 'Valor do closet', v: brl(value), s: priced.length ? `preço médio ${brl(value / priced.length)}` : 'cadastre os preços' },
    { k: 'Aproveitamento', v: util + '%', s: `${usedP.size} de ${items.length} peças usadas ${periodTxt}`, bar: util },
    { k: 'Peças paradas', v: idle.length, s: idleValue ? `${brl(idleValue)} parados (90+ dias sem uso)` : '90 dias ou mais sem uso', go: { band: 'esquecida' }, warn: idle.length > 0 },
    { k: 'Usos registrados', v: usesP, s: `${(usesP / days).toFixed(1).replace('.', ',')} por dia ${periodTxt}` },
    { k: 'Custo por uso médio', v: pricedUses ? brl(priced.reduce((s, i) => s + Number(i.price), 0) / pricedUses) : '—', s: `${totalUses} usos no total` },
    { k: 'Compras', v: bought.length, s: bought.length ? `${brl(spent)} gastos ${periodTxt}` : `nenhuma ${periodTxt}` },
    { k: 'Lista de desejos', v: wishOpen.length, s: wishOpen.some(w => w.price) ? `${brl(wishOpen.reduce((s, w) => s + (Number(w.price) || 0), 0))} estimados` : `${wishes.length - wishOpen.length} já compradas`, href: '#/desejos' },
    { k: 'Looks', v: looks.length, s: `${looksUsedP.size} usados ${periodTxt}`, href: '#/looks' },
    { k: 'Fora do armário', v: away.length, s: 'lavanderia, costureira, emprestadas…', href: '#/onde' },
  ];

  // ---------- composição (rosca) ----------
  const dims = DIMS.filter(d => !d.multiPeople || pids.length > 1);
  if (!dims.find(d => d.id === P.dim)) P.dim = 'cat';
  const dim = DIMS.find(d => d.id === P.dim);
  const agg = new Map();
  for (const i of items) for (const k of dim.keys(i)) {
    const a = agg.get(k) || { k, qtd: 0, valor: 0 };
    a.qtd++; a.valor += Number(i.price) || 0;
    agg.set(k, a);
  }
  // a cor segue a entidade: ordem fixa pela quantidade (não muda ao trocar quantidade/valor)
  const byQtd = [...agg.values()].sort((a, b) => b.qtd - a.qtd || String(a.k).localeCompare(String(b.k)));
  let slices = byQtd.slice(0, 7).map((a, i) => ({ ...a, color: dim.color?.(a.k) || SERIES[i] }));
  const rest = byQtd.slice(7);
  if (rest.length) slices.push({ k: '__outros', qtd: rest.reduce((s, a) => s + a.qtd, 0), valor: rest.reduce((s, a) => s + a.valor, 0), color: OTHER, outros: rest });
  const mKey = P.measure === 'valor' ? 'valor' : 'qtd';
  slices = slices.filter(s => s[mKey] > 0);
  const total = slices.reduce((s, a) => s + a[mKey], 0);
  const lab = s => s.k === '__outros' ? `Outros (${s.outros.length})` : dim.label(s.k);
  const fmt = v => P.measure === 'valor' ? brl(v) : String(v);
  const sel = slices.find(s => s.k === P.sel);

  // ---------- uso e parados ----------
  const bandCount = BANDS.map(b => ({ ...b, n: items.filter(i => itemBand(i) === b.id).length })).filter(b => b.n);
  const idleList = items.filter(i => !['avaliacao', 'fora'].includes(itemBand(i))).sort((a, b) => daysUnused(b) - daysUnused(a)).slice(0, 6);

  // ---------- meses (12 meses) ----------
  const months = [];
  { const d = parseYmd(today); d.setDate(1); for (let i = 11; i >= 0; i--) { const m = new Date(d.getFullYear(), d.getMonth() - i, 1); months.push({ key: `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`, label: MES[m.getMonth()], year: m.getFullYear() }); } }
  const usoMes = months.map(m => ({ ...m, v: evs.filter(e => e.date.startsWith(m.key)).reduce((s, e) => s + e.itemIds.filter(id => idSet.has(id)).length, 0) }));
  const compraMes = months.map(m => { const its = all.filter(i => (i.purchaseDate || '').startsWith(m.key)); return { ...m, n: its.length, valor: its.reduce((s, i) => s + (Number(i.price) || 0), 0), its }; });
  const anyPurchaseDate = all.some(i => i.purchaseDate);

  // ---------- uso por estilo / dia da semana ----------
  const estilos = [...ESTILOS, ''].map(e => {
    const its = items.filter(i => (i.estilo || '') === e);
    const u = evsP.reduce((s, ev) => s + ev.itemIds.filter(id => its.some(i => i.id === id)).length, 0);
    return { k: e, label: e || 'Sem estilo', pecas: its.length, usos: u, usadas: its.filter(i => usedP.has(i.id)).length };
  }).filter(x => x.pecas);
  const semana = SEMANA.map((label, d) => ({ label, v: evsP.filter(e => parseYmd(e.date).getDay() === d).reduce((s, e) => s + e.itemIds.filter(id => idSet.has(id)).length, 0) }));

  // ---------- gastos ----------
  const sumBy = (keyFn, list = items) => { const m = new Map(); for (const i of list) { const k = keyFn(i); if (!k || !i.price) continue; m.set(k, (m.get(k) || 0) + Number(i.price)); } return [...m].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v); };
  const gastoCat = sumBy(i => i.category).map(x => ({ ...x, label: catName(x.k), go: { cat: x.k } }));
  const gastoMarca = sumBy(i => i.brand).slice(0, 8).map(x => ({ ...x, label: x.k, go: { brand: x.k } }));
  const withCpu = priced.map(i => ({ i, u: itemUsage(i).uses, cpu: costPerUse(i.price, itemUsage(i).uses) }));
  const bestCpu = withCpu.filter(x => x.u).sort((a, b) => a.cpu - b.cpu).slice(0, 5);
  const worstCpu = withCpu.sort((a, b) => b.cpu - a.cpu).slice(0, 5);
  const mostUsed = items.map(i => ({ i, u: itemUsage(i).uses })).filter(x => x.u).sort((a, b) => b.u - a.u).slice(0, 5);

  // ---------- cores ----------
  const colorW = new Map();
  for (const i of items) for (const c of i.colors || []) colorW.set(c.name, (colorW.get(c.name) || 0) + (c.pct || 50));
  const colorList = [...colorW].map(([name, w]) => ({ name, w, hex: NAMED.find(n => n[0] === name)?.[1] || items.flatMap(i => i.colors || []).find(c => c.name === name)?.hex })).sort((a, b) => b.w - a.w);
  const colorTotal = colorList.reduce((s, c) => s + c.w, 0);

  // ---------- desejos, looks, ciclo de vida, cadastro ----------
  const wishCat = CATEGORIES.map(c => ({ k: c.id, label: c.name, v: wishOpen.filter(w => w.category === c.id).length })).filter(x => x.v).sort((a, b) => b.v - a.v);
  const looksNever = looks.filter(l => !evs.some(e => e.lookId === l.id));
  const lookTop = looks.map(l => ({ l, u: evs.filter(e => e.lookId === l.id).length })).filter(x => x.u).sort((a, b) => b.u - a.u).slice(0, 3);
  const life = gone.map(i => daysBetween((i.purchaseDate || i.createdAt || todayStr()).slice(0, 10), i.statusSince || todayStr())).filter(d => d >= 0);
  const goneUses = gone.map(i => itemUsage(i).uses);
  const quality = [
    { k: 'semfoto', name: 'Sem foto', n: items.filter(i => !(i.photos || []).length).length },
    { k: 'sempreco', name: 'Sem preço', n: items.filter(i => !i.price).length },
    { k: 'semficha', name: 'Sem descrição', n: items.filter(i => !i.descricao).length },
    { k: 'semlook', name: 'Em nenhum look', n: items.filter(i => !S.looks.some(l => (l.itemIds || []).includes(i.id))).length },
    { k: 'naousada', name: 'Nunca usadas', n: items.filter(i => !itemUsage(i).uses).length },
  ];

  const people = S.profiles.filter(p => !p.sharedFrom);
  main.innerHTML = `
    ${header('Painel', { back: '#/hub' })}
    <div class="pad dash">
      ${people.length > 1 ? `<div class="chips">${[{ id: 'todos', name: 'Todos' }, ...people].map(p => `<button class="chip ${P.who === p.id ? 'on' : ''}" data-act="who" data-v="${p.id}">${esc(p.name)}</button>`).join('')}</div>` : ''}
      <div class="seg-row">${[['30', '30 dias'], ['90', '90 dias'], ['365', '12 meses'], ['tudo', 'Tudo']].map(([v, n]) => `<button class="${P.period === v ? 'on' : ''}" data-act="period" data-v="${v}">${n}</button>`).join('')}</div>

      ${!all.length ? emptyState('Cadastre peças para ver o painel.', 'chart') : `
      ${happyCard(pids)}
      ${goalsHTML(pids)}
      <div class="kpis">${tiles.map(t => `<${t.href ? `a href="${t.href}"` : t.go ? `button data-act="go" data-f='${JSON.stringify(t.go)}'` : 'div'} class="kpi ${t.warn ? 'warn' : ''}">
        <small>${t.k}</small><b>${t.v}</b>${t.bar != null ? `<span class="kbar"><span style="width:${t.bar}%"></span></span>` : ''}<em>${esc(t.s)}</em></${t.href ? 'a' : t.go ? 'button' : 'div'}>`).join('')}</div>

      <section class="viz">
        <h3 class="sec">Composição do closet</h3>
        <div class="chips">${dims.map(d => `<button class="chip ${P.dim === d.id ? 'on' : ''}" data-act="dim" data-v="${d.id}">${P.dim === d.id ? icon('check') : ''}${d.name}</button>`).join('')}</div>
        <div class="seg-row small-seg">${[['qtd', 'Quantidade'], ['valor', 'Valor (R$)']].map(([v, n]) => `<button class="${P.measure === v ? 'on' : ''}" data-act="measure" data-v="${v}">${n}</button>`).join('')}</div>
        ${total ? `<div class="donut-wrap">
          ${donut(slices, mKey, total, sel)}
          <div class="donut-center">${sel ? `<b>${fmt(sel[mKey])}</b><span>${esc(lab(sel))}</span><small>${Math.round(sel[mKey] / total * 100)}%</small>` : `<b>${P.measure === 'valor' ? brl(total) : items.length}</b><span>${P.measure === 'valor' ? 'em peças' : 'peças de roupa'}</span>`}</div>
        </div>
        ${dim.multi ? '<p class="hint">Uma peça pode contar em mais de um grupo (ex.: calor e meia-estação).</p>' : ''}
        <div class="legend-list">${slices.map(s => `<button class="lg-row ${P.sel === s.k ? 'on' : ''}" data-act="slice" data-v="${esc(s.k)}"><i style="background:${s.color}"></i><span>${esc(lab(s))}</span><b>${fmt(s[mKey])}</b><small>${Math.round(s[mKey] / total * 100)}%</small></button>`).join('')}</div>
        ${sel && sel.k !== '__outros' && dim.filter?.(sel.k) ? `<button class="btn block ghost" data-act="go" data-f='${esc(JSON.stringify(dim.filter(sel.k)))}'>${icon('hanger')} Ver as ${sel.qtd} peças de “${esc(lab(sel))}”</button>` : ''}`
        : `<p class="muted small">${P.measure === 'valor' ? 'Nenhuma peça com preço cadastrado.' : 'Sem dados.'}</p>`}
      </section>

      <section class="viz">
        <h3 class="sec">Uso × peças paradas</h3>
        <div class="stack">${bandCount.map(b => `<span style="flex:${b.n};background:${b.color}" data-tip="${b.name}: ${b.n} peça${b.n > 1 ? 's' : ''}" data-act="go" data-f='{"band":"${b.id}"}'></span>`).join('')}</div>
        <div class="legend-inline">${bandCount.map(b => `<button data-act="go" data-f='{"band":"${b.id}"}'><i style="background:${b.color}"></i>${b.name} <b>${b.n}</b></button>`).join('')}</div>
        <p class="tip-line" aria-live="polite"></p>
        ${idleList.length ? `<h4 class="subh">Paradas há mais tempo</h4><div class="rows">${idleList.map(i => itemRow(i, `<b>${daysUnused(i)} dias</b>${i.price ? `<br><span class="muted small">${brl(i.price)}</span>` : ''}`)).join('')}</div>` : ''}
      </section>

      <section class="viz">
        <h3 class="sec">Usos por mês</h3>
        ${vbars(usoMes.map(m => ({ label: m.label, v: m.v, tip: `${m.label}/${String(m.year).slice(2)}: ${m.v} uso${m.v === 1 ? '' : 's'}` })), ACCENT)}
        <p class="tip-line" aria-live="polite"></p>
      </section>

      <section class="viz">
        <h3 class="sec">Uso por estilo <span class="muted small">${periodTxt}</span></h3>
        ${estilos.length ? `<div class="hb">${estilos.sort((a, b) => b.usos - a.usos || b.pecas - a.pecas).map(e => hrow(e.label, e.usos, Math.max(1, ...estilos.map(x => x.usos)), `${e.usos} usos`, `${e.usadas}/${e.pecas} peças usadas`, e.k ? { estilo: e.k } : null)).join('')}</div>` : '<p class="muted small">Defina o estilo das peças para ver este gráfico.</p>'}
      </section>

      <section class="viz">
        <h3 class="sec">Dia da semana que você mais registra uso</h3>
        ${vbars(semana.map(d => ({ label: d.label, v: d.v, tip: `${d.label}: ${d.v} usos` })), ACCENT)}
        <p class="tip-line" aria-live="polite"></p>
      </section>

      <section class="viz">
        <h3 class="sec">Compras por mês</h3>
        <div class="seg-row small-seg">${[['valor', 'Valor (R$)'], ['qtd', 'Quantidade']].map(([v, n]) => `<button class="${P.buy === v ? 'on' : ''}" data-act="buy" data-v="${v}">${n}</button>`).join('')}</div>
        ${vbars(compraMes.map(m => ({ label: m.label, v: P.buy === 'valor' ? m.valor : m.n, tip: `${m.label}/${String(m.year).slice(2)}: ${m.n} compra${m.n === 1 ? '' : 's'} · ${brl(m.valor)}` })), ACCENT, P.buy === 'valor' ? v => 'R$' + Math.round(v) : String)}
        <p class="tip-line" aria-live="polite"></p>
        <p class="small muted">${anyPurchaseDate ? `Últimos 12 meses: ${compraMes.reduce((s, m) => s + m.n, 0)} compras · ${brl(compraMes.reduce((s, m) => s + m.valor, 0))} · ticket médio ${brl(compraMes.reduce((s, m) => s + m.valor, 0) / Math.max(1, compraMes.reduce((s, m) => s + m.n, 0)))}` : 'Preencha a “data da compra” nas peças para este gráfico funcionar.'}</p>
      </section>

      ${gastoCat.length ? `<section class="viz"><h3 class="sec">Valor por categoria</h3><div class="hb">${gastoCat.map(x => hrow(x.label, x.v, gastoCat[0].v, brl(x.v), '', x.go)).join('')}</div></section>` : ''}
      ${gastoMarca.length ? `<section class="viz"><h3 class="sec">Marcas e lojas (valor)</h3><div class="hb">${gastoMarca.map(x => hrow(x.label, x.v, gastoMarca[0].v, brl(x.v), `${items.filter(i => i.brand === x.k).length} peças`, x.go)).join('')}</div></section>` : ''}

      <section class="viz">
        <h3 class="sec">Custo por uso</h3>
        ${bestCpu.length ? `<h4 class="subh">💰 Valeram a pena</h4><div class="rows">${bestCpu.map(x => itemRow(x.i, `<b>${brl(x.cpu)}</b><br><span class="muted small">${x.u} usos</span>`)).join('')}</div>` : ''}
        ${worstCpu.length ? `<h4 class="subh">💸 Mais caras por uso</h4><div class="rows">${worstCpu.map(x => itemRow(x.i, `<b>${brl(x.cpu)}</b><br><span class="muted small">${x.u} usos</span>`)).join('')}</div>` : '<p class="muted small">Cadastre preços e registre usos para ver o custo por uso.</p>'}
        ${mostUsed.length ? `<h4 class="subh">🔥 Mais usadas</h4><div class="rows">${mostUsed.map(x => itemRow(x.i, `<b>${x.u}×</b>`)).join('')}</div>` : ''}
      </section>

      ${colorList.length ? `<section class="viz"><h3 class="sec">Seu closet em cores</h3>
        <div class="colorstrip">${colorList.map(c => `<span style="flex:${c.w};background:${c.hex}" data-tip="${esc(c.name)}: ${Math.round(c.w / colorTotal * 100)}%" data-act="go" data-f='${esc(JSON.stringify({ color: c.name }))}'></span>`).join('')}</div>
        <p class="tip-line" aria-live="polite"></p>
        <div class="legend-inline">${colorList.slice(0, 8).map(c => `<button data-act="go" data-f='${esc(JSON.stringify({ color: c.name }))}'><i style="background:${c.hex}"></i>${esc(c.name)} <b>${Math.round(c.w / colorTotal * 100)}%</b></button>`).join('')}</div>
      </section>` : ''}

      <section class="viz">
        <h3 class="sec">Lista de desejos</h3>
        <div class="kpis three">
          <a class="kpi" href="#/desejos"><small>Pendentes</small><b>${wishOpen.length}</b></a>
          <a class="kpi" href="#/desejos"><small>Valor estimado</small><b>${brl(wishOpen.reduce((s, w) => s + (Number(w.price) || 0), 0))}</b></a>
          <a class="kpi" href="#/desejos"><small>Compradas</small><b>${wishes.length - wishOpen.length}</b></a>
        </div>
        ${wishCat.length ? `<div class="hb">${wishCat.map(x => hrow(x.label, x.v, wishCat[0].v, String(x.v), '')).join('')}</div>` : ''}
      </section>

      <section class="viz">
        <h3 class="sec">Looks</h3>
        <div class="kpis three">
          <a class="kpi" href="#/looks"><small>Montados</small><b>${looks.length}</b></a>
          <div class="kpi"><small>Usados ${periodTxt.replace('nos últimos', 'em')}</small><b>${looksUsedP.size}</b></div>
          <div class="kpi"><small>Nunca usados</small><b>${looksNever.length}</b></div>
        </div>
        ${lookTop.length ? `<div class="rows">${lookTop.map(x => `<a class="irow" href="#/look/${x.l.id}"><div class="irow-main"><div class="nm">${esc(x.l.name)}</div><div class="sub">${esc(x.l.group || '')}</div></div><div class="irow-right"><b>${x.u}×</b></div></a>`).join('')}</div>` : ''}
      </section>

      <section class="viz">
        <h3 class="sec">Ciclo de vida</h3>
        <div class="kpis three">
          <div class="kpi"><small>Doadas</small><b>${gone.filter(i => i.status === 'doada').length}</b></div>
          <div class="kpi"><small>Vendidas</small><b>${gone.filter(i => i.status === 'vendida').length}</b></div>
          <div class="kpi"><small>Tempo médio no closet</small><b>${life.length ? Math.round(life.reduce((a, b) => a + b, 0) / life.length / 30) + ' meses' : '—'}</b></div>
        </div>
        <p class="small muted">${goneUses.length ? `As peças que saíram foram usadas em média ${(goneUses.reduce((a, b) => a + b, 0) / goneUses.length).toFixed(1).replace('.', ',')} vezes.` : 'Quando você marcar peças como doadas ou vendidas, o app mostra quanto tempo elas ficaram e quanto foram usadas.'}</p>
      </section>

      ${compareHTML(pids)}

      <section class="viz">
        <h3 class="sec">Organização do cadastro</h3>
        <div class="legend-inline q">${quality.map(q => `<button data-act="go" data-f='{"extra":"${q.k}"}' ${q.n ? '' : 'disabled'}>${q.name} <b>${q.n}</b></button>`).join('')}</div>
      </section>`}
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onpointerover = e => showTip(e);
  main.onclick = e => {
    if (showTip(e) && !e.target.closest('[data-act]')) return;
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'who') { P.who = v; P.sel = null; keep(); }
    else if (act === 'period') { P.period = v; keep(); }
    else if (act === 'dim') { P.dim = v; P.sel = null; keep(); }
    else if (act === 'measure') { P.measure = v; keep(); }
    else if (act === 'buy') { P.buy = v; keep(); }
    else if (act === 'slice') { P.sel = P.sel === v ? null : v; keep(); }
    else if (act === 'go') {
      const f = JSON.parse(a.dataset.f || '{}');
      if (pids.length === 1 && curProfile().id !== pids[0]) S.settings.currentProfile = pids[0];
      applyFilter(f);
      nav.go('#/armario');
    }
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'fun-settings') funSettingsSheet();
    else if (act === 'nobuy-start') startNoBuy();
    else if (act === 'nobuy-stop') stopNoBuy();
  };
}
const keep = () => { const y = scrollY; nav.refresh(); scrollTo(0, y); };

function showTip(e) {
  const t = e.target.closest('[data-tip]');
  if (!t) return false;
  const line = t.closest('.viz')?.querySelector('.tip-line');
  if (line) line.textContent = t.dataset.tip;
  return true;
}

// rosca em SVG: fatias com 2px de espaço entre elas
function donut(slices, key, total, sel) {
  const R = 80, W = 26, C = 2 * Math.PI * R, GAP = slices.length > 1 ? 2 : 0;
  let acc = 0;
  const arcs = slices.map(s => {
    const len = s[key] / total * C;
    const dash = Math.max(0.5, len - GAP);
    const el = `<circle r="${R}" cx="100" cy="100" fill="none" stroke="${s.color}" stroke-width="${sel && sel.k === s.k ? W + 8 : W}"
      stroke-dasharray="${dash} ${C - dash}" stroke-dashoffset="${-acc}" data-act="slice" data-v="${esc(s.k)}" class="arc ${sel && sel.k !== s.k ? 'dim' : ''}"><title>${esc(String(s.k))}</title></circle>`;
    acc += len;
    return el;
  });
  return `<svg class="donut" viewBox="0 0 200 200" role="img" aria-label="Gráfico de rosca"><g transform="rotate(-90 100 100)">${arcs.join('')}</g></svg>`;
}

// barras verticais (série única); rótulo direto só no maior valor
function vbars(data, color, fmt = String) {
  const max = Math.max(0, ...data.map(d => d.v));
  if (!max) return '<p class="muted small">Ainda sem dados para este gráfico.</p>';
  const H = 120, n = data.length, bw = 100 / n;
  return `<div class="vbars"><svg viewBox="0 0 100 ${H + 18}" preserveAspectRatio="none" role="img">
    <line x1="0" x2="100" y1="${H}" y2="${H}" class="axis"/>
    ${data.map((d, i) => {
      const h = d.v / max * (H - 16);
      const x = i * bw + bw * 0.18, w = bw * 0.64;
      return `<g data-tip="${esc(d.tip)}"><rect x="${i * bw}" y="0" width="${bw}" height="${H}" fill="transparent"/>${d.v ? `<rect x="${x}" y="${H - h}" width="${w}" height="${h}" rx="0.8" fill="${color}"/>` : ''}</g>`;
    }).join('')}
  </svg>
  <div class="vb-labels">${data.map(d => `<span data-tip="${esc(d.tip)}">${d.v === max ? `<b>${esc(fmt(d.v))}</b>` : ''}${esc(d.label)}</span>`).join('')}</div></div>`;
}

function hrow(label, v, max, valTxt, sub, go) {
  return `<${go ? `button data-act="go" data-f='${esc(JSON.stringify(go))}'` : 'div'} class="hrow"><span class="hl">${esc(label)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="ht"><span style="width:${max ? v / max * 100 : 0}%"></span></span><b>${esc(valTxt)}</b></${go ? 'button' : 'div'}>`;
}

function goalsHTML(pids) {
  const m = metaInfo(pids);
  const nb = noBuyInfo(pids);
  return `<div class="goals">
    <div class="goal">
      <div class="goal-h"><b>🎯 Meta do mês</b><button class="link small" data-act="fun-settings">mudar</button></div>
      <div class="meta-bar"><span style="width:${Math.min(100, m.util)}%"></span><i style="left:${m.meta}%"></i></div>
      <div class="small">${m.util}% do closet usado este mês · meta ${m.meta}%</div>
      <div class="small muted">${m.done ? '🎉 Meta batida! Pode comemorar (sem comprar nada 😉).' : `Faltam ${m.need} peça${m.need === 1 ? '' : 's'} para usar em ${m.left} dia${m.left === 1 ? '' : 's'}. As esquecidas contam!`}</div>
    </div>
    <div class="goal">
      <div class="goal-h"><b>🛍️ Desafio sem compras</b>${nb ? '<button class="link small" data-act="nobuy-stop">encerrar</button>' : ''}</div>
      ${!nb ? `<div class="small muted">Quantos dias você consegue ficar sem comprar roupa? O app conta os dias e quanto você economizou.</div><button class="btn small" data-act="nobuy-start">Começar hoje</button>`
        : nb.broke ? `<div class="small">Você ficou <b>${nb.days} dias</b> sem comprar, até “${esc(nb.broke.name)}” em ${fmtDate(nb.broke.purchaseDate)}.</div><button class="btn small" data-act="nobuy-start">Recomeçar</button>`
        : `<div class="nb-days"><b>${nb.days}</b> dia${nb.days === 1 ? '' : 's'} sem comprar 🔥</div><div class="small muted">${nb.avg ? `Economia estimada: <b>${brl(nb.saved)}</b> (pela sua média de ${brl(nb.avg)}/mês)` : 'Desde ' + fmtDate(nb.start)}</div>`}
    </div>
  </div>`;
}

function compareHTML(pids) {
  const c = yearCompare(pids);
  if (c.rows.every(r => !r.now && !r.prev)) return '';
  return `<section class="viz">
    <h3 class="sec">${c.y} × ${c.y - 1} <span class="muted small">até a mesma data</span></h3>
    <div class="cmp-legend small"><span><i class="now"></i>${c.y}</span><span><i class="prev"></i>${c.y - 1}</span></div>
    ${c.rows.map(r => {
      const max = Math.max(r.now, r.prev, 1);
      const f = v => r.money ? brl(v) : String(v);
      let delta = '';
      if (r.prev) {
        const pct = Math.round((r.now - r.prev) / r.prev * 100);
        const good = r.lessIsBetter ? pct <= 0 : pct >= 0;
        delta = `<span class="delta ${good ? 'good' : 'bad'}">${pct > 0 ? '▲' : pct < 0 ? '▼' : '='} ${Math.abs(pct)}%</span>`;
      }
      return `<div class="cmp"><div class="cmp-h"><span>${r.k}</span>${delta}</div>
        <div class="cmp-bar now"><span style="width:${r.now / max * 100}%"></span><b>${f(r.now)}</b></div>
        <div class="cmp-bar prev"><span style="width:${r.prev / max * 100}%"></span><b>${f(r.prev)}</b></div></div>`;
    }).join('')}
  </section>`;
}

import { S, curProfile, profile, item, look, save, remove, lookItems, lookUsage, profileItems, itemUsage, itemBand, daysUnused, costPerUse, maybeSmall, deleteEvent } from '../store.js';
import { BANDS, band, CLIMAS, catName, CAT_ORDER, statusName } from '../catalog.js';
import { header, icon, chips, itemCard, itemRow, collage, hydrate, openSheet, closeSheet, nav, avatar, emptyState, sortByCat, choose } from '../ui.js';
import { $, esc, uid, brl, todayStr, addDays, fmtDate, fmtDateLong, toast, MONTHS, ymd, parseYmd, daysBetween } from '../util.js';
import { searchCity, tripWeather, weatherIcon, climaFromTemp, dayTips } from '../weather.js';
import { suggestLook } from '../suggest.js';

const T = { tab: 'calendario', sub: 'termometro', band: 'esquecida', y: null, m: null, all: false };

export function render(main, params) {
  if (params.tab) { T.tab = params.tab; history.replaceState(null, '', '#/planejar'); }
  if (T.y == null) { const d = new Date(); T.y = d.getFullYear(); T.m = d.getMonth(); }
  main.innerHTML = `
    ${header('Planejamento')}
    <div class="tabs">
      ${[['calendario', 'Calendário'], ['armario', 'Ranking do closet'], ['viagens', 'Viagens']].map(([id, n]) => `<button class="${T.tab === id ? 'on' : ''}" data-act="tab" data-v="${id}">${n}</button>`).join('')}
    </div>
    <div id="tabbody">${T.tab === 'calendario' ? calendar() : T.tab === 'armario' ? ranking() : trips()}</div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'tab') { T.tab = v; nav.refresh(); }
    else if (act === 'sub') { T.sub = v; nav.refresh(); }
    else if (act === 'band') { T.band = v; nav.refresh(); }
    else if (act === 'mprev' || act === 'mnext') { T.m += act === 'mnext' ? 1 : -1; if (T.m < 0) { T.m = 11; T.y--; } if (T.m > 11) { T.m = 0; T.y++; } nav.refresh(); }
    else if (act === 'mtoday') { const d = new Date(); T.y = d.getFullYear(); T.m = d.getMonth(); nav.refresh(); }
    else if (act === 'allp') { T.all = !T.all; nav.refresh(); }
    else if (act === 'day') daySheet(v);
    else if (act === 'open-item') nav.go('#/peca/' + a.dataset.id);
    else if (act === 'open-look') nav.go('#/look/' + a.dataset.id);
    else if (act === 'trip') nav.go('#/viagem/' + a.dataset.id);
    else if (act === 'new-trip') tripForm();
  };
}

// ---------- calendário ----------
const visibleEvents = () => {
  const pid = curProfile().id;
  return S.events.filter(e => T.all || (e.profileIds || []).includes(pid) || !(e.profileIds || []).length);
};
function eventCover(e) {
  const its = e.lookId && look(e.lookId) ? lookItems(look(e.lookId)) : (e.itemIds || []).map(item).filter(Boolean);
  return e.photoId || sortByCat(its)[0]?.photos?.[0] || '';
}
function calendar() {
  const today = todayStr();
  const first = new Date(T.y, T.m, 1);
  const start = new Date(first); start.setDate(1 - first.getDay());
  const evs = visibleEvents();
  const byDay = new Map();
  for (const e of evs) { if (!byDay.has(e.date)) byDay.set(e.date, []); byDay.get(e.date).push(e); }
  let cells = '';
  for (let i = 0; i < 42; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i);
    const s = ymd(d);
    if (i >= 35 && d.getMonth() !== T.m) break;
    const list = byDay.get(s) || [];
    const reg = list.some(e => e.status === 'registrado');
    const pend = !reg && list.some(e => e.status === 'programado') && s < today;
    const cover = list.length ? eventCover(list[0]) : '';
    cells += `<button class="cday ${d.getMonth() !== T.m ? 'out' : ''} ${s === today ? 'today' : ''} ${list.length ? 'has' : ''}" data-act="day" data-v="${s}">
      <span class="n">${d.getDate()}</span>
      ${cover ? `<img data-ph="${cover}" alt="">` : ''}
      ${list.length > 1 ? `<span class="more">+${list.length - 1}</span>` : ''}
      ${reg ? `<span class="st ok">${icon('check')}</span>` : pend ? `<span class="st pend">${icon('clock')}</span>` : ''}
    </button>`;
  }
  return `
    <div class="cal-head">
      <button class="icon-btn" data-act="mprev" aria-label="Mês anterior">${icon('chevL')}</button>
      <h2 class="serif" data-act="mtoday">${MONTHS[T.m]} de ${T.y}</h2>
      <button class="icon-btn" data-act="mnext" aria-label="Próximo mês">${icon('chev')}</button>
    </div>
    <div class="legend"><span><i class="lg prog"></i>Programado</span><span><i class="lg pend">${icon('clock')}</i>Pendente</span><span><i class="lg ok">${icon('check')}</i>Registrado</span><span><i class="lg more">+1</i>Vários looks</span></div>
    <div class="cal">${['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => `<span class="wd">${d}</span>`).join('')}${cells}</div>
    ${S.profiles.length > 1 ? `<button class="chip ${T.all ? 'on' : ''}" data-act="allp">${icon('users')} Mostrar todas as pessoas</button>` : ''}
    <p class="hint">Toque num dia para programar um look ou registrar o que usou. Cada uso registrado esquenta o termômetro das peças.</p>`;
}

function daySheet(date) {
  const evs = visibleEvents().filter(e => e.date === date);
  const draw = () => `
    ${evs.length ? evs.map(e => {
      const l = e.lookId && look(e.lookId);
      const its = l ? lookItems(l) : (e.itemIds || []).map(item).filter(Boolean);
      const pend = e.status === 'programado' && date < todayStr();
      return `<div class="devent">
        ${collage(its, 'sm')}
        <div class="de-main"><b>${esc(l ? l.name : e.note || 'Peças avulsas')}</b>
          <div class="small ${e.status === 'registrado' ? 'ok' : pend ? 'warn' : 'muted'}">${e.status === 'registrado' ? 'Usado' : pend ? 'Pendente — usou mesmo?' : 'Programado'}</div>
          <div class="row-btns">
            ${e.status !== 'registrado' ? `<button class="btn small" data-act="confirm" data-id="${e.id}">${icon('check')} Usei</button>` : ''}
            ${l ? `<button class="btn small ghost" data-act="see" data-id="${l.id}">Ver look</button>` : ''}
            <button class="btn small ghost" data-act="rm" data-id="${e.id}">${icon('trash')}</button>
          </div></div></div>`;
    }).join('') : '<p class="muted">Nada neste dia ainda.</p>'}
    <div class="menu">
      <button class="menu-item" data-act="prog">${icon('calendar')}<span>${date >= todayStr() ? 'Programar um look' : 'Registrar um look usado'}</span>${icon('chev')}</button>
      <button class="menu-item" data-act="loose">${icon('hanger')}<span>Registrar peças avulsas usadas</span>${icon('chev')}</button>
    </div>`;
  openSheet(draw(), {
    title: fmtDateLong(date),
    onAct: async (act, el) => {
      const id = el.dataset.id;
      if (act === 'confirm') {
        const e = S.events.find(x => x.id === id);
        if (e.lookId && look(e.lookId)) { closeSheet(); const { registerUseSheet } = await import('./looks.js'); registerUseSheet(look(e.lookId), e.date); return; }
        e.status = 'registrado'; await save('events', e); toast('Uso registrado!'); closeSheet(); nav.refresh();
      } else if (act === 'see') { closeSheet(); nav.go('#/look/' + id); }
      else if (act === 'rm') { if (confirm('Remover do calendário?')) { await deleteEvent(id); closeSheet(); nav.refresh(); } }
      else if (act === 'prog') {
        pickLookSheet(async l => {
          const its = lookItems(l);
          await save('events', { id: uid(), date, lookId: l.id, itemIds: its.map(i => i.id), profileIds: [...new Set(its.map(i => i.profileId))], status: date > todayStr() ? 'programado' : 'registrado' });
          toast(date > todayStr() ? 'Look programado!' : 'Uso registrado!'); nav.refresh();
        });
      } else if (act === 'loose') {
        pickItemsSheet('O que você usou?', async ids => {
          await save('events', { id: uid(), date, lookId: null, itemIds: ids, profileIds: [...new Set(ids.map(i => item(i)?.profileId))], status: date > todayStr() ? 'programado' : 'registrado' });
          toast('Registrado!'); nav.refresh();
        });
      }
    },
  });
}

export function pickLookSheet(cb) {
  const pid = curProfile().id;
  const looks = S.looks.filter(l => lookItems(l).some(i => i.profileId === pid) || T.all).sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  openSheet(looks.length ? `<div class="lgrid">${looks.map(l => `<div class="lcard" data-act="pick" data-id="${l.id}">${collage(lookItems(l), 'sm')}<div class="lc-name">${esc(l.name)}</div></div>`).join('')}</div>`
    : emptyState('Nenhum look montado ainda.', 'book', '<a class="btn" href="#/novo-look" data-close>Montar look</a>'), {
    title: 'Escolha o look',
    onAct: (act, el) => { if (act === 'pick') { closeSheet(); cb(look(el.dataset.id)); } },
  });
}

export function pickItemsSheet(title, cb) {
  const pid = curProfile().id;
  const sel = new Set();
  const its = sortByCat(profileItems(pid));
  const draw = () => `<div class="igrid">${its.map(i => itemCard(i, { selected: sel.has(i.id), act: 'tg', showBand: false })).join('')}</div>
    <div class="sticky-bottom"><button class="btn block" data-act="ok">Confirmar (${sel.size})</button></div>`;
  const body = openSheet(draw(), {
    title, cls: 'tall',
    onAct: (act, el) => {
      if (act === 'tg') { const id = el.dataset.id; sel.has(id) ? sel.delete(id) : sel.add(id); const y = body.scrollTop; body.innerHTML = draw(); hydrate(body); body.scrollTop = y; }
      else if (act === 'ok') { if (!sel.size) return toast('Escolha pelo menos uma peça.'); closeSheet(); cb([...sel]); }
    },
  });
}

export function scheduleSheet({ lookId, itemIds, title }) {
  const tomorrow = addDays(todayStr(), 1);
  openSheet(`
    <div class="field"><label>Para quando?</label><input type="date" id="sd" value="${tomorrow}" min="${todayStr()}"></div>
    <div class="chips">${[0, 1, 2, 3, 4, 5, 6].map(n => { const d = addDays(todayStr(), n); return `<button class="chip" data-act="d" data-v="${d}">${n === 0 ? 'Hoje' : n === 1 ? 'Amanhã' : parseYmd(d).toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric' })}</button>`; }).join('')}</div>
    <button class="btn block" data-act="ok">Programar</button>`, {
    title,
    onAct: async (act, el) => {
      if (act === 'd') $('#sd').value = el.dataset.v;
      if (act === 'ok') {
        const date = $('#sd').value || tomorrow;
        const ids = lookId ? lookItems(look(lookId)).map(i => i.id) : itemIds;
        await save('events', { id: uid(), date, lookId: lookId || null, itemIds: ids, profileIds: [...new Set(ids.map(i => item(i)?.profileId).filter(Boolean))], status: 'programado' });
        closeSheet(); toast('Programado para ' + fmtDate(date) + '!'); nav.refresh();
      }
    },
  });
}

// ---------- termômetro e ranking ----------
function ranking() {
  return `<div class="subtabs">${[['termometro', 'Termômetro'], ['ranking', 'Ranking']].map(([id, n]) => `<button class="${T.sub === id ? 'on' : ''}" data-act="sub" data-v="${id}">${n}</button>`).join('')}</div>
    ${T.sub === 'termometro' ? thermometer() : rankingList()}`;
}

function thermometer() {
  const p = curProfile();
  if (p.sharedFrom) return emptyState(`Este é o closet compartilhado de ${esc(p.name)}. O termômetro mostra o uso só dos seus closets — abra o seu closet pelo avatar no topo.`, 'thermo');
  const its = profileItems(p.id).filter(i => i.status !== 'pequena');
  const counts = {};
  for (const i of its) { const b = itemBand(i); counts[b] = (counts[b] || 0) + 1; }
  const list = its.filter(i => itemBand(i) === T.band).sort((a, b) => daysUnused(b) - daysUnused(a));
  const b = band(T.band);
  const small = p.kind === 'crianca' ? profileItems(p.id).filter(i => i.status === 'pequena' || maybeSmall(i)) : [];
  const gauge = BANDS.filter(x => x.id !== 'fora' && x.id !== 'avaliacao').map(x => `<span style="flex:${(counts[x.id] || 0) + 0.15};background:${x.color}" title="${x.name}"></span>`).join('');
  return `
    <div class="gauge">${gauge}</div>
    <div class="gauge-legend"><span>🔥 Mais usadas</span><span>Esquecidas ❄️</span></div>
    ${chips(BANDS, T.band, 'band', { counts, dots: true })}
    <div class="rows">${list.map(i => {
      const u = itemUsage(i);
      return itemRow(i, `<span class="bl" style="color:${b.color === '#CFCFCF' ? '#999' : b.color}"><span class="dot" style="background:${b.color}"></span>${b.name}</span>`).replace('<div class="sub"></div>', `<div class="sub">${u.last ? `Usada há ${daysUnused(i)} dias` : 'Ainda sem uso registrado'}</div>`);
    }).join('') || emptyState('Nenhuma peça nesta faixa do termômetro.', 'thermo')}</div>
    ${['esquecida', 'alerta'].includes(T.band) && list.length ? `<div class="row-btns wide"><a class="btn" href="#/hoje">${icon('dice')} Montar look com elas</a><a class="btn ghost" href="#/onde">Doações e vendas</a></div>` : ''}
    <p class="foot">Peças em vermelho estão sem uso há 120 dias ou mais — boas candidatas para um look novo, doação ou revenda. Peças cadastradas há menos de 30 dias ficam em avaliação. Peças de frio no verão (e vice-versa) ficam “fora de estação” e não esfriam.</p>
    ${small.length ? `<h3 class="sec">Não servem mais em ${esc(p.name)}</h3><div class="rows">${small.map(i => itemRow(i, `<span class="small warn">${i.status === 'pequena' ? 'Pequena' : 'Tam. ' + esc(i.size) + '?'}</span>`)).join('')}</div><p class="hint">Que tal passar adiante, doar ou vender?</p>` : ''}`;
}

function rankingList() {
  const p = curProfile();
  const its = profileItems(p.id);
  const withU = its.map(i => ({ i, u: itemUsage(i), cpu: costPerUse(i.price, itemUsage(i).uses) }));
  const most = withU.filter(x => x.u.uses).sort((a, b) => b.u.uses - a.u.uses).slice(0, 10);
  const best = withU.filter(x => x.i.price && x.u.uses).sort((a, b) => a.cpu - b.cpu).slice(0, 10);
  const worst = withU.filter(x => x.i.price).sort((a, b) => b.cpu - a.cpu).slice(0, 10);
  const looks = S.looks.filter(l => lookItems(l).some(i => i.profileId === p.id)).map(l => ({ l, u: lookUsage(l) })).filter(x => x.u.uses).sort((a, b) => b.u.uses - a.u.uses).slice(0, 6);
  const list = (arr, right) => arr.length ? `<div class="rows">${arr.map((x, k) => itemRow(x.i, right(x)).replace('<div class="thumb">', `<span class="rank">${k + 1}</span><div class="thumb">`)).join('')}</div>` : '<p class="muted small">Registre usos para ver o ranking.</p>';
  return `
    <h3 class="sec">🔥 Mais usadas</h3>${list(most, x => `<b>${x.u.uses}×</b>`)}
    <h3 class="sec">💰 Melhor custo por uso</h3>${list(best, x => `<b>${brl(x.cpu)}</b><br><span class="muted small">${x.u.uses} usos</span>`)}
    <h3 class="sec">💸 Mais caras por uso</h3>${list(worst, x => `<b>${brl(x.cpu)}</b><br><span class="muted small">${x.u.uses} usos</span>`)}
    ${looks.length ? `<h3 class="sec">Looks favoritos</h3><div class="lgrid">${looks.map(x => `<div class="lcard" data-act="open-look" data-id="${x.l.id}">${collage(lookItems(x.l), 'sm')}<div class="lc-name">${esc(x.l.name)}</div><div class="lc-sub">${x.u.uses} usos</div></div>`).join('')}</div>` : ''}`;
}

// ---------- viagens ----------
function trips() {
  const list = [...S.trips].sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  return `
    <p class="hint">${icon('suitcase')} Monte os looks de cada dia da viagem e o app gera a lista da mala.</p>
    ${list.map(t => {
      const n = (t.days || []).reduce((s, d) => s + d.lookIds.length, 0);
      return `<div class="trip" data-act="trip" data-id="${t.id}"><div><b>${esc(t.name)}</b><div class="muted small">${esc(t.dest || '')} ${t.start ? '· ' + fmtDate(t.start) + ' a ' + fmtDate(t.end) : ''}</div><div class="small">${n} look${n === 1 ? '' : 's'} · ${CLIMAS.find(c => c.id === t.clima)?.icon || ''}</div></div>${icon('chev')}</div>`;
    }).join('') || emptyState('Nenhuma viagem planejada.', 'suitcase')}
    <button class="btn block" data-act="new-trip">${icon('plus')} Nova viagem</button>`;
}

export function tripForm(t) {
  const isNew = !t;
  t = t || { id: uid(), name: '', dest: '', start: todayStr(), end: addDays(todayStr(), 3), clima: 'calor', profileIds: [curProfile().id], days: [], packed: {}, extras: [] };
  const sel = new Set(t.profileIds);
  const draw = () => `
    <div class="field"><label>Nome</label><input id="tn" value="${esc(t.name)}" placeholder="Ex.: Viagem Pernambuco"></div>
    <div class="field"><label>Cidade de destino</label><input id="td" value="${esc(t.dest)}" placeholder="Ex.: Tóquio, Porto de Galinhas, Paris"><p class="hint">${icon('sun')} Com a cidade, o app busca a previsão do tempo de cada dia.</p></div>
    <div class="grid2"><div class="field"><label>Ida</label><input type="date" id="ts" value="${t.start}"></div><div class="field"><label>Volta</label><input type="date" id="te" value="${t.end}"></div></div>
    <div class="field"><label>Clima esperado (usado se não houver previsão)</label><div class="chips">${CLIMAS.map(c => `<button class="chip ${t.clima === c.id ? 'on' : ''}" data-act="cl" data-v="${c.id}">${c.icon} ${c.name}</button>`).join('')}</div></div>
    ${S.profiles.length > 1 ? `<div class="field"><label>Quem vai</label><div class="chips">${S.profiles.map(p => `<button class="chip ${sel.has(p.id) ? 'on' : ''}" data-act="pp" data-v="${p.id}">${esc(p.name)}</button>`).join('')}</div></div>` : ''}
    <button class="btn block" data-act="ok">${isNew ? 'Criar viagem' : 'Salvar'}</button>`;
  const keep = () => { t.name = $('#tn').value; t.dest = $('#td').value; t.start = $('#ts').value; t.end = $('#te').value; };
  const body = openSheet(draw(), {
    title: isNew ? 'Nova viagem' : 'Editar viagem',
    onAct: async (act, el) => {
      if (act === 'cl') { keep(); t.clima = el.dataset.v; body.innerHTML = draw(); }
      else if (act === 'pp') { keep(); const v = el.dataset.v; sel.has(v) ? sel.size > 1 && sel.delete(v) : sel.add(v); body.innerHTML = draw(); }
      else if (act === 'ok') {
        keep();
        if (!t.name.trim()) return toast('Dê um nome para a viagem.');
        if (!t.start || !t.end || t.end < t.start) return toast('Confira as datas.');
        const n = Math.min(60, daysBetween(t.start, t.end) + 1);
        const old = new Map((t.days || []).map(d => [d.date, d]));
        t.days = Array.from({ length: n }, (_, i) => { const date = addDays(t.start, i); return old.get(date) || { date, lookIds: [] }; });
        t.profileIds = [...sel];
        if (t.dest.trim() && t.place?.query !== t.dest.trim()) {
          try {
            const res = await searchCity(t.dest.trim());
            let place = res[0];
            if (res.length > 1) place = await choose('Qual destas cidades?', res.map(r => ({ name: r.label, value: r, icon: 'sun' }))) || res[0];
            if (place) { t.place = { ...place, query: t.dest.trim() }; t.weather = null; }
            else toast('Não encontrei essa cidade — a viagem fica sem previsão do tempo.');
          } catch { toast('Sem internet: a previsão do tempo vem quando você abrir a viagem com internet.'); }
        }
        if (!t.dest.trim()) { t.place = null; t.weather = null; }
        await save('trips', t);
        closeSheet(); nav.go('#/viagem/' + t.id);
      }
    },
  });
}

const BASICS = ['Documentos', 'Carregador de celular', 'Escova e pasta de dente', 'Necessaire', 'Remédios', 'Roupas íntimas', 'Pijama'];
const BASICS_CALOR = ['Protetor solar', 'Óculos de sol', 'Chinelo'];
const BASICS_FRIO = ['Meias', 'Hidratante labial'];

export function renderTrip(main, params) {
  const t = S.trips.find(x => x.id === params.id);
  if (!t) return nav.go('#/planejar');
  t.packed ||= {}; t.extras ||= [];
  const allLooks = t.days.flatMap(d => d.lookIds).map(look).filter(Boolean);
  const its = [...new Map(allLooks.flatMap(lookItems).map(i => [i.id, i])).values()];
  const total = its.length + t.extras.length;
  const packed = its.filter(i => t.packed[i.id]).length + t.extras.filter(x => x.done).length;
  const byProfile = new Map();
  for (const i of its) { if (!byProfile.has(i.profileId)) byProfile.set(i.profileId, []); byProfile.get(i.profileId).push(i); }
  const away = its.filter(i => i.status && i.status !== 'armario');
  refreshWeather(t);
  const W = t.weather?.days || {};
  const wdays = t.days.map(d => W[d.date]).filter(Boolean);
  const anyEst = wdays.some(w => w.source === 'estimativa');
  const dayClima = d => climaFromTemp(W[d.date]) || t.clima;
  main.innerHTML = `
    ${header(esc(t.name), { back: '#/planejar', sub: `${esc(t.dest || '')} ${fmtDate(t.start)} a ${fmtDate(t.end)}`, right: `<button class="icon-btn" data-act="edit" aria-label="Editar">${icon('edit')}</button><button class="icon-btn" data-act="del" aria-label="Excluir">${icon('trash')}</button>` })}
    <div class="pad">
      ${t.place ? `<div class="wx-card">
        <div class="wx-top">${icon('sun')}<b>Tempo em ${esc(t.place.name)}</b><span class="grow"></span><button class="icon-btn" data-act="wx-refresh" aria-label="Atualizar previsão">${icon('refresh')}</button></div>
        ${wdays.length ? `<div class="small">De ${Math.round(Math.min(...wdays.map(w => w.min)))}° a ${Math.round(Math.max(...wdays.map(w => w.max)))}°${wdays.some(w => (w.rain ?? 0) >= 50) ? ` · chance de chuva em ${wdays.filter(w => (w.rain ?? 0) >= 50).length} dia(s)` : ''}</div>
          ${anyEst ? `<div class="small muted">${wdays.every(w => w.source === 'estimativa') ? 'A previsão só sai uns 15 dias antes.' : 'Os dias mais distantes ainda não têm previsão.'} Por enquanto mostro uma <b>estimativa</b> pelo tempo dessas datas no ano passado.</div>` : '<div class="small muted">Previsão do tempo atualizada.</div>'}`
          : `<div class="small muted">${weatherLoading.has(t.id) ? 'Buscando a previsão…' : 'Previsão indisponível agora (sem internet?).'}</div>`}
      </div>` : (t.dest ? '' : `<p class="hint">${icon('sun')} Coloque a cidade de destino (editar viagem) para ver a previsão do tempo de cada dia.</p>`)}
      <button class="btn block" data-act="suggest-all">${icon('wand')} Sugerir looks para os dias sem look</button>
      <h3 class="sec">Looks por dia</h3>
      ${t.days.map((d, k) => `<div class="tday">
        <div class="td-head"><b>Dia ${k + 1}</b> <span class="muted small">${parseYmd(d.date).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}</span>
          <span class="grow"></span>
          <button class="chip" data-act="sugday" data-v="${d.date}" aria-label="Sugerir look pelo clima">✨</button>
          <button class="chip" data-act="addlook" data-v="${d.date}">+ Look</button>
          <button class="chip" data-act="newlook" data-v="${d.date}" data-k="${k + 1}">+ Montar</button></div>
        ${W[d.date] ? `<div class="wx-line"><span class="wx-chip ${W[d.date].source}">${weatherIcon(W[d.date].code)[0]} ${weatherIcon(W[d.date].code)[1]} · ${Math.round(W[d.date].max)}° / ${Math.round(W[d.date].min)}°${W[d.date].rain >= 30 ? ` · 💧 ${W[d.date].rain}%` : ''}${W[d.date].source === 'estimativa' ? ' · estimativa' : ''}</span></div>` : ''}
        ${dayTips(W[d.date]).length ? `<ul class="wx-tips">${dayTips(W[d.date]).map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}
        <div class="hscroll">${d.lookIds.map(look).filter(Boolean).map(l => `<div class="mini-look"><a href="#/look/${l.id}">${collage(lookItems(l), 'sm')}<span>${esc(l.name)}</span></a><button class="x" data-act="rmlook" data-v="${d.date}" data-id="${l.id}" aria-label="Tirar do dia">${icon('x')}</button></div>`).join('') || '<span class="muted small">Sem look ainda</span>'}</div>
      </div>`).join('')}
      <button class="btn block ghost" data-act="tocal">${icon('calendar')} Colocar os looks no calendário</button>

      <h3 class="sec">Mala ${total ? `<span class="muted small">${packed}/${total} na mala</span>` : ''}</h3>
      ${total ? `<div class="progress"><span style="width:${total ? packed / total * 100 : 0}%"></span></div>` : ''}
      ${away.length ? `<div class="pill warn">Fora do armário agora: ${away.map(i => esc(i.name) + ' (' + statusName(i.status) + ')').join(', ')}</div>` : ''}
      ${[...byProfile].map(([pid, list]) => `
        ${byProfile.size > 1 ? `<div class="who-head">${avatar(profile(pid), 'xs')} ${esc(profile(pid)?.name || '')}</div>` : ''}
        <div class="checklist">${sortByCat(list).map(i => `<label class="ck ${t.packed[i.id] ? 'done' : ''}"><input type="checkbox" data-pk="${i.id}" ${t.packed[i.id] ? 'checked' : ''}><span class="thumb">${i.photos?.[0] ? `<img data-ph="${i.photos[0]}" alt="">` : ''}</span><span>${esc(i.name)}<small>${esc(catName(i.category))}</small></span></label>`).join('')}</div>`).join('')}
      ${!its.length ? '<p class="muted small">Adicione looks aos dias para gerar a lista de peças.</p>' : ''}
      <div class="checklist">${t.extras.map(x => `<label class="ck ${x.done ? 'done' : ''}"><input type="checkbox" data-ex="${x.id}" ${x.done ? 'checked' : ''}><span>${esc(x.text)}</span><button class="x" data-act="rmex" data-id="${x.id}">${icon('x')}</button></label>`).join('')}</div>
      <div class="tag-in"><span>+</span><input id="exIn" placeholder="Outro item (ex.: secador)" enterkeyhint="done"><button class="icon-btn" data-act="addex">${icon('plus')}</button></div>
      <button class="btn small ghost" data-act="basics">Adicionar itens básicos</button>
    </div>`;
  hydrate(main);
  const persist = () => save('trips', t);
  main.oninput = null;
  main.onchange = async e => {
    const el = e.target;
    if (el.dataset.pk) { t.packed[el.dataset.pk] = el.checked; await persist(); nav.refresh(); }
    if (el.dataset.ex) { const x = t.extras.find(x => x.id === el.dataset.ex); x.done = el.checked; await persist(); nav.refresh(); }
  };
  main.onkeydown = e => { if (e.target.id === 'exIn' && e.key === 'Enter') { e.preventDefault(); main.querySelector('[data-act="addex"]').click(); } };
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act, v = a.dataset.v;
    if (act === 'edit') tripForm(t);
    else if (act === 'del') { if (confirm('Excluir esta viagem? Os looks continuam salvos.')) { await remove('trips', t.id); nav.go('#/planejar', true); } }
    else if (act === 'addlook') pickLookSheet(async l => { const d = t.days.find(d => d.date === v); if (!d.lookIds.includes(l.id)) d.lookIds.push(l.id); await persist(); nav.refresh(); });
    else if (act === 'newlook') nav.go(`#/novo-look?trip=${t.id}&day=${v}&group=${encodeURIComponent(t.name)}&name=${encodeURIComponent('Dia ' + a.dataset.k + ' - ')}&perfis=${t.profileIds.join(',')}`);
    else if (act === 'rmlook') { const d = t.days.find(d => d.date === v); d.lookIds = d.lookIds.filter(x => x !== a.dataset.id); await persist(); nav.refresh(); }
    else if (act === 'addex') { const inp = $('#exIn'); const txt = inp.value.trim(); if (txt) { t.extras.push({ id: uid(), text: txt, done: false }); await persist(); nav.refresh(); setTimeout(() => $('#exIn')?.focus(), 0); } }
    else if (act === 'rmex') { t.extras = t.extras.filter(x => x.id !== a.dataset.id); await persist(); nav.refresh(); }
    else if (act === 'wx-refresh') { refreshWeather(t, true); nav.refresh(); }
    else if (act === 'suggest-all' || act === 'sugday') {
      const days = act === 'sugday' ? t.days.filter(d => d.date === v) : t.days.filter(d => !d.lookIds.length);
      if (!days.length) return toast('Todos os dias já têm look.');
      const n = await suggestTripLooks(t, days, dayClima);
      toast(n ? `${n} look${n > 1 ? 's' : ''} sugerido${n > 1 ? 's' : ''}! Toque para ver ou trocar.` : 'Não achei peças suficientes para esse clima.');
      nav.refresh();
    }
    else if (act === 'basics') {
      const climas = new Set(t.days.map(dayClima));
      const rainy = Object.values(W).some(w => (w.rain ?? 0) >= 50);
      const add = [...BASICS, ...(climas.has('calor') ? BASICS_CALOR : []), ...(climas.has('frio') ? BASICS_FRIO : []), ...(rainy ? ['Guarda-chuva'] : [])].filter(b => !t.extras.some(x => x.text === b));
      t.extras.push(...add.map(text => ({ id: uid(), text, done: false })));
      await persist(); nav.refresh();
    }
    else if (act === 'tocal') {
      let n = 0;
      for (const d of t.days) for (const lid of d.lookIds) {
        if (S.events.some(e => e.lookId === lid && e.date === d.date)) continue;
        const l = look(lid); if (!l) continue;
        const ids = lookItems(l).map(i => i.id);
        await save('events', { id: uid(), date: d.date, lookId: lid, itemIds: ids, profileIds: [...new Set(lookItems(l).map(i => i.profileId))], status: 'programado', note: t.name });
        n++;
      }
      toast(n ? `${n} look${n > 1 ? 's' : ''} no calendário!` : 'Já está tudo no calendário.');
    }
  };
}

// ---------- previsão do tempo da viagem ----------
const weatherLoading = new Set();
async function refreshWeather(t, force = false) {
  if (!t.place || weatherLoading.has(t.id) || !navigator.onLine) return;
  const w = t.weather;
  const fresh = w && w.start === t.start && w.end === t.end && Date.now() - new Date(w.fetchedAt).getTime() < 6 * 3600e3;
  if (fresh && !force) return;
  weatherLoading.add(t.id);
  try {
    const days = await tripWeather(t.place, t.start, t.end);
    t.weather = { fetchedAt: new Date().toISOString(), start: t.start, end: t.end, days };
    const cl = Object.values(days).map(climaFromTemp).filter(Boolean);
    if (cl.length) t.clima = ['calor', 'meia', 'frio'].sort((a, b) => cl.filter(x => x === b).length - cl.filter(x => x === a).length)[0];
    await save('trips', t);
  } catch { /* sem previsão: segue com o clima escolhido */ }
  weatherLoading.delete(t.id);
  if (location.hash === '#/viagem/' + t.id) nav.refresh();
}

// monta um look por dia (um look só com todas as pessoas da viagem), evitando repetir peças
async function suggestTripLooks(t, days, dayClima) {
  const used = new Map();
  for (const d of t.days) for (const l of d.lookIds.map(look).filter(Boolean)) for (const id of l.itemIds || []) used.set(id, (used.get(id) || 0) + 1);
  let n = 0;
  for (const d of days) {
    const clima = dayClima(d);
    const chosen = [];
    for (const pid of t.profileIds) chosen.push(...Object.values(suggestLook(pid, { clima, used }, chosen)));
    if (!chosen.length) continue;
    chosen.forEach(id => used.set(id, (used.get(id) || 0) + 1));
    const k = t.days.indexOf(d) + 1;
    const l = { id: uid(), name: `Dia ${k} - ${t.place?.name || t.dest || t.name}`, group: t.name, ocasiao: 'Viagem', itemIds: chosen, climas: [clima], createdAt: new Date().toISOString() };
    await save('looks', l);
    d.lookIds.push(l.id);
    n++;
  }
  await save('trips', t);
  return n;
}

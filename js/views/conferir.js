// Conferência das peças importadas em lote: uma a uma ou todas de uma vez.
import { S, item, save, deleteItem, profile } from '../store.js';
import { catName, cartelaName, CLIMAS, DETAIL_FIELDS } from '../catalog.js';
import { FAMILIES } from '../color.js';
import { header, icon, swatch, hydrate, nav, emptyState } from '../ui.js';
import { esc, toast } from '../util.js';

let idx = 0;

const pendentes = () => S.items.filter(i => i.pendente).sort((a, b) => (a.code || '').localeCompare(b.code || ''));

export function render(main, params) {
  const list = pendentes();
  if (params.id) { const i = list.findIndex(x => x.id === params.id); if (i >= 0) idx = i; }
  if (idx >= list.length) idx = Math.max(0, list.length - 1);
  if (!list.length) {
    main.innerHTML = `${header('Conferir importadas', { back: '#/armario' })}
      ${emptyState('Tudo conferido! 🎉<br>Nenhuma peça esperando.', 'checkCircle', '<a class="btn" href="#/armario">Ver o closet</a>')}`;
    main.onclick = main.oninput = main.onchange = null;
    return;
  }
  const it = list[idx];
  const filled = DETAIL_FIELDS.filter(d => it.detalhes?.[d.id]).length;
  const climas = (it.climas || []).length === 3 ? 'Ano todo' : (it.climas || []).map(c => CLIMAS.find(x => x.id === c)?.name).join(', ');
  main.innerHTML = `
    ${header('Conferir importadas', { back: '#/armario', sub: `${idx + 1} de ${list.length}` })}
    <div class="pad">
      <div class="conf-top">
        <div class="progress"><span style="width:${(idx + 1) / list.length * 100}%"></span></div>
        <button class="btn small ghost" data-act="all">${icon('check')} Confirmar todas (${list.length})</button>
      </div>
      <div class="conf-card">
        <div class="conf-photos">${(it.photos || []).length ? it.photos.map(id => `<div class="cp"><img data-ph="${id}" data-size="full" alt="">${it.photoLabels?.[id] ? `<span class="lbl">${esc(it.photoLabels[id])}</span>` : ''}</div>`).join('') : `<div class="cp noph">${icon('hanger')}<small>sem foto</small></div>`}</div>
        <div class="code-tag">${esc(it.code || '')}</div>
        <h2 class="serif big">${esc(it.name)}</h2>
        <div class="muted">${esc(catName(it.category))}${it.sub ? ' · ' + esc(it.sub) : ''}${S.profiles.length > 1 ? ' · closet de ' + esc(profile(it.profileId)?.name || '') : ''}</div>
        <div class="color-list" style="margin-top:10px">${(it.colors || []).map(c => `<span class="cpill">${swatch(c.hex)}${esc(c.name)}${c.pct ? ` <small>${c.pct}%</small>` : ''}</span>`).join('') || '<span class="muted small">sem cores</span>'}</div>
        <dl class="dl">
          ${row('Paleta', it.family ? (FAMILIES[it.family] || 'Colorido / estampado') : '')}
          ${row('Cartela', cartelaName(it.cartela))}
          ${row('Estampa', it.estampa)}
          ${row('Clima', climas)}
          ${row('Ocasiões', (it.ocasioes || []).join(', '))}
          ${row('Estilo', it.estilo)}
          ${row('Ficha técnica', filled ? `${filled} detalhes preenchidos` : 'vazia')}
        </dl>
        ${it.descricao ? `<p class="desc small">${esc(it.descricao)}</p>` : ''}
        ${it.fromFicha === false ? `<p class="hint">${icon('info')} Veio sem ficha da IA: confira categoria e cores.</p>` : ''}
      </div>
      <div class="conf-actions">
        <button class="btn ghost" data-act="del" aria-label="Excluir">${icon('trash')}</button>
        <button class="btn ghost" data-act="edit">${icon('edit')} Editar</button>
        <button class="btn" data-act="ok">${icon('check')} Está certo</button>
      </div>
      <div class="row-btns" style="justify-content:space-between">
        <button class="link small" data-act="prev" ${idx === 0 ? 'disabled' : ''}>← Anterior</button>
        <button class="link small" data-act="next">Pular →</button>
      </div>
      <button class="link small danger-link" data-act="del-all">Excluir as ${list.length} importadas sem conferir</button>
      <h3 class="sec">Todas esperando (${list.length})</h3>
      <div class="conf-strip">${list.map((x, i) => `<button class="${i === idx ? 'on' : ''}" data-act="go" data-i="${i}">${x.photos?.[0] ? `<img data-ph="${x.photos[0]}" alt="">` : icon('hanger')}<small>${esc(x.code || '')}</small></button>`).join('')}</div>
    </div>`;
  hydrate(main);
  main.oninput = main.onchange = null;
  main.onclick = async e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const act = a.dataset.act;
    if (act === 'ok') { it.pendente = false; await save('items', it); toast('Conferida ✓'); nav.refresh(); }
    else if (act === 'next') { idx = (idx + 1) % list.length; nav.refresh(); }
    else if (act === 'prev') { idx = Math.max(0, idx - 1); nav.refresh(); }
    else if (act === 'go') { idx = +a.dataset.i; nav.refresh(); scrollTo(0, 0); }
    else if (act === 'edit') nav.go('#/editar-peca/' + it.id);
    else if (act === 'del') { if (confirm(`Excluir “${it.name}”? As fotos também serão apagadas.`)) { await deleteItem(it.id); toast('Excluída.'); nav.refresh(); } }
    else if (act === 'del-all') {
      if (!confirm(`Excluir as ${list.length} peças importadas que ainda não foram conferidas (e as fotos delas)?`)) return;
      for (const x of list) await deleteItem(x.id);
      toast('Importação desfeita.'); nav.refresh();
    }
    else if (act === 'all') {
      if (!confirm(`Confirmar as ${list.length} peças de uma vez? Você pode editar qualquer uma depois.`)) return;
      for (const x of list) { x.pendente = false; await save('items', x); }
      toast(`${list.length} peças confirmadas!`); nav.refresh();
    }
  };
}

const row = (k, v) => v ? `<dt>${k}</dt><dd>${esc(v)}</dd>` : '';

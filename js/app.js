import { load, S, saveSettings } from './store.js';
import { checkRemote, countOpen } from './remote.js';
import { nav, openSheet, closeSheet, avatar, icon } from './ui.js';
import { $, esc, toast } from './util.js';
import * as armario from './views/armario.js';
import * as peca from './views/peca.js';
import * as looks from './views/looks.js';
import * as planejar from './views/planejar.js';
import * as hub from './views/hub.js';
import * as backup from './views/backup.js';
import * as lote from './views/lote.js';
import * as conferir from './views/conferir.js';
import * as painel from './views/painel.js';

const routes = {
  armario: armario.render,
  peca: peca.renderDetail,
  'nova-peca': peca.renderForm,
  'editar-peca': peca.renderForm,
  lote: lote.render,
  conferir: conferir.render,
  looks: looks.renderList,
  look: looks.renderDetail,
  'novo-look': looks.renderComposer,
  'editar-look': looks.renderComposer,
  hoje: looks.renderHoje,
  juntas: looks.renderJuntas,
  planejar: planejar.render,
  viagem: planejar.renderTrip,
  hub: hub.render,
  perfis: hub.renderPerfis,
  desejos: hub.renderDesejos,
  relatorios: painel.render,
  painel: painel.render,
  onde: hub.renderOnde,
  comprar: hub.renderComprar,
  guia: hub.renderGuia,
  backup: backup.render,
  compartilhar: backup.renderCompartilhar,
};
const TAB = {
  armario: 'armario', peca: 'armario', 'nova-peca': 'armario', 'editar-peca': 'armario', lote: 'armario', conferir: 'armario',
  looks: 'looks', look: 'looks', 'novo-look': 'looks', 'editar-look': 'looks', hoje: 'looks', juntas: 'looks',
  planejar: 'planejar', viagem: 'planejar',
};
const LISTS = ['armario', 'looks', 'planejar', 'hub'];

const main = $('#main');
const scrollPos = {};
let current = null, depth = 0;

function parse() {
  const h = (location.hash || '#/armario').replace(/^#\/?/, '');
  const [path, q] = h.split('?');
  const [name, id] = path.split('/');
  const params = Object.fromEntries(new URLSearchParams(q || ''));
  if (id) params.id = decodeURIComponent(id);
  return { name: routes[name] ? name : 'armario', params };
}

async function render(keepScroll) {
  const { name, params } = parse();
  const y = scrollY;
  try { await routes[name](main, params); }
  catch (err) { console.error(err); main.innerHTML = `<div class="pad"><p>Ops, algo deu errado nesta tela.</p><pre class="small">${esc(err.message)}</pre><a class="btn" href="#/armario">Voltar ao closet</a></div>`; }
  document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === (TAB[name] || 'hub')));
  if (keepScroll) scrollTo(0, y);
  return name;
}

async function onRoute() {
  if (current) scrollPos[current] = scrollY;
  closeSheet();
  depth++;
  nav.fresh = true;
  const name = await render(false);
  nav.fresh = false;
  current = location.hash;
  scrollTo(0, LISTS.includes(name) ? (scrollPos[current] || 0) : 0);
}

nav.refresh = () => render(true);
nav.go = (h, replace) => {
  if (h === location.hash) return render(false);
  if (replace) { location.replace(h); } else location.hash = h;
};

document.addEventListener('click', async e => {
  const back = e.target.closest('[data-back]');
  if (back) { e.preventDefault(); if (depth > 1) history.back(); else nav.go(back.dataset.back, true); return; }
  const sw = e.target.closest('[data-act="switch-profile"]');
  if (sw) { e.preventDefault(); profileSwitcher(); }
});

function profileSwitcher() {
  openSheet(`<div class="menu">${S.profiles.map(p => `<button class="menu-item" data-act="pick" data-id="${p.id}">${avatar(p)}<span>${esc(p.name)}</span>${p.id === S.settings.currentProfile ? icon('check') : ''}</button>`).join('')}
    <a class="menu-item" href="#/perfis">${icon('users')}<span>Gerenciar pessoas</span>${icon('chev')}</a></div>`, {
    title: 'Abrir closet de…',
    onAct: async (act, el) => {
      if (act !== 'pick') return;
      S.settings.currentProfile = el.dataset.id;
      await saveSettings();
      closeSheet();
      nav.refresh();
    },
  });
}

function installHint() {
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (standalone || !ios || S.settings.installDismissed) return;
  const el = $('#install');
  el.innerHTML = `${icon('share')}<span>Instale o app: toque em <b>Compartilhar</b> e depois em <b>Adicionar à Tela de Início</b>. Use sempre pelo ícone para não perder os dados.</span><button class="icon-btn" data-x aria-label="Fechar">${icon('x')}</button>`;
  el.hidden = false;
  el.querySelector('[data-x]').onclick = async () => { el.hidden = true; S.settings.installDismissed = true; await saveSettings(); };
}

async function start() {
  try {
    await load();
  } catch (err) {
    main.innerHTML = `<div class="pad"><h2>Não consegui abrir o banco de dados</h2><p>${esc(err.message)}</p><p>Se estiver em navegação privada, abra numa aba normal.</p></div>`;
    return;
  }
  try { if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch { }
  window.addEventListener('hashchange', onRoute);
  await onRoute();
  installHint();
  checkRemote();
  countOpen();
  // no computador de desenvolvimento (localhost) o modo offline fica desligado para não servir arquivos velhos
  if ('serviceWorker' in navigator && location.protocol === 'https:') {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        w?.addEventListener('statechange', () => { if (w.state === 'activated' && navigator.serviceWorker.controller) toast('App atualizado! Feche e abra para ver as novidades.'); });
      });
    }).catch(() => { });
  }
}
start();

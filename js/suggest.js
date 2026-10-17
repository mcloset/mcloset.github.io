// Monta sugestões de look automaticamente (Look do dia e Look em grupo).
import { profileItems, itemBand, item } from './store.js';
import { scoreAgainst, paletteFit } from './color.js';
import { shuffle } from './util.js';

export const SLOTS = [
  { id: 'cima', name: 'Parte de cima', cats: ['cima'] },
  { id: 'baixo', name: 'Parte de baixo', cats: ['baixo'] },
  { id: 'unica', name: 'Peça única', cats: ['unicas'] },
  { id: 'casaco', name: 'Casaco', cats: ['casacos'] },
  { id: 'calcado', name: 'Calçado', cats: ['calcados'] },
  { id: 'bolsa', name: 'Bolsa', cats: ['bolsas'] },
  { id: 'joia', name: 'Brinco / joia', cats: ['joias'] },
];
// peças pouco usadas têm mais chance de aparecer
const WEIGHT = { esquecida: 4, alerta: 3, esfriando: 2.5, avaliacao: 2, regular: 1.5, recente: 1, fora: 0.3 };

const climaOk = (i, clima) => !clima || !(i.climas || []).length || clima === 'meia' || i.climas.includes(clima) || (clima === 'frio' && i.climas.includes('meia'));

// opts: { clima, ocasiao, palette, baseHex }
export function candidates(pid, slot, opts = {}) {
  return profileItems(pid).filter(i => slot.cats.includes(i.category) && (!i.status || i.status === 'armario')
    && climaOk(i, opts.clima)
    && (!opts.ocasiao || !(i.ocasioes || []).length || i.ocasioes.includes(opts.ocasiao))
    && (!opts.palette || paletteFit(i, opts.palette, opts.baseHex) >= 0.6));
}

export function pickSlot(pid, slot, opts, chosenIds, avoid) {
  const cands = candidates(pid, slot, opts).filter(i => i.id !== avoid);
  if (!cands.length) return null;
  const chosen = chosenIds.map(item).filter(Boolean);
  const scored = cands.map(i => {
    const h = chosen.length ? scoreAgainst(i, chosen).score : 75;
    const rep = opts.used ? Math.pow(0.35, opts.used.get(i.id) || 0) : 1;   // peça já usada em outro dia da viagem pesa menos
    return { i, w: Math.pow(h / 100, 3) * (WEIGHT[itemBand(i)] || 1) * rep * (0.6 + Math.random() * 0.8) };
  }).sort((a, b) => b.w - a.w);
  return scored[0].i.id;
}

// devolve { slot: itemId }; "others" são peças já escolhidas (de outras pessoas) que o look deve acompanhar
export function suggestLook(pid, opts = {}, others = []) {
  const res = {};
  const has = id => candidates(pid, SLOTS.find(s => s.id === id), opts).length;
  const useUnica = has('unica') && (!has('cima') || !has('baixo') || Math.random() < 0.35);
  const order = useUnica ? ['unica'] : shuffle(['cima', 'baixo']);
  if (opts.clima === 'frio') order.push('casaco');
  order.push('calcado', 'bolsa', 'joia');
  for (const s of order) {
    const id = pickSlot(pid, SLOTS.find(x => x.id === s), opts, [...others, ...Object.values(res)]);
    if (id) res[s] = id;
  }
  return res;
}

// Transforma peças do closet em texto: ficha de uma peça e o "prompt do guarda-roupa" completo.
import { S, profile, itemUsage, itemBand, costPerUse } from './store.js';
import { catName, cartelaName, CLIMAS, PIRAMIDE, DETAIL_FIELDS, statusName, band, CAT_ORDER } from './catalog.js';
import { FAMILIES } from './color.js';
import { brl, fmtDate } from './util.js';

const climasTxt = it => (it.climas || []).length === 3 ? 'Ano todo' : (it.climas || []).map(c => CLIMAS.find(x => x.id === c)?.name).join(', ');

// Ficha de uma peça, no mesmo formato que a IA usa (dá para colar de volta no app)
export function itemText(it, { usage = false, price = false } = {}) {
  const L = [];
  const add = (k, v) => { if (v != null && v !== '' && !(Array.isArray(v) && !v.length)) L.push(`${k}: ${v}`); };
  L.push(`FICHA ${it.code || ''}`.trim());
  add('Código', it.code);
  add('Nome', it.name);
  add('Pessoa', profile(it.profileId)?.name);
  add('Categoria', catName(it.category));
  add('Tipo', it.sub);
  add('Cores', (it.colors || []).map(c => `${c.name} ${c.hex}${c.pct ? ' ' + c.pct + '%' : ''}`).join(', '));
  add('Paleta', it.family ? (FAMILIES[it.family] || 'Colorido / estampado') : '');
  add('Cartela', cartelaName(it.cartela));
  add('Estampa', it.estampa);
  add('Clima', climasTxt(it));
  add('Ocasiões', (it.ocasioes || []).join(', '));
  add('Estilo', it.estilo);
  add('Pirâmide', PIRAMIDE.find(p => p.id === it.piramide)?.name);
  add('Marca', it.brand);
  add('Tamanho', it.size);
  for (const d of DETAIL_FIELDS) add(d.name, it.detalhes?.[d.id]);
  add('Descrição', it.descricao);
  add('Observações', it.notes);
  if (it.status && it.status !== 'armario') add('Situação', statusName(it.status));
  if (price && it.price) add('Preço pago', brl(it.price));
  if (usage) {
    const u = itemUsage(it);
    add('Uso', `${u.uses} uso${u.uses === 1 ? '' : 's'}${u.last ? ', último em ' + fmtDate(u.last) : ''} — termômetro: ${band(itemBand(it)).name}`);
    if (price && it.price) add('Custo por uso', brl(costPerUse(it.price, u.uses)));
  }
  add('Prompt de imagem', it.promptImg);
  return L.join('\n');
}

export const PURPOSES = [
  { id: 'looks', name: 'Montar looks com IA', desc: 'a IA sugere combinações só com o que você tem' },
  { id: 'imagens', name: 'Gerar imagens das peças', desc: 'cada ficha traz descrição e prompt de imagem' },
  { id: 'consultoria', name: 'Consultoria de estilo', desc: 'análise do closet, lacunas e o que doar' },
  { id: 'lista', name: 'Só a lista', desc: 'sem instruções, apenas as fichas' },
];

export function closetPrompt(items, { purpose = 'looks', usage = true, price = false, title = '' } = {}) {
  const list = [...items].sort((a, b) => (a.profileId || '').localeCompare(b.profileId || '') || CAT_ORDER.indexOf(a.category) - CAT_ORDER.indexOf(b.category) || (a.code || '').localeCompare(b.code || ''));
  const people = [...new Set(list.map(i => i.profileId))].map(profile).filter(Boolean);
  const peopleTxt = people.map(p => `- ${p.name}${p.kind === 'crianca' ? ' (criança)' : ''}${p.cartela ? ', cartela ' + cartelaName(p.cartela) : ''}${p.sizes ? ', tamanhos: ' + p.sizes : ''}`).join('\n');
  const intro = {
    looks: `Este é o meu guarda-roupa, peça por peça. Quero que você monte looks usando SOMENTE estas peças (não sugira comprar nada, a menos que eu peça). Sempre cite cada peça pelo CÓDIGO e pelo nome, e explique por que as cores e o estilo combinam. Leve em conta clima, ocasião, cartela de coloração e as peças pouco usadas (termômetro "Esquecida" ou "Em alerta"), que eu quero voltar a usar.`,
    imagens: `Este é o meu guarda-roupa, peça por peça, com a descrição técnica completa de cada uma. Quando eu pedir, gere uma imagem fiel da peça (ou de um look com várias delas) usando a descrição e o "Prompt de imagem" de cada ficha, sem mudar cores, estampas ou detalhes. Use foto de catálogo com fundo branco, salvo se eu pedir outra coisa.`,
    consultoria: `Este é o meu guarda-roupa completo. Faça uma consultoria de estilo: avalie a harmonia de cores com a minha cartela, aponte peças coringa, combinações que eu ainda não uso, lacunas (o que falta para fechar mais looks), peças repetidas e sugestões do que doar ou vender, considerando o termômetro de uso. Cite sempre as peças pelo CÓDIGO.`,
    lista: '',
  }[purpose];
  const head = [
    title || 'MEU GUARDA-ROUPA',
    `Gerado pelo app Meu Closet em ${fmtDate(new Date().toISOString().slice(0, 10))} — ${list.length} peça${list.length === 1 ? '' : 's'}.`,
    intro,
    people.length ? `Pessoas:\n${peopleTxt}` : '',
    'As cores seguem uma lista fixa de nomes de moda com o código hex, e as cartelas seguem o método sazonal expandido de 12 estações.',
  ].filter(Boolean).join('\n\n');
  return head + '\n\n' + list.map(it => '---\n' + itemText(it, { usage, price })).join('\n\n') + '\n---\n';
}

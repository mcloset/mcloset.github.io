// Listas fixas do app (categorias, status, climas etc.)

export const CATEGORIES = [
  { id: 'cima', name: 'Partes de cima', subs: ['Blusa', 'Camiseta', 'Camisa', 'Regata', 'Cropped', 'Body', 'Tricô / Suéter', 'Top', 'Moletom'] },
  { id: 'baixo', name: 'Partes de baixo', subs: ['Calça', 'Calça jeans', 'Short', 'Saia', 'Bermuda', 'Legging'] },
  { id: 'unicas', name: 'Peças únicas', subs: ['Vestido', 'Macacão', 'Macaquinho', 'Conjunto'] },
  { id: 'casacos', name: 'Casacos', subs: ['Jaqueta', 'Blazer', 'Casaco', 'Cardigã', 'Colete', 'Sobretudo', 'Kimono'] },
  { id: 'calcados', name: 'Calçados', subs: ['Tênis', 'Sandália', 'Rasteira', 'Salto', 'Bota', 'Sapatilha', 'Mocassim', 'Chinelo', 'Mule'] },
  { id: 'bolsas', name: 'Bolsas', subs: ['Bolsa de mão', 'Tiracolo', 'Mochila', 'Clutch', 'Bolsa de praia', 'Necessaire'] },
  { id: 'acessorios', name: 'Acessórios', subs: ['Cinto', 'Óculos', 'Chapéu / Boné', 'Lenço', 'Relógio', 'Tiara / Presilha'] },
  { id: 'joias', name: 'Brincos e joias', subs: ['Brinco', 'Colar', 'Pulseira', 'Anel', 'Conjunto'] },
  { id: 'praia', name: 'Praia', subs: ['Biquíni', 'Maiô', 'Saída de praia', 'Canga'] },
  { id: 'fitness', name: 'Fitness', subs: ['Top', 'Legging', 'Short', 'Conjunto', 'Camiseta'] },
  { id: 'intimas', name: 'Pijamas e íntimas', subs: ['Pijama', 'Lingerie', 'Meia', 'Roupão'] },
];
export const catName = id => CATEGORIES.find(c => c.id === id)?.name || 'Sem categoria';
// prefixo do código automático da peça (ex.: CIM-007)
export const CODE_PREFIX = { cima: 'CIM', baixo: 'BAI', unicas: 'UNI', casacos: 'CAS', calcados: 'CAL', bolsas: 'BOL', acessorios: 'ACE', joias: 'JOI', praia: 'PRA', fitness: 'FIT', intimas: 'INT' };

// Ficha técnica: detalhes para descrever a peça a ponto de dar para recriá-la só pelo texto.
export const DETAIL_FIELDS = [
  { id: 'modelagem', name: 'Modelagem', hint: 'reta, evasê, oversized, slim, ajustada, godê, wide leg, pantalona, sereia, A, envelope…' },
  { id: 'comprimento', name: 'Comprimento', hint: 'cropped, na cintura, no quadril, mini, midi, longo, 7/8, no tornozelo, até o chão…' },
  { id: 'decote', name: 'Decote / gola', hint: 'V, redondo, canoa, quadrado, tomara que caia, frente única, gola padre, gola polo, colarinho…' },
  { id: 'mangas', name: 'Mangas', hint: 'sem manga, alça fina, curta, 3/4, longa, bufante, morcego, sino, ombro a ombro…' },
  { id: 'cintura', name: 'Cintura / cós', hint: 'alta, média, baixa, elástico, com cinto, clochard, marcada, solta…' },
  { id: 'fechamento', name: 'Fechamento', hint: 'botões (quantos, cor, material), zíper (onde, cor), amarração, colchete, sem fechamento…' },
  { id: 'bolsos', name: 'Bolsos', hint: 'quantos, tipo (faca, chapa, embutido, cargo) e onde ficam' },
  { id: 'acabamentos', name: 'Detalhes e acabamentos', hint: 'pregas, franzidos, babados, recortes, fendas, bordados, aplicações, pespontos, barra desfiada…' },
  { id: 'tecido', name: 'Tecido / material', hint: 'jeans, linho, viscose, malha, tricô, couro, seda, cetim, crochê, palha, metal…' },
  { id: 'textura', name: 'Textura e caimento', hint: 'fluido, estruturado, encorpado, leve, macio, rígido, canelado, felpudo…' },
  { id: 'brilho', name: 'Brilho', hint: 'fosco, acetinado, brilhante, metalizado, paetê' },
  { id: 'transparencia', name: 'Transparência', hint: 'opaco, levemente transparente, transparente, com forro' },
  { id: 'estampaDetalhe', name: 'Estampa em detalhe', hint: 'motivo, tamanho dos desenhos, cores, fundo, direção e distribuição' },
  { id: 'ferragens', name: 'Ferragens e aviamentos', hint: 'fivelas, correntes, ilhoses, argolas, tachas — formato e cor do metal' },
  { id: 'formato', name: 'Formato (acessórios e calçados)', hint: 'bico, tipo e altura do salto, solado, formato da bolsa, tipo de alça, formato do brinco…' },
  { id: 'medidas', name: 'Medidas estimadas', hint: 'comprimento/largura aproximados; bolsa L × A × P; altura do salto; tamanho da joia' },
  { id: 'tamanhoEtiqueta', name: 'Tamanho na etiqueta', hint: 'só se der para ler' },
  { id: 'estado', name: 'Estado de conservação', hint: 'nova, ótimo, bom, sinais de uso' },
];
// ordem em que as peças aparecem montadas num look
export const CAT_ORDER = ['casacos', 'cima', 'unicas', 'baixo', 'praia', 'fitness', 'intimas', 'bolsas', 'calcados', 'joias', 'acessorios'];

export const STATUS = [
  { id: 'armario', name: 'No armário' },
  { id: 'lavanderia', name: 'Na lavanderia' },
  { id: 'costureira', name: 'Na costureira' },
  { id: 'emprestada', name: 'Emprestada' },
  { id: 'guardada', name: 'Guardada (fora de uso)' },
  { id: 'pequena', name: 'Não serve mais' },
  { id: 'doada', name: 'Doada' },
  { id: 'vendida', name: 'Vendida' },
];
export const statusName = id => STATUS.find(s => s.id === id)?.name || 'No armário';
// peças que saíram do guarda-roupa de vez
export const GONE = ['doada', 'vendida'];

export const CLIMAS = [
  { id: 'calor', name: 'Calor', icon: '☀️' },
  { id: 'meia', name: 'Meia-estação', icon: '🌤️' },
  { id: 'frio', name: 'Frio', icon: '❄️' },
];
export const OCASIOES = ['Casa', 'Casual', 'Trabalho', 'Praia', 'Festa', 'Noite', 'Academia', 'Viagem', 'Evento formal', 'Escola'];
export const ESTILOS = ['Clássico', 'Elegante', 'Romântico', 'Dramático', 'Natural', 'Criativo', 'Sexy', 'Esportivo'];
export const PIRAMIDE = [
  { id: 'base', name: 'Base (básicas)' },
  { id: 'meio', name: 'Meio (coringas)' },
  { id: 'topo', name: 'Topo (cerejas do bolo)' },
];
export const ESTAMPAS = ['Lisa', 'Listrada', 'Xadrez', 'Floral', 'Poá', 'Animal print', 'Geométrica', 'Tie-dye', 'Bordada', 'Outra estampa'];
export const PHOTO_LABELS = ['Frente', 'Costas', 'Detalhe', 'Vestida', 'Lado', 'Outra'];
// Método sazonal expandido (12 cartelas), o padrão mais usado na consultoria de coloração no Brasil.
export const SEASONS = [
  { id: 'primavera', name: 'Primavera', desc: 'cores quentes, vibrantes e claras' },
  { id: 'verao', name: 'Verão', desc: 'cores frias, suaves e claras' },
  { id: 'outono', name: 'Outono', desc: 'cores quentes, suaves e escuras' },
  { id: 'inverno', name: 'Inverno', desc: 'cores frias, intensas e escuras' },
];
export const CARTELAS = [
  { id: 'primavera-clara', name: 'Primavera Clara', season: 'primavera', desc: 'quentes, claras e delicadas' },
  { id: 'primavera-quente', name: 'Primavera Quente', season: 'primavera', desc: 'bem quentes e douradas' },
  { id: 'primavera-brilhante', name: 'Primavera Brilhante', season: 'primavera', desc: 'quentes, vivas e intensas' },
  { id: 'verao-claro', name: 'Verão Claro', season: 'verao', desc: 'frias, claras e leves' },
  { id: 'verao-frio', name: 'Verão Frio', season: 'verao', desc: 'bem frias e azuladas' },
  { id: 'verao-suave', name: 'Verão Suave', season: 'verao', desc: 'frias, acinzentadas e suaves' },
  { id: 'outono-suave', name: 'Outono Suave', season: 'outono', desc: 'quentes, suaves e acinzentadas' },
  { id: 'outono-quente', name: 'Outono Quente', season: 'outono', desc: 'bem quentes e terrosas' },
  { id: 'outono-profundo', name: 'Outono Profundo', season: 'outono', desc: 'quentes, escuras e densas' },
  { id: 'inverno-brilhante', name: 'Inverno Brilhante', season: 'inverno', desc: 'frias, vivas e contrastantes' },
  { id: 'inverno-frio', name: 'Inverno Frio', season: 'inverno', desc: 'bem frias e puras' },
  { id: 'inverno-profundo', name: 'Inverno Profundo', season: 'inverno', desc: 'frias, escuras e intensas' },
];
// aceita também cartelas antigas de 4 estações (ex.: "outono")
export const cartelaName = id => CARTELAS.find(c => c.id === id)?.name || SEASONS.find(s => s.id === id)?.name || '';
export const seasonOf = id => CARTELAS.find(c => c.id === id)?.season || (SEASONS.some(s => s.id === id) ? id : '');

export const LAST_USE_HINTS = [
  { id: '', name: 'Não lembro' },
  { id: '7', name: 'Nesta semana' },
  { id: '30', name: 'Neste mês' },
  { id: '75', name: 'Há 1 a 3 meses' },
  { id: '135', name: 'Há 3 a 6 meses' },
  { id: '200', name: 'Há mais de 6 meses' },
];

export const BANDS = [
  { id: 'recente', name: 'Uso recente', color: '#2E6B4F', hint: 'usada nos últimos 30 dias' },
  { id: 'regular', name: 'Uso regular', color: '#7FC4A0', hint: '31 a 60 dias sem uso' },
  { id: 'esfriando', name: 'Esfriando', color: '#5B8DEF', hint: '61 a 90 dias sem uso' },
  { id: 'alerta', name: 'Em alerta', color: '#F08C2E', hint: '91 a 119 dias sem uso' },
  { id: 'esquecida', name: 'Esquecida', color: '#C0283A', hint: '120 dias ou mais sem uso' },
  { id: 'avaliacao', name: 'Em avaliação', color: '#CFCFCF', hint: 'cadastrada há menos de 30 dias' },
  { id: 'fora', name: 'Fora de estação', color: '#A99CD6', hint: 'peça de outro clima, descansando' },
];
export const band = id => BANDS.find(b => b.id === id) || BANDS[5];

export const AVATAR_COLORS = ['#7A2340', '#2E6B4F', '#5B8DEF', '#C77D3B', '#8E5BB5', '#3A3A3A', '#D45D79'];

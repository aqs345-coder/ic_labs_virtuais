export interface Material {
  id: string;
  nome: string;
  indiceRefracao: number;
  /** Cor de preenchimento do meio no canvas (estética acadêmica limpa e translúcida). */
  cor: string;
  /** Cor do texto dos rótulos no canvas. */
  corTexto: string;
  /** Cor da borda ou acento decorativo do meio. */
  corAcento: string;
}

export const MATERIAIS: Record<string, Material> = {
  ar: {
    id: 'ar',
    nome: 'Ar',
    indiceRefracao: 1.0003,
    cor: '#f8fafc',
    corTexto: '#334155',
    corAcento: '#94a3b8',
  },
  agua: {
    id: 'agua',
    nome: 'Água',
    indiceRefracao: 1.333,
    cor: '#e0f2fe',
    corTexto: '#0369a1',
    corAcento: '#38bdf8',
  },
  oleo: {
    id: 'oleo',
    nome: 'Óleo',
    indiceRefracao: 1.47,
    cor: '#fef3c7',
    corTexto: '#b45309',
    corAcento: '#f59e0b',
  },
  vidro: {
    id: 'vidro',
    nome: 'Vidro Crown',
    indiceRefracao: 1.52,
    cor: '#dcfce7',
    corTexto: '#15803d',
    corAcento: '#22c55e',
  },
  diamante: {
    id: 'diamante',
    nome: 'Diamante',
    indiceRefracao: 2.417,
    cor: '#f3e8ff',
    corTexto: '#6b21a8',
    corAcento: '#a855f7',
  },
};

export interface ParMateriais {
  superiorId: string;
  inferiorId: string;
}

export const PARES_MATERIAIS: ParMateriais[] = [
  { superiorId: 'ar', inferiorId: 'agua' },
  { superiorId: 'ar', inferiorId: 'vidro' },
  { superiorId: 'vidro', inferiorId: 'ar' }, // Perfeito para demonstrar reflexão total imediata
  { superiorId: 'agua', inferiorId: 'ar' },  // Outro clássico para ângulo crítico
  { superiorId: 'ar', inferiorId: 'diamante' },
  { superiorId: 'agua', inferiorId: 'oleo' },
];

export function materialPorId(id: string): Material {
  const material = MATERIAIS[id];
  if (!material) {
    throw new Error(`Material desconhecido: ${id}`);
  }
  return material;
}
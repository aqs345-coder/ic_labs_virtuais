export interface Material {
  id: string;
  nome: string;
  /** Índice de refração do meio óptico. */
  indiceRefracao: number;
  /** Cor de preenchimento do meio no canvas (estética acadêmica limpa e translúcida). */
  cor: string;
  /** Cor do texto dos rótulos no canvas. */
  corTexto: string;
  /** Cor da borda ou acento decorativo do meio. */
  corAcento: string;
  /** Cor de preenchimento no tema escuro. */
  corDark?: string;
  /** Cor do texto dos rótulos no tema escuro. */
  corTextoDark?: string;
  /** Cor da borda ou acento decorativo no tema escuro. */
  corAcentoDark?: string;
}

export const MATERIAIS: Record<string, Material> = {
  ar: {
    id: 'ar',
    nome: 'Ar',
    indiceRefracao: 1.0003,
    cor: '#f8fafc',
    corTexto: '#334155',
    corAcento: '#94a3b8',
    corDark: '#090e17',
    corTextoDark: '#94a3b8',
    corAcentoDark: '#334155',
  },
  agua: {
    id: 'agua',
    nome: 'Água',
    indiceRefracao: 1.333,
    cor: '#e0f2fe',
    corTexto: '#0369a1',
    corAcento: '#38bdf8',
    corDark: '#071f38',
    corTextoDark: '#38bdf8',
    corAcentoDark: '#0284c7',
  },
  oleo: {
    id: 'oleo',
    nome: 'Óleo',
    indiceRefracao: 1.47,
    cor: '#fef3c7',
    corTexto: '#b45309',
    corAcento: '#f59e0b',
    corDark: '#261b05',
    corTextoDark: '#fbbf24',
    corAcentoDark: '#d97706',
  },
  vidro: {
    id: 'vidro',
    nome: 'Vidro Crown',
    indiceRefracao: 1.52,
    cor: '#dcfce7',
    corTexto: '#15803d',
    corAcento: '#22c55e',
    corDark: '#062619',
    corTextoDark: '#4ade80',
    corAcentoDark: '#16a34a',
  },
  diamante: {
    id: 'diamante',
    nome: 'Diamante',
    indiceRefracao: 2.417,
    cor: '#f3e8ff',
    corTexto: '#6b21a8',
    corAcento: '#a855f7',
    corDark: '#1c0f33',
    corTextoDark: '#c084fc',
    corAcentoDark: '#9333ea',
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
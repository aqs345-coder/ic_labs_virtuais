export interface LaserPreset {
  id: string;
  nome: string;
  comprimentoOndaNm: number;
  cor: string;
}

export const LASERS: LaserPreset[] = [
  {
    id: 'violeta',
    nome: 'Violeta',
    comprimentoOndaNm: 405,
    cor: '#7a3ff2',
  },
  {
    id: 'azul',
    nome: 'Azul',
    comprimentoOndaNm: 450,
    cor: '#1e6bff',
  },
  {
    id: 'verde',
    nome: 'Verde',
    comprimentoOndaNm: 532,
    cor: '#22e05a',
  },
  {
    id: 'amarelo',
    nome: 'Amarelo',
    comprimentoOndaNm: 594,
    cor: '#ffc233',
  },
  {
    id: 'vermelho',
    nome: 'Vermelho',
    comprimentoOndaNm: 632.8,
    cor: '#ff2d2d',
  },
  {
    id: 'vermelho-profundo',
    nome: 'Vermelho Escuro',
    comprimentoOndaNm: 650,
    cor: '#d10000',
  },
];

export function laserPorId(id: string): LaserPreset {
  const laser = LASERS.find((l) => l.id === id);
  if (!laser) {
    throw new Error(`Laser desconhecido: ${id}`);
  }
  return laser;
}
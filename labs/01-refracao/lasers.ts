export interface LaserPreset {
  id: string;
  nome: string;
  comprimentoOndaNm: number;
  cor: string;
}

export const LASER_VERMELHO: LaserPreset = {
  id: 'vermelho',
  nome: 'Vermelho',
  comprimentoOndaNm: 650,
  cor: '#ef4444',
};

export const LASERS: LaserPreset[] = [LASER_VERMELHO];

export function laserPorId(_id?: string): LaserPreset {
  return LASER_VERMELHO;
}
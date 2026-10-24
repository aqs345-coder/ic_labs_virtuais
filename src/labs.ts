import snellLabLogo from '../images/snell_lab_logo.jpeg';
import snellGameLogo from '../images/snell_game_logo.jpeg';

export interface LabEntry {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  href: string;
  status: 'disponivel' | 'em-construcao';
  logo?: string;
}

export function resolverUrlLab(caminhoRelativo: string): string {
  const base = import.meta.env.BASE_URL || '/';
  const baseNormalizada = base.endsWith('/') ? base : `${base}/`;
  const caminhoLimpo = caminhoRelativo.startsWith('/')
    ? caminhoRelativo.slice(1)
    : caminhoRelativo;
  return `${baseNormalizada}${caminhoLimpo}`;
}

export const LABS: LabEntry[] = [
  {
    id: '01-refracao',
    title: 'Refração do Laser e Lei de Snell',
    summary:
      'Estudo experimental da reflexão e refração da luz entre dois meios ópticos. ' +
      'Verificação da Lei de Snell-Descartes, ângulo crítico e reflexão total interna.',
    topics: ['Lei de Snell', 'Reflexão', 'Refração', 'Reflexão Total'],
    href: resolverUrlLab('labs/01-refracao/index.html'),
    status: 'disponivel',
    logo: snellLabLogo,
  },
  {
    id: '02-arqueiro',
    title: 'Desafio do Arqueiro: Profundidade Aparente',
    summary:
      'Experimente as consequências práticas da refração luminosa na percepção visual. ' +
      'Compreenda o desvio dos raios ópticos entre a água e o ar e aprenda a compensar a mira para atingir o peixe verdadeiro.',
    topics: ['Profundidade Aparente', 'Refração Prática', 'Desvio Óptico'],
    href: resolverUrlLab('labs/02-arqueiro/index.html'),
    status: 'disponivel',
    logo: snellGameLogo,
  },
];
export interface LabEntry {
  id: string;
  title: string;
  summary: string;
  topics: string[];
  href: string;
  status: 'disponivel' | 'em-construcao';
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
  },
];
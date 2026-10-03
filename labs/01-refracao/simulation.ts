import {
  anguloCritico,
  normalizar,
  paraGraus,
  pontoAoLongo,
  pontoIntersecaoBorda,
  refratar,
  subtrair,
  type ResultadoRefracao,
  type Vetor2D,
} from './physics';
import { type Material } from './materials';

export interface Cena {
  largura: number;
  altura: number;
  /** Linha horizontal que separa os dois materiais. */
  yInterface: number;
  /** Ponto central da interface, alvo permanente do laser. */
  xAlvo: number;
  superior: Material;
  inferior: Material;
  laser: { x: number; y: number; cor: string; intensidade: number };
}

export interface Raios {
  /** Ponto de emissão do laser no canvas. */
  pontoLaser: Vetor2D;
  /** Ponto central de contato na interface. */
  pontoIncidencia: Vetor2D;
  /** Vetor unitário do feixe incidente (do laser para a interface). */
  incidente: Vetor2D;
  /** Ponto final do feixe incidente (exatamente o ponto de contato). */
  pontoFimIncidente: Vetor2D;
  /** Vetor unitário do feixe refletido (de volta para o meio 1). */
  refletido: Vetor2D;
  /** Ponto final do feixe refletido na borda do canvas. */
  pontoFimRefletido: Vetor2D;
  /** Vetor unitário do feixe refratado (para dentro do meio 2), ou null em reflexão total. */
  refratado: Vetor2D | null;
  /** Ponto final do feixe refratado na borda do canvas, ou null em reflexão total. */
  pontoFimRefratado: Vetor2D | null;
  /** Resultados analíticos detalhados da física. */
  fisica: ResultadoRefracao;
  /** true se o laser está no meio superior; false se no inferior. */
  laserNoSuperior: boolean;
  meio1: Material;
  meio2: Material;
  /** n1 · sen(θ1) para validação empírica da Lei de Snell. */
  n1SinT1: number;
  /** n2 · sen(θ2) para validação empírica da Lei de Snell. */
  n2SinT2: number | null;
}

/**
 * Calcula os raios incidentes, refletidos e refratados para a cena óptica atual.
 *
 * O meio onde o laser se encontra é sempre tratado como Meio 1 (incidente).
 * A interface horizontal divide o Meio Superior e Meio Inferior.
 */
export function calcularRaios(cena: Cena): Raios {
  const alvo: Vetor2D = { x: cena.xAlvo, y: cena.yInterface };
  const laser: Vetor2D = { x: cena.laser.x, y: cena.laser.y };

  const laserNoSuperior = laser.y < cena.yInterface;
  const meio1 = laserNoSuperior ? cena.superior : cena.inferior;
  const meio2 = laserNoSuperior ? cena.inferior : cena.superior;

  // Vetor do laser para a interface.
  const bruta = subtrair(alvo, laser);
  const incidente =
    bruta.x === 0 && bruta.y === 0
      ? laserNoSuperior
        ? { x: 0, y: 1 }
        : { x: 0, y: -1 }
      : normalizar(bruta);

  // A normal aponta do Meio 1 para o Meio 2:
  // Se o laser está no superior, o Meio 2 está abaixo (Y positivo no canvas).
  // Se o laser está no inferior, o Meio 2 está acima (Y negativo no canvas).
  const normal: Vetor2D = laserNoSuperior ? { x: 0, y: 1 } : { x: 0, y: -1 };

  const fisica = refratar(
    incidente,
    normal,
    meio1.indiceRefracao,
    meio2.indiceRefracao,
  );

  const refletido = fisica.direcaoRefletida;
  const refratado = fisica.direcaoRefratada;

  // Feixe 1 (Incidente): começa no laser e cessa RIGOROSAMENTE no ponto de contato
  const pontoFimIncidente: Vetor2D = { x: alvo.x, y: alvo.y };

  // Feixe 3 (Refletido): parte da interface e se estende até a borda do canvas no Meio 1
  const pontoFimRefletido = pontoIntersecaoBorda(alvo, refletido, cena.largura, cena.altura);

  // Feixe 2 (Refratado): parte da interface e se estende até a borda do canvas no Meio 2 (se não houver reflexão total)
  const pontoFimRefratado = refratado
    ? pontoIntersecaoBorda(alvo, refratado, cena.largura, cena.altura)
    : null;

  const n1SinT1 = meio1.indiceRefracao * Math.sin(fisica.anguloIncidencia);
  const n2SinT2 =
    fisica.anguloRefracao !== null
      ? meio2.indiceRefracao * Math.sin(fisica.anguloRefracao)
      : null;

  return {
    pontoLaser: laser,
    pontoIncidencia: alvo,
    incidente,
    pontoFimIncidente,
    refletido,
    pontoFimRefletido,
    refratado,
    pontoFimRefratado,
    fisica,
    laserNoSuperior,
    meio1,
    meio2,
    n1SinT1,
    n2SinT2,
  };
}

/** Ângulo crítico em graus para o par em uso, ou null se não existir (n1 <= n2). */
export function anguloCriticoGraus(raios: Raios): number | null {
  const critico = anguloCritico(
    raios.meio1.indiceRefracao,
    raios.meio2.indiceRefracao,
  );
  return critico === null ? null : paraGraus(critico);
}

export { pontoAoLongo, pontoIntersecaoBorda };
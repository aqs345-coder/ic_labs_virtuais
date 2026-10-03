/**
 * Física da refração e reflexão óptica em uma interface plana entre dois meios.
 *
 * Aplica os princípios fundamentais da óptica geométrica:
 * 1. Lei da Reflexão (θr = θ1 no mesmo meio)
 * 2. Lei de Snell-Descartes (n1 · sen θ1 = n2 · sen θ2)
 * 3. Condição de Reflexão Total Interna (sen θ1 > n2/n1 quando n1 > n2)
 */

export interface Vetor2D {
  x: number;
  y: number;
}

export interface ResultadoRefracao {
  /** Ângulo de incidência em radianos [0, π/2], medido a partir da normal. */
  anguloIncidencia: number;
  /** Ângulo de reflexão em radianos, igual ao de incidência. */
  anguloReflexao: number;
  /** Ângulo de refração em radianos, ou null quando ocorre reflexão total. */
  anguloRefracao: number | null;
  /** Vetor unitário da direção do feixe refratado, ou null em reflexão total. */
  direcaoRefratada: Vetor2D | null;
  /** Vetor unitário da direção do feixe refletido. */
  direcaoRefletida: Vetor2D;
  /** true quando sen(θ1) > n2/n1 e nenhum feixe atravessa a interface. */
  reflexaoTotal: boolean;
  /** true quando |θ2| < |θ1|, o raio se aproxima da normal (n2 > n1). */
  aproximacaoDaNormal: boolean;
}

export function subtrair(a: Vetor2D, b: Vetor2D): Vetor2D {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function escala(v: Vetor2D, k: number): Vetor2D {
  return { x: v.x * k, y: v.y * k };
}

export function norma(v: Vetor2D): number {
  return Math.hypot(v.x, v.y);
}

export function normalizar(v: Vetor2D): Vetor2D {
  const comprimento = norma(v);
  if (comprimento === 0) {
    return { x: 0, y: 0 };
  }
  return { x: v.x / comprimento, y: v.y / comprimento };
}

export function produtoEscalar(a: Vetor2D, b: Vetor2D): number {
  return a.x * b.x + a.y * b.y;
}

/** Componente perpendicular à normal (ao longo da interface). */
export function componenteTangencial(direcao: Vetor2D, normal: Vetor2D): Vetor2D {
  const n = normalizar(normal);
  const aoLongoDaNormal = escala(n, produtoEscalar(direcao, n));
  return subtrair(direcao, aoLongoDaNormal);
}

/**
 * Reflexão especular: inverte a componente ao longo da normal e preserva a tangencial.
 * v_refletido = v - 2 * (v · n) * n
 */
export function refletir(direcao: Vetor2D, normal: Vetor2D): Vetor2D {
  const n = normalizar(normal);
  return subtrair(direcao, escala(n, 2 * produtoEscalar(direcao, n)));
}

/**
 * Refrata um feixe que viaja no meio 1 (n1) em direção à interface,
 * entrando no meio 2 (n2).
 *
 * @param direcao Vetor apontando na direção de propagação do feixe em direção à interface.
 * @param normal Normal à interface orientada do Meio 1 para o Meio 2.
 * @param n1 Índice de refração do meio de incidência.
 * @param n2 Índice de refração do meio de transmissão.
 */
export function refratar(
  direcao: Vetor2D,
  normal: Vetor2D,
  n1: number,
  n2: number,
): ResultadoRefracao {
  const n = normalizar(normal);
  const i = normalizar(direcao);

  // Alinha a normal no sentido de propagação para garantir cos(θ1) >= 0
  let cosTheta1 = limitar(produtoEscalar(i, n), -1, 1);
  let normalEfetiva = n;
  if (cosTheta1 < 0) {
    normalEfetiva = escala(n, -1);
    cosTheta1 = limitar(produtoEscalar(i, normalEfetiva), -1, 1);
  }

  const anguloIncidencia = Math.acos(cosTheta1);
  const anguloReflexao = anguloIncidencia;

  const eta = n1 / n2;
  const sin2Theta2 = eta * eta * (1 - cosTheta1 * cosTheta1);

  const direcaoRefletida = normalizar(refletir(i, normalEfetiva));

  // Reflexão Total Interna quando sen²(θ2) >= 1
  if (sin2Theta2 >= 1.0 - 1e-9) {
    return {
      anguloIncidencia,
      anguloReflexao,
      anguloRefracao: null,
      direcaoRefratada: null,
      direcaoRefletida,
      reflexaoTotal: true,
      aproximacaoDaNormal: false,
    };
  }

  const sinTheta2 = Math.sqrt(Math.max(0, sin2Theta2));
  const cosTheta2 = Math.sqrt(Math.max(0, 1 - sinTheta2 * sinTheta2));
  const anguloRefracao = Math.asin(limitar(sinTheta2, -1, 1));

  // Vetor refratado segundo a formulação vetorial de Snell-Descartes:
  // r = eta * i + (cosTheta2 - eta * cosTheta1) * n
  const dirRefratada = normalizar({
    x: eta * i.x + (cosTheta2 - eta * cosTheta1) * normalEfetiva.x,
    y: eta * i.y + (cosTheta2 - eta * cosTheta1) * normalEfetiva.y,
  });

  return {
    anguloIncidencia,
    anguloReflexao,
    anguloRefracao,
    direcaoRefratada: dirRefratada,
    direcaoRefletida,
    reflexaoTotal: false,
    aproximacaoDaNormal: n2 > n1,
  };
}

/**
 * Ângulo crítico em radianos: maior ângulo de incidência que ainda
 * permite refração. Só existe quando n1 > n2.
 */
export function anguloCritico(n1: number, n2: number): number | null {
  if (n1 <= n2) {
    return null;
  }
  return Math.asin(n2 / n1);
}

/**
 * Ponto ao longo de uma direção a uma dada distância.
 */
export function pontoAoLongo(origem: Vetor2D, direcao: Vetor2D, distancia: number): Vetor2D {
  return {
    x: origem.x + direcao.x * distancia,
    y: origem.y + direcao.y * distancia,
  };
}

/**
 * Calcula a intersecção exata de um raio com os limites de um retângulo [0, largura] x [0, altura].
 * Permite que feixes refletidos e refratados se estendam até a borda exata da cena sem artefatos.
 */
export function pontoIntersecaoBorda(
  origem: Vetor2D,
  direcao: Vetor2D,
  largura: number,
  altura: number,
): Vetor2D {
  let tMin = Infinity;

  if (direcao.x > 1e-9) {
    const t = (largura - origem.x) / direcao.x;
    if (t > 0 && t < tMin) tMin = t;
  } else if (direcao.x < -1e-9) {
    const t = (0 - origem.x) / direcao.x;
    if (t > 0 && t < tMin) tMin = t;
  }

  if (direcao.y > 1e-9) {
    const t = (altura - origem.y) / direcao.y;
    if (t > 0 && t < tMin) tMin = t;
  } else if (direcao.y < -1e-9) {
    const t = (0 - origem.y) / direcao.y;
    if (t > 0 && t < tMin) tMin = t;
  }

  if (!Number.isFinite(tMin) || tMin <= 0) {
    tMin = Math.hypot(largura, altura) * 2;
  }

  return {
    x: origem.x + direcao.x * tMin,
    y: origem.y + direcao.y * tMin,
  };
}

export function paraGraus(radianos: number): number {
  return (radianos * 180) / Math.PI;
}

export function paraRadianos(graus: number): number {
  return (graus * Math.PI) / 180;
}

function limitar(valor: number, minimo: number, maximo: number): number {
  return Math.min(maximo, Math.max(minimo, valor));
}
/**
 * Física óptica e mecânica do minigame do arqueiro na canoa (Profundidade Aparente).
 *
 * Princípios aplicados:
 * 1. Lei de Snell-Descartes para a luz emergindo da água para o ar: n_água · sen(θ₂) = n_ar · sen(θ₁)
 * 2. Formação da imagem virtual (profundidade aparente): como n_água > n_ar, os raios desviam
 *    afastando-se da normal ao passar para o ar. Para o observador no ar, o prolongamento retilíneo
 *    dos raios faz o peixe parecer estar mais próximo da superfície do que realmente está.
 * 3. Balística da flecha do arqueiro com transição ar-água e detecção de colisão.
 */

export interface Ponto2D {
  x: number;
  y: number;
}

export interface RaioVisao {
  /** Ponto de partida da luz (peixe real). */
  peixeReal: Ponto2D;
  /** Ponto exato na interface onde a luz sofre refração para atingir o olho. */
  interfacePonto: Ponto2D;
  /** Ponto de chegada da luz (olho do arqueiro). */
  olhoArqueiro: Ponto2D;
  /** Ângulo com a normal na água (θ₂). */
  anguloAguaRad: number;
  /** Ângulo com a normal no ar (θ₁). */
  anguloArRad: number;
  /** Posição da imagem aparente (onde o prolongamento da reta de visão se projeta). */
  imagemAparente: Ponto2D;
}

export interface Flecha {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angulo: number;
  noAr: boolean;
  comprimento: number;
  ativa: boolean;
}

export interface PeixeAlvo {
  x: number;
  y: number;
  largura: number;
  altura: number;
  velocidadeX: number;
  oscilacaoFase: number;
}

export type ResultadoTiro =
  | 'EM_VOO'
  | 'ACERTOU_REAL'
  | 'ERROU_MIROU_APARENTE'
  | 'ERROU_AGUA'
  | 'ERROU_LONGE';

/**
 * Encontra o ponto na interface horizontal (y = yInterface) onde o raio de luz
 * emitido por peixe (na água, y > yInterface) refrata e chega ao olho (no ar, y < yInterface)
 * respeitando a Lei de Snell: n_agua * sen(t2) = n_ar * sen(t1).
 */
export function calcularPontoRefracaoVisao(
  peixe: Ponto2D,
  olho: Ponto2D,
  yInterface: number,
  nAr = 1.0003,
  nAgua = 1.333,
): Ponto2D {
  const xMin = Math.min(olho.x, peixe.x);
  const xMax = Math.max(olho.x, peixe.x);

  if (Math.abs(xMax - xMin) < 1e-4) {
    return { x: olho.x, y: yInterface };
  }

  // Busca binária para achar xInterface tal que nAgua * sen(t2) == nAr * sen(t1)
  let inf = xMin;
  let sup = xMax;
  const hAr = Math.abs(yInterface - olho.y);
  const hAgua = Math.abs(peixe.y - yInterface);

  for (let i = 0; i < 35; i++) {
    const xMed = (inf + sup) * 0.5;

    // Distâncias horizontais
    const dAr = Math.abs(xMed - olho.x);
    const dAgua = Math.abs(peixe.x - xMed);

    // sen(t) = d / sqrt(d^2 + h^2)
    const sinTAr = dAr / Math.hypot(dAr, hAr);
    const sinTAgua = dAgua / Math.hypot(dAgua, hAgua);

    const snellDiff = nAgua * sinTAgua - nAr * sinTAr;

    if (olho.x < peixe.x) {
      if (snellDiff > 0) {
        inf = xMed;
      } else {
        sup = xMed;
      }
    } else {
      if (snellDiff > 0) {
        sup = xMed;
      } else {
        inf = xMed;
      }
    }
  }

  const xFinal = (inf + sup) * 0.5;
  return { x: xFinal, y: yInterface };
}

/**
 * Posição de origem da flecha e da linha guia, calculada a partir
 * da posição do ombro/olho do arqueiro e do ângulo de visada/mira.
 * Garante que a linha tracejada e a flecha partam rigorosamente do mesmo ponto geométrico.
 */
export function calcularOrigemFlecha(
  olhoArqueiro: Ponto2D,
  anguloMiraRad: number,
  distanciaBraco = 36,
): Ponto2D {
  const ombroX = olhoArqueiro.x - 2;
  const ombroY = olhoArqueiro.y + 14;
  return {
    x: ombroX + Math.cos(anguloMiraRad) * distanciaBraco,
    y: ombroY + Math.sin(anguloMiraRad) * distanciaBraco,
  };
}

/**
 * Calcula a posição da imagem aparente (onde os olhos veem o peixe)
 * através do prolongamento retilíneo da direção do raio que sai da interface em direção ao olho.
 */
export function calcularRaioVisaoEImagemAparente(
  peixe: Ponto2D,
  olho: Ponto2D,
  yInterface: number,
  nAr = 1.0003,
  nAgua = 1.333,
  limiteLargura = 800,
): RaioVisao {
  const pInt = calcularPontoRefracaoVisao(peixe, olho, yInterface, nAr, nAgua);

  const dAr = Math.abs(pInt.x - olho.x);
  const hAr = Math.abs(yInterface - olho.y);
  const anguloArRad = Math.atan2(dAr, hAr);

  const dAgua = Math.abs(peixe.x - pInt.x);
  const hAgua = Math.abs(peixe.y - yInterface);
  const anguloAguaRad = Math.atan2(dAgua, hAgua);

  // Profundidade aparente clássica da óptica geométrica:
  // h' = h_real · (n_observador / n_objeto) = h_real · (n_ar / n_água)
  // com correção suave para o ângulo oblíquo de observação do arqueiro
  const cosAr = Math.cos(anguloArRad);
  const cosAgua = Math.cos(anguloAguaRad);
  const correcaoAngular = Math.min(1.0, Math.max(0.88, (cosAr * cosAr) / Math.max(0.1, cosAgua * cosAgua)));
  const razaoProfundidade = (nAr / nAgua) * correcaoAngular;
  const hAparente = Math.max(16, hAgua * Math.min(0.85, Math.max(0.60, razaoProfundidade)));

  // A imagem aparente está no prolongamento da reta que liga olho -> pInt
  // Vetor unitário no ar (do olho para a interface):
  const dxReta = pInt.x - olho.x;
  const dyReta = pInt.y - olho.y; // positivo, descendo
  const inclinacao = dxReta / Math.max(0.1, dyReta);

  // Projeta a reta até a profundidade aparente abaixo da interface
  const yAparente = yInterface + hAparente;
  let xAparente = pInt.x + inclinacao * hAparente;

  // Garante contenção estrita dentro do canvas para visualização perfeita
  const margem = 60;
  xAparente = Math.max(margem, Math.min(limiteLargura - margem, xAparente));

  return {
    peixeReal: peixe,
    interfacePonto: pInt,
    olhoArqueiro: olho,
    anguloAguaRad,
    anguloArRad,
    imagemAparente: { x: xAparente, y: yAparente },
  };
}

/**
 * Cria uma nova flecha pronta para ser disparada do arco.
 */
export function criarFlecha(
  origem: Ponto2D,
  anguloRad: number,
  velocidade = 720,
  comprimento = 52,
): Flecha {
  return {
    x: origem.x,
    y: origem.y,
    vx: Math.cos(anguloRad) * velocidade,
    vy: Math.sin(anguloRad) * velocidade,
    angulo: anguloRad,
    noAr: true,
    comprimento,
    ativa: true,
  };
}

/**
 * Atualiza a física de voo da flecha por um passo de tempo dt (em segundos).
 * A flecha segue rigorosamente em trajetória reta (mantendo seu ângulo de mira) tanto no ar quanto na água,
 * sofrendo apenas desaceleração hidrodinâmica ao mudar de meio.
 */
export function atualizarFlecha(
  flecha: Flecha,
  dt: number,
  yInterface: number,
  larguraCanvas: number,
  alturaCanvas: number,
): void {
  if (!flecha.ativa) return;

  if (flecha.y < yInterface) {
    // Voo no ar: velocidade constante em linha reta
    const proxX = flecha.x + flecha.vx * dt;
    const proxY = flecha.y + flecha.vy * dt;

    if (proxY >= yInterface) {
      // Transição para a água: calcula fração exata de tempo até a interface
      const t = flecha.vy !== 0 ? Math.max(0, Math.min(1, (yInterface - flecha.y) / (proxY - flecha.y))) : 1;
      const xInterface = flecha.x + flecha.vx * (t * dt);

      flecha.noAr = false;
      // Ao mudar de meio, atenua a velocidade (desaceleração suave), mantendo rigorosamente a mesma direção reta
      const reducaoEntrada = 0.88;
      flecha.vx *= reducaoEntrada;
      flecha.vy *= reducaoEntrada;

      const dtRestante = (1 - t) * dt;
      flecha.x = xInterface + flecha.vx * dtRestante;
      flecha.y = yInterface + flecha.vy * dtRestante;
    } else {
      flecha.x = proxX;
      flecha.y = proxY;
    }
  } else {
    // Movimento na água: continua em linha reta na mesma direção, com desaceleração branda
    const arrastoSuave = Math.exp(-0.25 * dt);
    flecha.vx *= arrastoSuave;
    flecha.vy *= arrastoSuave;
    flecha.x += flecha.vx * dt;
    flecha.y += flecha.vy * dt;
    flecha.noAr = false;
  }

  // O ângulo permanece rigorosamente constante ao longo de toda a trajetória reta
  flecha.angulo = Math.atan2(flecha.vy, flecha.vx);

  // Limite da cena
  if (
    flecha.x < -60 ||
    flecha.x > larguraCanvas + 60 ||
    flecha.y > alturaCanvas + 30 ||
    Math.hypot(flecha.vx, flecha.vy) < 40
  ) {
    flecha.ativa = false;
  }
}

export interface TrajetoriaGuia {
  inicioAr: Ponto2D;
  fimAr: Ponto2D;
  atingiuAgua: boolean;
  inicioAgua?: Ponto2D;
  fimAgua?: Ponto2D;
}

/**
 * Calcula a linha guia tracejada prolongada da flecha em trajetória reta contínua,
 * mantendo o mesmo ângulo de mira no ar e na água.
 */
export function calcularTrajetoriaGuia(
  origem: Ponto2D,
  anguloRad: number,
  yInterface: number,
  comprimentoAr = 800,
  comprimentoAgua = 500,
): TrajetoriaGuia {
  const cosA = Math.cos(anguloRad);
  const sinA = Math.sin(anguloRad);

  // Se a mira aponta para baixo em direção à água
  if (sinA > 0.02) {
    const distVertical = yInterface - origem.y;
    const tInterface = distVertical / sinA;

    if (tInterface < comprimentoAr) {
      const pInt: Ponto2D = {
        x: origem.x + cosA * tInterface,
        y: yInterface,
      };

      // Trajetória reta na água: continua na mesma direção da mira do arco
      const pFimAgua: Ponto2D = {
        x: pInt.x + cosA * comprimentoAgua,
        y: pInt.y + sinA * comprimentoAgua,
      };

      return {
        inicioAr: origem,
        fimAr: pInt,
        atingiuAgua: true,
        inicioAgua: pInt,
        fimAgua: pFimAgua,
      };
    }
  }

  // Mira não atinge a água dentro do alcance
  return {
    inicioAr: origem,
    fimAr: {
      x: origem.x + cosA * comprimentoAr,
      y: origem.y + sinA * comprimentoAr,
    },
    atingiuAgua: false,
  };
}

/**
 * Verifica se a ponta da flecha colidiu com o peixe real ou se mirou na imagem aparente.
 */
export function testarColisaoFlecha(
  pontaFlecha: Ponto2D,
  peixeReal: Ponto2D,
  imagemAparente: Ponto2D,
  raioHitPeixe = 21,
): ResultadoTiro {
  const distReal = Math.hypot(pontaFlecha.x - peixeReal.x, pontaFlecha.y - peixeReal.y);
  if (distReal <= raioHitPeixe) {
    return 'ACERTOU_REAL';
  }

  const distAparente = Math.hypot(
    pontaFlecha.x - imagemAparente.x,
    pontaFlecha.y - imagemAparente.y,
  );
  if (distAparente <= raioHitPeixe * 1.1) {
    return 'ERROU_MIROU_APARENTE';
  }

  return 'EM_VOO';
}

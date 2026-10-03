import { type Cena, type Raios } from './simulation';
import { type Material } from './materials';
import { paraGraus } from './physics';

export interface SceneOptions {
  canvas: HTMLCanvasElement;
  cena: Cena;
  raios: Raios;
  laserCor: string;
  exibirTransferidor?: boolean;
  exibirRotulosAngulos?: boolean;
}

function desenharMeio(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  material: Material,
  posicao: 'Superior' | 'Inferior',
  eMeioIncidente: boolean,
): void {
  // Preenchimento do meio óptico
  ctx.fillStyle = material.cor;
  ctx.fillRect(x, y, largura, altura);

  // Cartão técnico de identificação do meio
  const cardX = x + 16;
  const cardY = posicao === 'Superior' ? y + 16 : y + 16;
  const cardLargura = 220;
  const cardAltura = 48;

  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
  ctx.strokeStyle = material.corAcento;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardLargura, cardAltura, 6);
  ctx.fill();
  ctx.stroke();

  // Badge Meio 1 / Meio 2
  ctx.fillStyle = eMeioIncidente ? '#1d4ed8' : '#475569';
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const roleText = eMeioIncidente ? 'MEIO 1 (INCIDENTE)' : 'MEIO 2 (TRANSMISSÃO)';
  ctx.fillText(roleText, cardX + 10, cardY + 8);

  // Nome do material e índice de refração
  ctx.fillStyle = material.corTexto;
  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillText(material.nome, cardX + 10, cardY + 24);

  ctx.fillStyle = '#0f172a';
  ctx.font = '500 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`n = ${material.indiceRefracao.toFixed(4)}`, cardX + cardLargura - 10, cardY + 25);

  ctx.restore();
}

function desenharTransferidor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#475569';
  ctx.font = '9px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Arco superior
  ctx.beginPath();
  ctx.arc(x, y, raio, Math.PI, 0);
  ctx.stroke();

  // Arco inferior
  ctx.beginPath();
  ctx.arc(x, y, raio, 0, Math.PI);
  ctx.stroke();

  // Marcações angulares de 0° a 90° em relação à normal em ambos os semiplanos
  const angulos = [0, 15, 30, 45, 60, 75, 90];
  for (const deg of angulos) {
    const rad = (deg * Math.PI) / 180;

    // Quatro quadrantes simétricos em relação à vertical (normal)
    const direcoes = [
      -Math.PI / 2 + rad,
      -Math.PI / 2 - rad,
      Math.PI / 2 + rad,
      Math.PI / 2 - rad,
    ];

    for (const ang of direcoes) {
      const cosA = Math.cos(ang);
      const sinA = Math.sin(ang);
      const tickLen = deg % 30 === 0 ? 8 : 4;

      ctx.beginPath();
      ctx.moveTo(x + (raio - tickLen) * cosA, y + (raio - tickLen) * sinA);
      ctx.lineTo(x + raio * cosA, y + raio * sinA);
      ctx.stroke();

      if (deg % 30 === 0 && deg > 0 && deg < 90) {
        const textR = raio - 16;
        ctx.fillText(`${deg}°`, x + textR * cosA, y + textR * sinA);
      }
    }
  }

  ctx.restore();
}

function desenharFeixeLaser(
  ctx: CanvasRenderingContext2D,
  pontoInicial: { x: number; y: number },
  pontoFinal: { x: number; y: number },
  cor: string,
  intensidade: number,
  rotulo?: string,
): void {
  ctx.save();
  const alpha = Math.min(1, Math.max(0.1, intensidade));
  ctx.globalAlpha = alpha;

  // Brilho difuso externo (atenua blur e espessura conforme a intensidade do feixe)
  ctx.beginPath();
  ctx.moveTo(pontoInicial.x, pontoInicial.y);
  ctx.lineTo(pontoFinal.x, pontoFinal.y);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 3.5 + 2.5 * alpha;
  ctx.lineCap = 'round';
  ctx.shadowColor = cor;
  ctx.shadowBlur = 3 + 7 * alpha;
  ctx.stroke();

  // Núcleo central do laser: feixes atenuados perdem o núcleo incandescente brilhante
  ctx.beginPath();
  ctx.moveTo(pontoInicial.x, pontoInicial.y);
  ctx.lineTo(pontoFinal.x, pontoFinal.y);
  ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, 0.25 + 0.75 * Math.pow(alpha, 1.5))})`;
  ctx.lineWidth = Math.max(0.7, 1.8 * alpha);
  ctx.lineCap = 'round';
  ctx.shadowBlur = 0;
  ctx.stroke();

  // Rótulo discreto do feixe, se solicitado
  if (rotulo) {
    const meioX = (pontoInicial.x + pontoFinal.x) * 0.5;
    const meioY = (pontoInicial.y + pontoFinal.y) * 0.5;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rotulo, meioX, meioY - 12);
  }

  ctx.restore();
}

function desenharArcoAngulo(
  ctx: CanvasRenderingContext2D,
  centro: { x: number; y: number },
  raio: number,
  angulo1: number,
  angulo2: number,
  cor: string,
  textoRotulo: string,
): void {
  // Normaliza a ordem para desenhar o arco menor
  let diff = angulo2 - angulo1;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  while (diff > Math.PI) diff -= 2 * Math.PI;

  const inicio = angulo1;
  const fim = angulo1 + diff;
  const antihorario = diff < 0;

  ctx.save();
  ctx.beginPath();
  ctx.arc(centro.x, centro.y, raio, inicio, fim, antihorario);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Rótulo numérico posicionado no ponto médio do arco
  const anguloMedio = angulo1 + diff * 0.5;
  const rTexto = raio + 14;
  const tx = centro.x + Math.cos(anguloMedio) * rTexto;
  const ty = centro.y + Math.sin(anguloMedio) * rTexto;

  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(textoRotulo, tx, ty);

  ctx.restore();
}

function desenharAparelhoLaser(
  ctx: CanvasRenderingContext2D,
  laserX: number,
  laserY: number,
  alvoX: number,
  alvoY: number,
  cor: string,
): void {
  const angulo = Math.atan2(alvoY - laserY, alvoX - laserX);

  ctx.save();
  ctx.translate(laserX, laserY);
  ctx.rotate(angulo);

  // Sombra e anel de manipulação (alça de arraste)
  ctx.beginPath();
  ctx.arc(0, 0, 22, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(29, 78, 216, 0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Corpo principal do emissor de laboratório (cilindro óptico)
  ctx.fillStyle = '#1e293b';
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-24, -9, 32, 18, 4);
  ctx.fill();
  ctx.stroke();

  // Bocal colimador óptico
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.roundRect(8, -6, 8, 12, 2);
  ctx.fill();
  ctx.stroke();

  // Indicador de cor / LED laser
  ctx.fillStyle = cor;
  ctx.beginPath();
  ctx.arc(-8, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowColor = cor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.arc(-8, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;

  // Lente de saída (ponto exato de emissão do feixe)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(16, 0, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function desenharPontoIncidencia(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
): void {
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Rótulo do ponto O
  ctx.font = '600 11px Inter, sans-serif';
  ctx.fillText('O', x + 8, y - 8);

  ctx.restore();
}

export function renderScene(opts: SceneOptions): void {
  const { canvas, cena, raios, laserCor, exibirTransferidor = true, exibirRotulosAngulos = true } = opts;
  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;

  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  ctx.clearRect(0, 0, w, h);

  const yInterface = cena.yInterface;
  const xAlvo = cena.xAlvo;

  // 1. Meios ópticos superior e inferior
  desenharMeio(ctx, 0, 0, w, yInterface, cena.superior, 'Superior', raios.laserNoSuperior);
  desenharMeio(ctx, 0, yInterface, w, h - yInterface, cena.inferior, 'Inferior', !raios.laserNoSuperior);

  // 2. Linha da Interface (Superfície de Contato)
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, yInterface);
  ctx.lineTo(w, yInterface);
  ctx.stroke();

  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'right';
  ctx.fillText('Superfície de Contato (Interface)', w - 16, yInterface - 6);
  ctx.restore();

  // 3. Linha Normal (N)
  ctx.save();
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(xAlvo, 0);
  ctx.lineTo(xAlvo, h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.textAlign = 'left';
  ctx.fillText('Normal (N)', xAlvo + 8, 16);
  ctx.fillText('Normal (N)', xAlvo + 8, h - 16);
  ctx.restore();

  // 4. Transferidor óptico de medição angular
  if (exibirTransferidor) {
    desenharTransferidor(ctx, xAlvo, yInterface, 110);
  }

  // Ponto central de incidência
  const pontoIncidencia = { x: xAlvo, y: yInterface };
  desenharPontoIncidencia(ctx, pontoIncidencia.x, pontoIncidencia.y);

  // 5. RENDERIZAÇÃO DOS FEIXES (RIGOROSAMENTE ATÉ 3 FEIXES)

  // FEIXE 1: Incidente (parte do emissor laser e TERMINA estritamente no ponto de incidência)
  const laserPos = { x: cena.laser.x, y: cena.laser.y };
  desenharFeixeLaser(
    ctx,
    laserPos,
    raios.pontoFimIncidente,
    laserCor,
    1.0,
    exibirRotulosAngulos ? 'Feixe Incidente' : undefined,
  );

  // FEIXE 3: Refletido (parte da interface e retorna ao Meio 1)
  // Em reflexão total interna, 100% da luz é refletida; em reflexão parcial, a intensidade é discreta (~35%)
  const intensidadeRefletida = raios.fisica.reflexaoTotal ? 1.0 : 0.35;
  desenharFeixeLaser(
    ctx,
    pontoIncidencia,
    raios.pontoFimRefletido,
    laserCor,
    intensidadeRefletida,
    exibirRotulosAngulos ? 'Feixe Refletido' : undefined,
  );

  // FEIXE 2: Refratado (parte da interface e penetra no Meio 2, DESENHADO SOMENTE SE NÃO HOUVER REFLEXÃO TOTAL)
  // Intensidade atenuada (0.50) para transmitir visualmente a perda de potência luminosa ao entrar no meio
  if (raios.pontoFimRefratado && !raios.fisica.reflexaoTotal) {
    desenharFeixeLaser(
      ctx,
      pontoIncidencia,
      raios.pontoFimRefratado,
      laserCor,
      0.50,
      exibirRotulosAngulos ? 'Feixe Refratado' : undefined,
    );
  }

  // 6. Arcos dos ângulos
  if (exibirRotulosAngulos) {
    // Vetores em relação ao ponto de incidência:
    // O raio incidente chega em pontoIncidencia vindo de laserPos: vetor aponta de alvo para laser (sentido de abertura do ângulo)
    const anguloParaLaser = Math.atan2(laserPos.y - yInterface, laserPos.x - xAlvo);
    const anguloNormalMeio1 = raios.laserNoSuperior ? -Math.PI / 2 : Math.PI / 2;

    const t1Graus = paraGraus(raios.fisica.anguloIncidencia).toFixed(1);
    desenharArcoAngulo(
      ctx,
      pontoIncidencia,
      38,
      anguloNormalMeio1,
      anguloParaLaser,
      '#1d4ed8',
      `θ₁ = ${t1Graus}°`,
    );

    // Ângulo refletido
    const anguloParaRefletido = Math.atan2(
      raios.pontoFimRefletido.y - yInterface,
      raios.pontoFimRefletido.x - xAlvo,
    );
    const trGraus = paraGraus(raios.fisica.anguloReflexao).toFixed(1);
    desenharArcoAngulo(
      ctx,
      pontoIncidencia,
      56,
      anguloNormalMeio1,
      anguloParaRefletido,
      '#475569',
      `θᵣ = ${trGraus}°`,
    );

    // Ângulo refratado (se houver transmissão)
    if (raios.pontoFimRefratado && !raios.fisica.reflexaoTotal && raios.fisica.anguloRefracao !== null) {
      const anguloNormalMeio2 = raios.laserNoSuperior ? Math.PI / 2 : -Math.PI / 2;
      const anguloParaRefratado = Math.atan2(
        raios.pontoFimRefratado.y - yInterface,
        raios.pontoFimRefratado.x - xAlvo,
      );
      const t2Graus = paraGraus(raios.fisica.anguloRefracao).toFixed(1);
      desenharArcoAngulo(
        ctx,
        pontoIncidencia,
        46,
        anguloNormalMeio2,
        anguloParaRefratado,
        '#047857',
        `θ₂ = ${t2Graus}°`,
      );
    }
  }

  // 7. Alerta didático de Reflexão Total Interna
  if (raios.fisica.reflexaoTotal) {
    ctx.save();
    const avisoY = raios.laserNoSuperior ? yInterface + 36 : yInterface - 36;
    ctx.fillStyle = '#b91c1c';
    ctx.strokeStyle = '#fca5a5';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(xAlvo - 130, avisoY - 14, 260, 28, 6);
    ctx.fillStyle = '#fef2f2';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b91c1c';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ REFLEXÃO TOTAL INTERNA (θ₁ ≥ θc)', xAlvo, avisoY);
    ctx.restore();
  }

  // 8. Desenho do emissor laser
  desenharAparelhoLaser(ctx, laserPos.x, laserPos.y, xAlvo, yInterface, laserCor);
}
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

function ehTemaEscuro(): boolean {
  return typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark';
}

function desenharMeio(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  largura: number,
  altura: number,
  material: Material,
  _posicao: 'Superior' | 'Inferior',
  eMeioIncidente: boolean,
  indiceRefracao: number,
): void {
  const isDark = ehTemaEscuro();

  // Preenchimento do meio óptico
  ctx.fillStyle = isDark ? (material.corDark ?? material.cor) : material.cor;
  ctx.fillRect(x, y, largura, altura);

  // Cartão técnico de identificação do meio
  const cardX = x + 16;
  const cardY = y + 16;
  const cardLargura = 230;
  const cardAltura = 52;

  ctx.save();
  ctx.fillStyle = isDark ? 'rgba(17, 24, 39, 0.88)' : 'rgba(255, 255, 255, 0.92)';
  ctx.strokeStyle = isDark ? (material.corAcentoDark ?? material.corAcento) : material.corAcento;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.roundRect(cardX, cardY, cardLargura, cardAltura, 6);
  ctx.fill();
  ctx.stroke();

  // Badge Meio 1 / Meio 2
  ctx.fillStyle = eMeioIncidente ? (isDark ? '#60a5fa' : '#1d4ed8') : (isDark ? '#94a3b8' : '#475569');
  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  const roleText = eMeioIncidente ? 'MEIO 1 (INCIDENTE)' : 'MEIO 2 (TRANSMISSÃO)';
  ctx.fillText(roleText, cardX + 10, cardY + 8);

  // Nome do material
  ctx.fillStyle = isDark ? (material.corTextoDark ?? material.corTexto) : material.corTexto;
  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillText(material.nome, cardX + 10, cardY + 26);

  // Índice de refração
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.font = '600 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`n = ${indiceRefracao.toFixed(4)}`, cardX + cardLargura - 10, cardY + 24);

  ctx.restore();
}

function desenharTransferidor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  raio: number,
): void {
  const isDark = ehTemaEscuro();
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.4)' : 'rgba(100, 116, 139, 0.35)';
  ctx.lineWidth = 1;
  ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
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
    const isDark = ehTemaEscuro();
    const meioX = (pontoInicial.x + pontoFinal.x) * 0.5;
    const meioY = (pontoInicial.y + pontoFinal.y) * 0.5;
    ctx.font = '600 11px Inter, sans-serif';
    ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
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
  const isDark = ehTemaEscuro();
  const anguloMedio = angulo1 + diff * 0.5;
  const rTexto = raio + 14;
  const tx = centro.x + Math.cos(anguloMedio) * rTexto;
  const ty = centro.y + Math.sin(anguloMedio) * rTexto;

  ctx.font = '600 11px "JetBrains Mono", monospace';
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
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
  ctx.strokeStyle = 'rgba(59, 130, 246, 0.35)';
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
  const isDark = ehTemaEscuro();
  ctx.save();
  ctx.strokeStyle = isDark ? '#f8fafc' : '#0f172a';
  ctx.fillStyle = isDark ? '#1e293b' : '#ffffff';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isDark ? '#38bdf8' : '#0f172a';
  ctx.beginPath();
  ctx.arc(x, y, 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Rótulo do ponto O
  ctx.fillStyle = isDark ? '#f8fafc' : '#0f172a';
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

  const isDark = ehTemaEscuro();

  // 1. Meios ópticos superior e inferior
  const nSuperior = raios.laserNoSuperior ? raios.n1 : raios.n2;
  const nInferior = raios.laserNoSuperior ? raios.n2 : raios.n1;
  desenharMeio(ctx, 0, 0, w, yInterface, cena.superior, 'Superior', raios.laserNoSuperior, nSuperior);
  desenharMeio(ctx, 0, yInterface, w, h - yInterface, cena.inferior, 'Inferior', !raios.laserNoSuperior, nInferior);

  // 2. Linha da Interface (Superfície de Contato)
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.45)' : '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, yInterface);
  ctx.lineTo(w, yInterface);
  ctx.stroke();

  ctx.font = '500 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#94a3b8' : '#475569';
  ctx.textAlign = 'right';
  ctx.fillText('Superfície de Contato (Interface)', w - 16, yInterface - 6);
  ctx.restore();

  // 3. Linha Normal (N)
  ctx.save();
  ctx.strokeStyle = isDark ? 'rgba(148, 163, 184, 0.45)' : '#64748b';
  ctx.lineWidth = 1.2;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(xAlvo, 0);
  ctx.lineTo(xAlvo, h);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.font = '600 11px Inter, system-ui, sans-serif';
  ctx.fillStyle = isDark ? '#94a3b8' : '#334155';
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
  // Em reflexão total interna, 100% da luz é refletida; em reflexão parcial, a intensidade é calibrada
  const intensidadeRefletida = raios.fisica.reflexaoTotal ? 1.0 : (raios.fisica.ehAnguloCritico ? 0.90 : 0.35);
  desenharFeixeLaser(
    ctx,
    pontoIncidencia,
    raios.pontoFimRefletido,
    laserCor,
    intensidadeRefletida,
    exibirRotulosAngulos ? 'Feixe Refletido' : undefined,
  );

  // FEIXE 2: Refratado (desenhado se houver transmissão ou feixe rasante no ângulo crítico)
  if (raios.pontoFimRefratado && !raios.fisica.reflexaoTotal) {
    const rotuloRefratado = raios.fisica.ehAnguloCritico
      ? 'Feixe Rasante (θ₂ = 90°)'
      : 'Feixe Refratado';
    const intensidadeRefratada = raios.fisica.ehAnguloCritico ? 0.85 : 0.50;

    desenharFeixeLaser(
      ctx,
      pontoIncidencia,
      raios.pontoFimRefratado,
      laserCor,
      intensidadeRefratada,
      exibirRotulosAngulos ? rotuloRefratado : undefined,
    );
  }

  // 6. Arcos dos ângulos
  if (exibirRotulosAngulos) {
    // Vetores em relação ao ponto de incidência:
    const anguloParaLaser = Math.atan2(laserPos.y - yInterface, laserPos.x - xAlvo);
    const anguloNormalMeio1 = raios.laserNoSuperior ? -Math.PI / 2 : Math.PI / 2;

    const t1Graus = paraGraus(raios.fisica.anguloIncidencia).toFixed(1);
    desenharArcoAngulo(
      ctx,
      pontoIncidencia,
      38,
      anguloNormalMeio1,
      anguloParaLaser,
      isDark ? '#60a5fa' : '#1d4ed8',
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
      isDark ? '#94a3b8' : '#475569',
      `θᵣ = ${trGraus}°`,
    );

    // Ângulo refratado (se houver transmissão ou rasante)
    if (raios.pontoFimRefratado && !raios.fisica.reflexaoTotal && raios.fisica.anguloRefracao !== null) {
      const anguloNormalMeio2 = raios.laserNoSuperior ? Math.PI / 2 : -Math.PI / 2;
      const anguloParaRefratado = Math.atan2(
        raios.pontoFimRefratado.y - yInterface,
        raios.pontoFimRefratado.x - xAlvo,
      );
      const rotuloAnguloT2 = raios.fisica.ehAnguloCritico
        ? 'θ₂ = 90.0° (Rasante)'
        : `θ₂ = ${paraGraus(raios.fisica.anguloRefracao).toFixed(1)}°`;

      desenharArcoAngulo(
        ctx,
        pontoIncidencia,
        46,
        anguloNormalMeio2,
        anguloParaRefratado,
        isDark ? '#34d399' : '#047857',
        rotuloAnguloT2,
      );
    }
  }

  // 7. Alertas didáticos: Ângulo Crítico ou Reflexão Total Interna
  if (raios.fisica.ehAnguloCritico) {
    ctx.save();
    const avisoY = raios.laserNoSuperior ? yInterface + 36 : yInterface - 36;
    ctx.beginPath();
    ctx.roundRect(xAlvo - 180, avisoY - 14, 360, 28, 6);
    ctx.fillStyle = isDark ? 'rgba(30, 58, 138, 0.9)' : '#eff6ff';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#60a5fa' : '#93c5fd';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#bfdbfe' : '#1d4ed8';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎯 ÂNGULO CRÍTICO (θ₁ = θc) · FEIXE RASANTE A 90°', xAlvo, avisoY);
    ctx.restore();
  } else if (raios.fisica.reflexaoTotal) {
    ctx.save();
    const avisoY = raios.laserNoSuperior ? yInterface + 36 : yInterface - 36;
    ctx.beginPath();
    ctx.roundRect(xAlvo - 140, avisoY - 14, 280, 28, 6);
    ctx.fillStyle = isDark ? 'rgba(127, 29, 29, 0.9)' : '#fef2f2';
    ctx.fill();
    ctx.strokeStyle = isDark ? '#f87171' : '#fca5a5';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = isDark ? '#fecaca' : '#b91c1c';
    ctx.font = '700 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠ REFLEXÃO TOTAL INTERNA (θ₁ > θc)', xAlvo, avisoY);
    ctx.restore();
  }

  // 8. Desenho do emissor laser
  desenharAparelhoLaser(ctx, laserPos.x, laserPos.y, xAlvo, yInterface, laserCor);
}
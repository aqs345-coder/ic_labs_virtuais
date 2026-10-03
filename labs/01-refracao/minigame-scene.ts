import {
  type Flecha,
  type PeixeAlvo,
  type RaioVisao,
  type Ponto2D,
  calcularOrigemFlecha,
  calcularTrajetoriaGuia,
} from './minigame-physics';

export interface MinigameSceneOptions {
  canvas: HTMLCanvasElement;
  yInterface: number;
  arqueiroPos: Ponto2D;
  olhoPos: Ponto2D;
  anguloMira: number;
  flecha: Flecha | null;
  peixe: PeixeAlvo;
  raioVisao: RaioVisao;
  exibirPeixeReal: boolean;
  exibirLinhaGuia?: boolean;
  tempo: number;
  feedbackTexto?: {
    tipo: 'sucesso' | 'alerta' | 'info';
    titulo: string;
    subtitulo: string;
  } | null;
}

/**
 * Desenha o fundo natural: céu, horizonte com silhueta de mata ciliar e leito do rio.
 */
function desenharCenario(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  yInterface: number,
  tempo: number,
): void {
  // 1. Céu tropical
  const gradCeu = ctx.createLinearGradient(0, 0, 0, yInterface);
  gradCeu.addColorStop(0, '#bae6fd');
  gradCeu.addColorStop(0.7, '#e0f2fe');
  gradCeu.addColorStop(1, '#f8fafc');
  ctx.fillStyle = gradCeu;
  ctx.fillRect(0, 0, w, yInterface);

  // Sol suave no canto superior direito
  ctx.save();
  const sunGrad = ctx.createRadialGradient(w - 120, 70, 0, w - 120, 70, 60);
  sunGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
  sunGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.3)');
  sunGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(w - 120, 70, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Mata ciliar ao fundo (silhueta de vegetação na margem oposta)
  ctx.save();
  ctx.fillStyle = '#065f46';
  ctx.beginPath();
  ctx.moveTo(w * 0.45, yInterface);
  const copas = [
    { x: w * 0.50, h: 28, r: 24 },
    { x: w * 0.58, h: 42, r: 36 },
    { x: w * 0.67, h: 32, r: 28 },
    { x: w * 0.77, h: 48, r: 40 },
    { x: w * 0.88, h: 35, r: 30 },
    { x: w * 0.96, h: 45, r: 38 },
  ];
  for (const c of copas) {
    ctx.arc(c.x, yInterface - c.h * 0.5, c.r, Math.PI, 0);
  }
  ctx.lineTo(w, yInterface);
  ctx.lineTo(w * 0.45, yInterface);
  ctx.fill();

  // Camada frontal mais clara da vegetação
  ctx.fillStyle = '#047857';
  ctx.beginPath();
  ctx.moveTo(w * 0.55, yInterface);
  const copasFrente = [
    { x: w * 0.62, h: 22, r: 20 },
    { x: w * 0.72, h: 28, r: 24 },
    { x: w * 0.83, h: 24, r: 22 },
    { x: w * 0.92, h: 30, r: 26 },
  ];
  for (const c of copasFrente) {
    ctx.arc(c.x, yInterface - c.h * 0.5, c.r, Math.PI, 0);
  }
  ctx.lineTo(w, yInterface);
  ctx.lineTo(w * 0.55, yInterface);
  ctx.fill();
  ctx.restore();

  // 2. Água do rio (Meio 2, n = 1.333)
  const gradAgua = ctx.createLinearGradient(0, yInterface, 0, h);
  gradAgua.addColorStop(0, '#38bdf8');
  gradAgua.addColorStop(0.3, '#0284c7');
  gradAgua.addColorStop(0.75, '#0369a1');
  gradAgua.addColorStop(1, '#075985');
  ctx.fillStyle = gradAgua;
  ctx.fillRect(0, yInterface, w, h - yInterface);

  // Leito do rio: areia e pedras no fundo
  ctx.save();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(0, h);
  ctx.lineTo(0, h - 22);
  ctx.bezierCurveTo(w * 0.3, h - 28, w * 0.6, h - 18, w, h - 24);
  ctx.lineTo(w, h);
  ctx.fill();

  // Pedras e vegetação subaquática no leito
  ctx.fillStyle = '#1e293b';
  const pedras = [
    { x: 80, y: h - 14, rx: 22, ry: 9 },
    { x: 260, y: h - 16, rx: 35, ry: 12 },
    { x: 490, y: h - 12, rx: 28, ry: 10 },
    { x: 680, y: h - 15, rx: 40, ry: 13 },
  ];
  for (const p of pedras) {
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.rx, p.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // Algas e plantas aquáticas ondulando
  ctx.strokeStyle = '#059669';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 6; i++) {
    const baseX = 320 + i * 75;
    const osc = Math.sin(tempo * 2 + i) * 12;
    ctx.beginPath();
    ctx.moveTo(baseX, h - 15);
    ctx.bezierCurveTo(
      baseX + osc * 0.5,
      h - 45,
      baseX - osc,
      h - 75,
      baseX + osc,
      h - 105,
    );
    ctx.stroke();
  }
  ctx.restore();

  // 3. Linha e ondulações da superfície (Interface)
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, yInterface);
  for (let x = 0; x <= w; x += 20) {
    const waveY = yInterface + Math.sin(x * 0.04 + tempo * 3) * 2;
    ctx.lineTo(x, waveY);
  }
  ctx.stroke();
}

/**
 * Desenha a canoa e o arqueiro indígena tradicional.
 */
function desenharArqueiroECanoa(
  ctx: CanvasRenderingContext2D,
  pos: Ponto2D,
  olhoPos: Ponto2D,
  anguloMira: number,
  flechaEmVoo: boolean,
): void {
  ctx.save();
  ctx.translate(pos.x, pos.y);

  // 1. Canoa tradicional esculpida em tronco (estilo indígena amazônico/indígena brasileiro)
  // Casco da canoa
  ctx.fillStyle = '#78350f';
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-65, 0); // popa
  ctx.quadraticCurveTo(-20, 18, 55, 12); // quilha imersa
  ctx.quadraticCurveTo(80, 8, 95, -6); // proa elevada
  ctx.quadraticCurveTo(60, 4, 0, 4);
  ctx.quadraticCurveTo(-45, 2, -65, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Borda superior da canoa e detalhes em madeira
  ctx.strokeStyle = '#92400e';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-62, -1);
  ctx.quadraticCurveTo(10, 3, 92, -6);
  ctx.stroke();

  // Grafismo tradicional decorativo na proa da canoa (padrão indígena)
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, 6);
  ctx.lineTo(45, 10);
  ctx.lineTo(55, 6);
  ctx.lineTo(65, 9);
  ctx.lineTo(75, 4);
  ctx.stroke();

  // 2. Arqueiro Indígena (em pé na canoa, postura firme de pesca)
  // Pernas firmes
  ctx.fillStyle = '#b45309'; // tom de pele
  ctx.fillRect(-12, -28, 8, 30);
  ctx.fillRect(8, -26, 8, 28);

  // Saiote / tanga tradicional com fibras de palha
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.moveTo(-16, -30);
  ctx.lineTo(20, -30);
  ctx.lineTo(16, -14);
  ctx.lineTo(-12, -14);
  ctx.closePath();
  ctx.fill();

  // Tronco do arqueiro
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.roundRect(-10, -68, 22, 40, 4);
  ctx.fill();

  // Pintura corporal tradicional (linhas em urucum e jenipapo)
  ctx.strokeStyle = '#b91c1c'; // urucum
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-8, -58);
  ctx.lineTo(10, -58);
  ctx.moveTo(-8, -50);
  ctx.lineTo(10, -50);
  ctx.stroke();

  // Cabeça
  ctx.fillStyle = '#b45309';
  ctx.beginPath();
  ctx.arc(2, -78, 11, 0, Math.PI * 2);
  ctx.fill();

  // Cabelo preto tradicional liso com franja
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(0, -80, 11.5, Math.PI * 0.7, Math.PI * 2.2);
  ctx.fill();

  // Cocar / adorno de penas (penas de arara azul e vermelha)
  ctx.save();
  const penas = [
    { cor: '#dc2626', x: -6, y: -88, h: 14 },
    { cor: '#2563eb', x: -2, y: -92, h: 18 },
    { cor: '#eab308', x: 2, y: -94, h: 20 },
    { cor: '#dc2626', x: 6, y: -91, h: 16 },
    { cor: '#2563eb', x: 10, y: -87, h: 13 },
  ];
  for (const p of penas) {
    ctx.fillStyle = p.cor;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 2.5, p.h * 0.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
  }
  // Faixa da testeira
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(2, -79, 11.5, -Math.PI * 0.8, -Math.PI * 0.2);
  ctx.stroke();
  ctx.restore();

  // Olho atento focado na água
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(8, -78, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // 3. Braços, Arco e Flecha (rotacionam em torno do ponto de apoio do arqueiro)
  ctx.save();
  const ombroX = olhoPos.x - 2;
  const ombroY = olhoPos.y + 14;
  ctx.translate(ombroX, ombroY);
  ctx.rotate(anguloMira);

  // Braço estendido segurando o arco
  ctx.strokeStyle = '#b45309';
  ctx.lineWidth = 6;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(24, 0);
  ctx.stroke();

  // Arco tradicional indígena (madeira nobre curva)
  ctx.strokeStyle = '#451a03';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(26, 0, 36, -Math.PI * 0.38, Math.PI * 0.38);
  ctx.stroke();

  // Corda do arco (tucum / fibra vegetal)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  const cordaY1 = -36 * Math.sin(Math.PI * 0.38);
  const cordaY2 = 36 * Math.sin(Math.PI * 0.38);
  const cordaX = 26 + 36 * Math.cos(Math.PI * 0.38);
  // Se ainda não disparou, a corda está tensionada até a mão que puxa
  const puxadaX = flechaEmVoo ? cordaX : 4;
  ctx.moveTo(cordaX, cordaY1);
  ctx.lineTo(puxadaX, 0);
  ctx.lineTo(cordaX, cordaY2);
  ctx.stroke();

  // Braço que puxa a corda (quando a flecha está engatilhada)
  if (!flechaEmVoo) {
    ctx.strokeStyle = '#b45309';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-12, 4);
    ctx.lineTo(puxadaX, 0);
    ctx.stroke();

    // Flecha nockada no arco
    desenharFlechaItem(ctx, 36, 0, 52, 0);
  }

  ctx.restore();
}

/**
 * Desenha a linha guia tracejada prolongada da flecha, mostrando a trajetória
 * pelo ar e a refração angular ao entrar no meio aquático segundo a Lei de Snell.
 */
function desenharLinhaGuiaProlongada(
  ctx: CanvasRenderingContext2D,
  origem: Ponto2D,
  anguloMira: number,
  yInterface: number,
): void {
  const guia = calcularTrajetoriaGuia(origem, anguloMira, yInterface, 850, 600);

  ctx.save();
  ctx.lineCap = 'round';

  // 1. Trecho no Ar (Linha tracejada branca com contorno escuro nítido)
  // Camada 1: Contorno escuro de alto contraste
  ctx.strokeStyle = 'rgba(15, 23, 42, 0.78)';
  ctx.lineWidth = 3.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(guia.inicioAr.x, guia.inicioAr.y);
  ctx.lineTo(guia.fimAr.x, guia.fimAr.y);
  ctx.stroke();

  // Camada 2: Miolo branco brilhante
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.8;
  ctx.setLineDash([8, 6]);
  ctx.beginPath();
  ctx.moveTo(guia.inicioAr.x, guia.inicioAr.y);
  ctx.lineTo(guia.fimAr.x, guia.fimAr.y);
  ctx.stroke();

  // 2. Ponto de entrada e trecho refratado na água
  if (guia.atingiuAgua && guia.inicioAgua && guia.fimAgua) {
    // Marcador de refração na superfície com anel escuro de contraste
    ctx.setLineDash([]);
    ctx.fillStyle = '#38bdf8';
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(guia.inicioAgua.x, guia.inicioAgua.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Contorno fino do marcador
    ctx.strokeStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Reta refratada prolongada na água com contorno escuro profundo
    // Camada 1: Contorno azul-marinho profundo
    ctx.strokeStyle = 'rgba(7, 89, 133, 0.95)';
    ctx.lineWidth = 3.8;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(guia.inicioAgua.x, guia.inicioAgua.y);
    ctx.lineTo(guia.fimAgua.x, guia.fimAgua.y);
    ctx.stroke();

    // Camada 2: Miolo ciano luminoso
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(guia.inicioAgua.x, guia.inicioAgua.y);
    ctx.lineTo(guia.fimAgua.x, guia.fimAgua.y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Desenha uma flecha em coordenadas locais.
 */
function desenharFlechaItem(
  ctx: CanvasRenderingContext2D,
  pontaX: number,
  pontaY: number,
  comprimento: number,
  _angulo: number,
): void {
  ctx.save();
  // Haste de madeira
  ctx.strokeStyle = '#78350f';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pontaX - comprimento, pontaY);
  ctx.lineTo(pontaX, pontaY);
  ctx.stroke();

  // Ponta de osso ou pedra lascada
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.moveTo(pontaX + 6, pontaY);
  ctx.lineTo(pontaX - 4, pontaY - 3.5);
  ctx.lineTo(pontaX - 4, pontaY + 3.5);
  ctx.closePath();
  ctx.fill();

  // Emplumadeira tradicional de penas na rabeira
  ctx.fillStyle = '#dc2626';
  ctx.beginPath();
  ctx.moveTo(pontaX - comprimento, pontaY);
  ctx.lineTo(pontaX - comprimento + 10, pontaY - 5);
  ctx.lineTo(pontaX - comprimento + 4, pontaY);
  ctx.lineTo(pontaX - comprimento + 10, pontaY + 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Desenha um peixe nadando com escala compacta para maior desafio de mira.
 */
function desenharPeixe(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  fase: number,
  opacidade: number,
  ehAparente: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = opacidade;

  // Escala reduzida para peixe mais compacto e tiro mais desafiador
  const escalaPeixe = 0.72;
  ctx.save();
  ctx.scale(escalaPeixe, escalaPeixe);

  const caudaOsc = Math.sin(fase * 8) * 6;

  if (ehAparente) {
    // Efeito de brilho etéreo para a imagem aparente (onde a luz refratada chega aos olhos)
    ctx.shadowColor = '#38bdf8';
    ctx.shadowBlur = 10;
  }

  // Corpo do peixe
  ctx.fillStyle = ehAparente ? '#7dd3fc' : '#f59e0b';
  ctx.strokeStyle = ehAparente ? '#38bdf8' : '#d97706';
  ctx.lineWidth = 1.6;

  ctx.beginPath();
  // Formato hidrodinâmico do peixe
  ctx.moveTo(24, 0); // focinho
  ctx.quadraticCurveTo(6, -14, -18, -4);
  ctx.lineTo(-24 + caudaOsc * 0.4, 0);
  ctx.lineTo(-18, 4);
  ctx.quadraticCurveTo(6, 14, 24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cauda vibrante balançando
  ctx.fillStyle = ehAparente ? '#38bdf8' : '#ea580c';
  ctx.beginPath();
  ctx.moveTo(-18, 0);
  ctx.lineTo(-32 + caudaOsc, -12);
  ctx.quadraticCurveTo(-26 + caudaOsc, 0, -32 + caudaOsc, 12);
  ctx.closePath();
  ctx.fill();

  // Barbatana dorsal
  ctx.fillStyle = ehAparente ? '#0284c7' : '#d97706';
  ctx.beginPath();
  ctx.moveTo(-4, -11);
  ctx.lineTo(4, -18);
  ctx.lineTo(10, -9);
  ctx.closePath();
  ctx.fill();

  // Olho do peixe
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(16, -2.5, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(17, -2.5, 1.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore(); // Restaura escala para manter texto nítido

  // Etiqueta didática flutuante sobre o peixe
  ctx.shadowBlur = 0;
  ctx.font = '700 11px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';

  if (ehAparente) {
    ctx.fillStyle = '#e0f2fe';
    ctx.fillText('👁 Imagem Aparente (Falsa)', 0, -18);
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillStyle = '#bae6fd';
    ctx.fillText('(Refração: onde nossos olhos veem)', 0, -8);
  } else {
    ctx.fillStyle = '#fef08a';
    ctx.fillText('🐟 Peixe Real (Revelado)', 0, -18);
    ctx.font = '500 9px Inter, sans-serif';
    ctx.fillStyle = '#fde68a';
    ctx.fillText('(Posição verdadeira)', 0, -8);
  }

  ctx.restore();
}

/**
 * Renderiza a cena completa do minigame do arqueiro.
 */
export function renderMinigameScene(opts: MinigameSceneOptions): void {
  const {
    canvas,
    yInterface,
    arqueiroPos,
    olhoPos,
    anguloMira,
    flecha,
    peixe,
    raioVisao,
    exibirPeixeReal,
    exibirLinhaGuia = true,
    tempo,
    feedbackTexto,
  } = opts;

  const ctx = canvas.getContext('2d')!;
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);

  const w = rect.width;
  const h = rect.height;

  // 1. Cenário aquático e atmosfera
  desenharCenario(ctx, w, h, yInterface, tempo);

  // 2. Imagem Aparente (O peixe onde nossos olhos veem fora da água)
  desenharPeixe(
    ctx,
    raioVisao.imagemAparente.x,
    raioVisao.imagemAparente.y,
    peixe.oscilacaoFase,
    0.68,
    true,
  );

  // 3. Peixe Real (O alvo físico verdadeiro na água)
  if (exibirPeixeReal) {
    desenharPeixe(ctx, peixe.x, peixe.y, peixe.oscilacaoFase, 1.0, false);
  }

  // 4. Canoa e Arqueiro Indígena
  const flechaEmVoo = flecha !== null && flecha.ativa;
  desenharArqueiroECanoa(ctx, arqueiroPos, olhoPos, anguloMira, flechaEmVoo);

  // Linha guia prolongada tracejada (mostrando a trajetória reta contínua)
  if (!flechaEmVoo && exibirLinhaGuia) {
    const pontaArco = calcularOrigemFlecha(olhoPos, anguloMira);
    desenharLinhaGuiaProlongada(ctx, pontaArco, anguloMira, yInterface);
  }

  // 6. Flecha em voo
  if (flecha && flecha.ativa) {
    ctx.save();
    ctx.translate(flecha.x, flecha.y);
    ctx.rotate(flecha.angulo);
    desenharFlechaItem(ctx, 0, 0, flecha.comprimento, flecha.angulo);

    // Efeito de rastro
    ctx.strokeStyle = flecha.noAr ? 'rgba(255, 255, 255, 0.4)' : 'rgba(56, 189, 248, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-flecha.comprimento, 0);
    ctx.lineTo(-flecha.comprimento - 18, 0);
    ctx.stroke();
    ctx.restore();
  }

  // 7. Cartão de Feedback pedagógico flutuante (ao acertar ou errar)
  if (feedbackTexto) {
    ctx.save();
    const cx = w * 0.5;
    const cy = 60;
    const cardW = 440;
    const cardH = 68;

    ctx.fillStyle =
      feedbackTexto.tipo === 'sucesso'
        ? 'rgba(6, 95, 70, 0.95)'
        : feedbackTexto.tipo === 'alerta'
        ? 'rgba(120, 53, 15, 0.95)'
        : 'rgba(30, 41, 59, 0.95)';
    ctx.strokeStyle =
      feedbackTexto.tipo === 'sucesso'
        ? '#34d399'
        : feedbackTexto.tipo === 'alerta'
        ? '#f59e0b'
        : '#94a3b8';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.roundRect(cx - cardW * 0.5, cy - cardH * 0.5, cardW, cardH, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(feedbackTexto.titulo, cx, cy - 12);

    ctx.fillStyle = '#f1f5f9';
    ctx.font = '500 11.5px Inter, sans-serif';
    ctx.fillText(feedbackTexto.subtitulo, cx, cy + 12);

    ctx.restore();
  }
}

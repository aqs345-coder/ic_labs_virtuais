import { calcularRaios, anguloCriticoGraus, type Cena, type Raios } from './simulation';
import { PARES_MATERIAIS, materialPorId, MATERIAIS, indiceRefracaoParaComprimentoOnda } from './materials';
import { LASERS, laserPorId, type LaserPreset } from './lasers';
import { renderScene, type SceneOptions } from './scene';
import { paraGraus } from './physics';
import { MinigameArqueiro } from './minigame';
import katex from 'katex';
import 'katex/dist/katex.min.css';

interface Estado {
  cena: Cena;
  raios: Raios;
  laserAtivo: LaserPreset;
  exibirTransferidor: boolean;
  exibirRotulos: boolean;
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const selectSuperior = document.getElementById('material-superior') as HTMLSelectElement;
const selectInferior = document.getElementById('material-inferior') as HTMLSelectElement;
const btnInverterMeios = document.getElementById('btn-inverter-meios') as HTMLButtonElement | null;
const btnAjustarCritico = document.getElementById('btn-ajustar-critico') as HTMLButtonElement | null;
const swatchesContainer = document.getElementById('laser-swatches') as HTMLDivElement;

const readoutN1 = document.getElementById('readout-n1') as HTMLElement | null;
const readoutN2 = document.getElementById('readout-n2') as HTMLElement | null;
const readoutT1 = document.getElementById('readout-t1') as HTMLElement;
const readoutTr = document.getElementById('readout-tr') as HTMLElement;
const readoutT2 = document.getElementById('readout-t2') as HTMLElement;
const readoutTc = document.getElementById('readout-tc') as HTMLElement;
const readoutSnellStatus = document.getElementById('readout-snell-status') as HTMLElement;
const readoutEstado = document.getElementById('readout-estado') as HTMLElement;
const readoutLambdaHeader = document.getElementById('readout-lambda-header') as HTMLElement;

const checkTransferidor = document.getElementById('check-transferidor') as HTMLInputElement | null;
const checkRotulos = document.getElementById('check-rotulos') as HTMLInputElement | null;
const btnBack = document.getElementById('btn-back') as HTMLAnchorElement | null;

// Abas de Cena e Painéis
const tabBancada = document.getElementById('tab-bancada') as HTMLButtonElement | null;
const tabMinigame = document.getElementById('tab-minigame') as HTMLButtonElement | null;
const panelBancada = document.getElementById('panel-bancada') as HTMLElement | null;
const panelMinigame = document.getElementById('panel-minigame') as HTMLElement | null;
const canvasTitle = document.getElementById('canvas-header-title') as HTMLElement | null;
const canvasHint = document.getElementById('canvas-header-hint') as HTMLElement | null;

let cenaAtiva: 'bancada' | 'minigame' = 'bancada';
let minigameInstancia: MinigameArqueiro | null = null;

let estado: Estado;
let dragAtivo = false;
let dirty = true;

// Posição alvo para suavização contínua (evita mudanças e saltos bruscos)
const laserAlvo = { x: 0, y: 0 };

function alternarCena(novaCena: 'bancada' | 'minigame'): void {
  if (cenaAtiva === novaCena) return;
  cenaAtiva = novaCena;

  if (novaCena === 'bancada') {
    tabBancada?.classList.add('lab__tab--active');
    tabBancada?.setAttribute('aria-selected', 'true');
    tabMinigame?.classList.remove('lab__tab--active');
    tabMinigame?.setAttribute('aria-selected', 'false');

    panelBancada?.classList.remove('lab__panel-hidden');
    panelMinigame?.classList.add('lab__panel-hidden');

    if (canvasTitle) canvasTitle.textContent = 'Bancada Óptica Virtual';
    if (canvasHint) canvasHint.textContent = '💡 Dica: Clique e arraste o emissor laser suavemente no plano';

    minigameInstancia?.pausar();
    dirty = true;
    render();
  } else {
    tabMinigame?.classList.add('lab__tab--active');
    tabMinigame?.setAttribute('aria-selected', 'true');
    tabBancada?.classList.remove('lab__tab--active');
    tabBancada?.setAttribute('aria-selected', 'false');

    panelMinigame?.classList.remove('lab__panel-hidden');
    panelBancada?.classList.add('lab__panel-hidden');

    if (canvasTitle) canvasTitle.textContent = 'Desafio da Pesca com Arco: Profundidade Aparente';
    if (canvasHint) canvasHint.textContent = '🏹 Dica: Mire com o mouse/toque e clique para disparar (ou Espaço)';

    minigameInstancia?.iniciar();
  }
}

// Configuração segura do link de retorno ao hub
if (btnBack) {
  const base = import.meta.env.BASE_URL || '/';
  const urlHub = base.endsWith('/') ? base : `${base}/`;
  btnBack.href = urlHub;
}

function criarCenaInicial(): Cena {
  const par = PARES_MATERIAIS[0] || { superiorId: 'ar', inferiorId: 'agua' };
  const superior = materialPorId(par.superiorId);
  const inferior = materialPorId(par.inferiorId);
  const laser = LASERS[4] ?? LASERS[0];
  if (!laser) throw new Error('Nenhum laser disponível');

  const rect = canvas.getBoundingClientRect();
  const largura = rect.width || 800;
  const altura = rect.height || 560;
  const yInterface = altura * 0.5;
  const xAlvo = largura * 0.5;

  const xInicial = xAlvo - 180;
  const yInicial = yInterface - 140;

  laserAlvo.x = xInicial;
  laserAlvo.y = yInicial;

  return {
    largura,
    altura,
    yInterface,
    xAlvo,
    superior,
    inferior,
    comprimentoOndaNm: laser.comprimentoOndaNm,
    laser: {
      x: xInicial,
      y: yInicial,
      cor: laser.cor,
      intensidade: 1,
    },
  };
}

function popularMateriais(): void {
  selectSuperior.innerHTML = '';
  selectInferior.innerHTML = '';

  const materiaisLista = Object.values(MATERIAIS);

  for (const mat of materiaisLista) {
    const opt1 = document.createElement('option');
    opt1.value = mat.id;
    opt1.textContent = `${mat.nome} (n = ${mat.indiceRefracao.toFixed(4)})`;
    selectSuperior.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = mat.id;
    opt2.textContent = `${mat.nome} (n = ${mat.indiceRefracao.toFixed(4)})`;
    selectInferior.appendChild(opt2);
  }

  const primeiroPar = PARES_MATERIAIS[0];
  if (primeiroPar) {
    selectSuperior.value = primeiroPar.superiorId;
    selectInferior.value = primeiroPar.inferiorId;
  }
}

function popularLasers(): void {
  swatchesContainer.innerHTML = '';
  for (const laser of LASERS) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'lab__swatch';
    btn.style.setProperty('--swatch-color', laser.cor);
    btn.dataset.laserId = laser.id;
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-label', `${laser.nome} · ${laser.comprimentoOndaNm} nm`);
    btn.innerHTML = `<span class="lab__swatch-dot" style="background: ${laser.cor}"></span><span class="lab__swatch-label">${laser.comprimentoOndaNm} nm</span>`;
    btn.addEventListener('click', () => selecionarLaser(laser.id));
    swatchesContainer.appendChild(btn);
  }
}

function atualizarCenaDeControles(): void {
  const superior = materialPorId(selectSuperior.value);
  const inferior = materialPorId(selectInferior.value);

  estado.cena.superior = superior;
  estado.cena.inferior = inferior;
  estado.cena.laser.cor = estado.laserAtivo.cor;

  dirty = true;
}

function inverterMeios(): void {
  const atualSup = selectSuperior.value;
  const atualInf = selectInferior.value;
  selectSuperior.value = atualInf;
  selectInferior.value = atualSup;
  atualizarCenaDeControles();
}

function selecionarLaser(id: string): void {
  const laser = laserPorId(id);
  estado.laserAtivo = laser;
  estado.cena.comprimentoOndaNm = laser.comprimentoOndaNm;
  estado.cena.laser.cor = laser.cor;

  if (readoutLambdaHeader) {
    readoutLambdaHeader.textContent = `${laser.comprimentoOndaNm} nm · ${laser.nome}`;
  }

  for (const btn of swatchesContainer.querySelectorAll<HTMLButtonElement>('.lab__swatch')) {
    const isSelected = btn.dataset.laserId === id;
    btn.dataset.selected = isSelected ? 'true' : 'false';
    btn.setAttribute('aria-checked', isSelected ? 'true' : 'false');
  }

  dirty = true;
}

function ajustarParaAnguloCritico(): void {
  const laserNoSup = estado.cena.laser.y < estado.cena.yInterface;
  const m1 = laserNoSup ? estado.cena.superior : estado.cena.inferior;
  const m2 = laserNoSup ? estado.cena.inferior : estado.cena.superior;

  const n1Efetivo = indiceRefracaoParaComprimentoOnda(m1, estado.cena.comprimentoOndaNm);
  const n2Efetivo = indiceRefracaoParaComprimentoOnda(m2, estado.cena.comprimentoOndaNm);

  if (n1Efetivo <= n2Efetivo) return;

  const thetaC = Math.asin(n2Efetivo / n1Efetivo);
  const dx = estado.cena.laser.x - estado.cena.xAlvo;
  const dy = estado.cena.laser.y - estado.cena.yInterface;
  const raio = Math.max(160, Math.hypot(dx, dy));
  const sinalX = dx >= 0 ? 1 : -1;
  const sinalY = laserNoSup ? -1 : 1;

  laserAlvo.x = estado.cena.xAlvo + sinalX * raio * Math.sin(thetaC);
  laserAlvo.y = estado.cena.yInterface + sinalY * raio * Math.cos(thetaC);
  dirty = true;
}

function recalcularERender(): void {
  estado.raios = calcularRaios(estado.cena);
  atualizarLeitura();
  render();
}

function atualizarLeitura(): void {
  const { raios } = estado;
  const { fisica, meio1, meio2 } = raios;

  const t1Graus = paraGraus(fisica.anguloIncidencia);
  const trGraus = paraGraus(fisica.anguloReflexao);

  if (readoutN1) {
    readoutN1.textContent = `${raios.n1Efetivo.toFixed(4)} (${meio1.nome})`;
  }
  if (readoutN2) {
    readoutN2.textContent = `${raios.n2Efetivo.toFixed(4)} (${meio2.nome})`;
  }

  readoutT1.textContent = `${t1Graus.toFixed(1)}°`;
  readoutTr.textContent = `${trGraus.toFixed(1)}°`;

  if (fisica.ehAnguloCritico) {
    readoutT2.textContent = '90.0° (Rasante)';
    readoutT2.dataset.alert = 'critico';
  } else if (fisica.reflexaoTotal) {
    readoutT2.textContent = '∄';
    readoutT2.dataset.alert = 'true';
  } else if (fisica.anguloRefracao !== null) {
    const t2Graus = paraGraus(fisica.anguloRefracao);
    readoutT2.textContent = `${t2Graus.toFixed(1)}°`;
    readoutT2.dataset.alert = 'false';
  }

  const critico = anguloCriticoGraus(raios);
  if (critico === null) {
    readoutTc.textContent = 'Não ocorre';
    readoutTc.dataset.alert = 'false';
    if (btnAjustarCritico) {
      btnAjustarCritico.disabled = true;
      btnAjustarCritico.title = 'Ângulo crítico só existe quando n₁ > n₂';
    }
  } else {
    readoutTc.textContent = `${critico.toFixed(1)}°`;
    readoutTc.dataset.alert = t1Graus >= critico ? 'true' : 'false';
    if (btnAjustarCritico) {
      btnAjustarCritico.disabled = false;
      btnAjustarCritico.title = 'Ajusta o laser suavemente para o ângulo crítico (θ₁ = θc)';
    }
  }

  // Atualização do estado do fenômeno
  if (fisica.ehAnguloCritico) {
    readoutEstado.textContent = 'Ângulo Crítico (θ₁ = θc): Feixe refratado rasante à interface horizontal (90°)';
    readoutEstado.dataset.status = 'critico';
  } else if (fisica.reflexaoTotal) {
    readoutEstado.textContent = 'Reflexão Total Interna (100% refletido)';
    readoutEstado.dataset.status = 'total';
  } else {
    if (fisica.aproximacaoDaNormal) {
      readoutEstado.textContent = 'Refração com aproximação da normal (n₂ > n₁)';
      readoutEstado.dataset.status = 'normal';
    } else {
      readoutEstado.textContent = 'Refração com afastamento da normal (n₂ < n₁)';
      readoutEstado.dataset.status = 'normal';
    }
  }
}

function render(): void {
  const opts: SceneOptions = {
    canvas,
    cena: estado.cena,
    raios: estado.raios,
    laserCor: estado.laserAtivo.cor,
    exibirTransferidor: estado.exibirTransferidor,
    exibirRotulosAngulos: estado.exibirRotulos,
  };
  renderScene(opts);
}

function onResize(): void {
  if (cenaAtiva === 'minigame') {
    minigameInstancia?.onResize();
    return;
  }

  const rect = canvas.getBoundingClientRect();
  const w = rect.width || 800;
  const h = rect.height || 560;

  estado.cena.largura = w;
  estado.cena.altura = h;
  estado.cena.yInterface = h * 0.5;
  estado.cena.xAlvo = w * 0.5;

  const margem = 24;
  laserAlvo.x = Math.max(margem, Math.min(w - margem, laserAlvo.x));
  laserAlvo.y = Math.max(margem, Math.min(h - margem, laserAlvo.y));

  dirty = true;
}

function getCanvasPoint(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function onPointerDown(e: PointerEvent): void {
  if (cenaAtiva !== 'bancada') return;
  if (e.target !== canvas) return;

  const ponto = getCanvasPoint(e.clientX, e.clientY);
  const dx = ponto.x - estado.cena.laser.x;
  const dy = ponto.y - estado.cena.laser.y;
  const dist = Math.hypot(dx, dy);

  // Raio de ativação do emissor laser
  if (dist > 35) return;

  dragAtivo = true;
  canvas.setPointerCapture(e.pointerId);
  canvas.style.cursor = 'grabbing';
}

function onPointerMove(e: PointerEvent): void {
  if (cenaAtiva !== 'bancada') return;

  const ponto = getCanvasPoint(e.clientX, e.clientY);
  const dx = ponto.x - estado.cena.laser.x;
  const dy = ponto.y - estado.cena.laser.y;
  const dist = Math.hypot(dx, dy);

  if (!dragAtivo) {
    canvas.style.cursor = dist <= 35 ? 'grab' : 'default';
    return;
  }

  const margem = 24;
  const alvoX = Math.max(margem, Math.min(estado.cena.largura - margem, ponto.x));
  const alvoY = Math.max(margem, Math.min(estado.cena.altura - margem, ponto.y));

  laserAlvo.x = alvoX;
  laserAlvo.y = alvoY;
  dirty = true;
}

function onPointerUp(e: PointerEvent): void {
  if (cenaAtiva !== 'bancada') return;
  if (!dragAtivo) return;
  dragAtivo = false;
  canvas.releasePointerCapture(e.pointerId);
  canvas.style.cursor = 'default';
}

/**
 * Loop principal de animação e suavização (60 FPS com lerp amortecido).
 * Elimina transições abruptas e solavancos ao movimentar o laser ou alternar meios/ângulos.
 */
function animar(): void {
  if (cenaAtiva === 'bancada') {
    const dx = laserAlvo.x - estado.cena.laser.x;
    const dy = laserAlvo.y - estado.cena.laser.y;
    const distSq = dx * dx + dy * dy;

    if (distSq > 0.005) {
      // Amortecimento suave: mais dinâmico ao arrastar, e ultra-suave ao soltar/ajustar
      const fatorSuavizacao = dragAtivo ? 0.32 : 0.16;
      estado.cena.laser.x += dx * fatorSuavizacao;
      estado.cena.laser.y += dy * fatorSuavizacao;
      dirty = true;
    }

    if (dirty) {
      dirty = false;
      recalcularERender();
    }
  }

  requestAnimationFrame(animar);
}

function init(): void {
  popularMateriais();
  popularLasers();

  const laserPadrao = LASERS[4] ?? LASERS[0];
  if (!laserPadrao) throw new Error('Nenhum laser disponível');

  estado = {
    cena: criarCenaInicial(),
    raios: {} as Raios,
    laserAtivo: laserPadrao,
    exibirTransferidor: checkTransferidor ? checkTransferidor.checked : true,
    exibirRotulos: checkRotulos ? checkRotulos.checked : true,
  };

  selectSuperior.addEventListener('change', atualizarCenaDeControles);
  selectInferior.addEventListener('change', atualizarCenaDeControles);

  if (btnInverterMeios) {
    btnInverterMeios.addEventListener('click', inverterMeios);
  }

  if (btnAjustarCritico) {
    btnAjustarCritico.addEventListener('click', ajustarParaAnguloCritico);
  }

  if (checkTransferidor) {
    checkTransferidor.addEventListener('change', () => {
      estado.exibirTransferidor = checkTransferidor.checked;
      dirty = true;
    });
  }

  if (checkRotulos) {
    checkRotulos.addEventListener('change', () => {
      estado.exibirRotulos = checkRotulos.checked;
      dirty = true;
    });
  }

  // Inicialização do Minigame do Arqueiro
  const btnDisparar = document.getElementById('btn-disparar-flecha') as HTMLButtonElement;
  const btnNovoPeixe = document.getElementById('btn-novo-peixe') as HTMLButtonElement;
  const sliderAngulo = document.getElementById('slider-mira-angulo') as HTMLInputElement;
  const readoutAngulo = document.getElementById('readout-mira-angulo') as HTMLElement;
  const readoutAcertos = document.getElementById('readout-acertos') as HTMLElement;
  const readoutTentativas = document.getElementById('readout-tentativas') as HTMLElement;
  const readoutPrecisao = document.getElementById('readout-precisao') as HTMLElement;
  const readoutFeedbackCard = document.getElementById('readout-game-feedback') as HTMLElement;
  const checkOcultarGuia = document.getElementById('check-ocultar-guia') as HTMLInputElement;

  if (btnDisparar && panelMinigame) {
    minigameInstancia = new MinigameArqueiro(canvas, {
      containerPainel: panelMinigame,
      btnDisparar,
      btnNovoPeixe,
      sliderAngulo,
      readoutAngulo,
      readoutAcertos,
      readoutTentativas,
      readoutPrecisao,
      readoutFeedbackCard,
      checkOcultarGuia,
    });
  }

  // Eventos de troca de cena (Abas)
  if (tabBancada) {
    tabBancada.addEventListener('click', () => alternarCena('bancada'));
  }
  if (tabMinigame) {
    tabMinigame.addEventListener('click', () => alternarCena('minigame'));
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  window.addEventListener('resize', onResize);

  if (readoutSnellStatus) {
    katex.render('n_1 \\cdot \\sin(\\theta_1) = n_2 \\cdot \\sin(\\theta_2)', readoutSnellStatus, {
      throwOnError: false,
    });
  }

  selecionarLaser(estado.laserAtivo.id);
  onResize();
  recalcularERender();

  // Inicia o loop contínuo de suavização
  requestAnimationFrame(animar);
}

init();
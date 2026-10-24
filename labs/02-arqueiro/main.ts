import './style.css';
import { MinigameArqueiro } from './minigame';
import { initTheme } from '../../src/theme';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const panelMinigame = document.getElementById('panel-minigame') as HTMLElement;
const btnDisparar = document.getElementById('btn-disparar-flecha') as HTMLButtonElement;
const btnNovoPeixe = document.getElementById('btn-novo-peixe') as HTMLButtonElement;
const sliderAngulo = document.getElementById('slider-mira-angulo') as HTMLInputElement;
const readoutAngulo = document.getElementById('readout-mira-angulo') as HTMLElement;
const readoutAcertos = document.getElementById('readout-acertos') as HTMLElement;
const readoutTentativas = document.getElementById('readout-tentativas') as HTMLElement;
const readoutPrecisao = document.getElementById('readout-precisao') as HTMLElement;
const checkOcultarGuia = document.getElementById('check-ocultar-guia') as HTMLInputElement;
const btnBack = document.getElementById('btn-back') as HTMLAnchorElement | null;

// Configuração segura do link de retorno ao hub
if (btnBack) {
  const base = import.meta.env.BASE_URL || '/';
  const urlHub = base.endsWith('/') ? base : `${base}/`;
  btnBack.href = urlHub;
}

if (canvas && panelMinigame && btnDisparar && btnNovoPeixe && sliderAngulo) {
  const minigame = new MinigameArqueiro(canvas, {
    containerPainel: panelMinigame,
    btnDisparar,
    btnNovoPeixe,
    sliderAngulo,
    readoutAngulo,
    readoutAcertos,
    readoutTentativas,
    readoutPrecisao,
    checkOcultarGuia,
  });

  window.addEventListener('resize', () => {
    minigame.onResize();
  });

  initTheme(() => {
    minigame.onResize();
  });

  minigame.iniciar();
}

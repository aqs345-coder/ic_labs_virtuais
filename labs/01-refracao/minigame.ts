import {
  calcularOrigemFlecha,
  calcularRaioVisaoEImagemAparente,
  criarFlecha,
  atualizarFlecha,
  testarColisaoFlecha,
  type Flecha,
  type PeixeAlvo,
  type RaioVisao,
  type Ponto2D,
} from './minigame-physics';
import { renderMinigameScene } from './minigame-scene';

export interface MinigameUIElements {
  containerPainel: HTMLElement;
  btnDisparar: HTMLButtonElement;
  btnNovoPeixe: HTMLButtonElement;
  sliderAngulo: HTMLInputElement;
  readoutAngulo: HTMLElement;
  readoutAcertos: HTMLElement;
  readoutTentativas: HTMLElement;
  readoutPrecisao: HTMLElement;
  readoutFeedbackCard: HTMLElement;
  checkOcultarGuia: HTMLInputElement;
}

export class MinigameArqueiro {
  private canvas: HTMLCanvasElement;
  private ui: MinigameUIElements;
  private animFrameId: number | null = null;
  private ativo = false;

  private yInterface = 280;
  private arqueiroPos: Ponto2D = { x: 130, y: 280 };
  private olhoPos: Ponto2D = { x: 132, y: 212 };

  private anguloMira = 0.52; // ~30 graus abaixo da horizontal
  private flecha: Flecha | null = null;
  private peixe: PeixeAlvo;
  private raioVisao: RaioVisao;

  private acertos = 0;
  private tentativas = 0;

  private estadoJogo: 'MIRANDO' | 'DISPARANDO' | 'ACERTOU' | 'ERROU' = 'MIRANDO';
  private feedbackTexto: {
    tipo: 'sucesso' | 'alerta' | 'info';
    titulo: string;
    subtitulo: string;
  } | null = null;

  private tempoInicio = performance.now();
  private ultimoTempo = performance.now();
  private pointerPressionado = false;

  constructor(canvas: HTMLCanvasElement, ui: MinigameUIElements) {
    this.canvas = canvas;
    this.ui = ui;

    this.peixe = this.gerarNovoPeixe();
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 800;
    this.raioVisao = calcularRaioVisaoEImagemAparente(
      { x: this.peixe.x, y: this.peixe.y },
      this.olhoPos,
      this.yInterface,
      1.0003,
      1.333,
      w,
    );

    this.vincularEventos();
    this.atualizarPlacarUI();
    this.definirFeedback(
      'info',
      '🏹 Mire e Dispare na Posição Real do Peixe!',
      'Dica: A refração faz o peixe parecer mais raso do que realmente está.',
    );
  }

  private gerarNovoPeixe(): PeixeAlvo {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 560;
    this.yInterface = h * 0.5;
    this.arqueiroPos = { x: 130, y: this.yInterface };
    this.olhoPos = { x: 132, y: this.yInterface - 68 };

    // Sorteia posição do peixe garantindo que tanto o peixe real quanto a imagem aparente
    // permaneçam confortavelmente dentro da área visível do minigame.
    const margemX = 75;
    const xMin = Math.min(w - 220, 340);
    const xMax = w - 120;
    const yMin = this.yInterface + 50;
    const yMax = Math.min(h - 70, this.yInterface + 180);

    let peixeX = 460;
    let peixeY = this.yInterface + 100;

    for (let tentativa = 0; tentativa < 20; tentativa++) {
      const candX = xMin + Math.random() * Math.max(60, xMax - xMin);
      const candY = yMin + Math.random() * (yMax - yMin);

      const rv = calcularRaioVisaoEImagemAparente(
        { x: candX, y: candY },
        this.olhoPos,
        this.yInterface,
        1.0003,
        1.333,
        w,
      );

      // Valida se a imagem aparente resultante fica dentro das margens visíveis do canvas
      if (rv.imagemAparente.x >= 240 && rv.imagemAparente.x <= w - margemX) {
        peixeX = candX;
        peixeY = candY;
        break;
      }
    }

    return {
      x: peixeX,
      y: peixeY,
      largura: 36,
      altura: 18,
      velocidadeX: 0, // Posição estática e fixa durante a rodada
      oscilacaoFase: Math.random() * Math.PI * 2,
    };
  }

  public iniciar(): void {
    if (this.ativo) return;
    this.ativo = true;
    this.ultimoTempo = performance.now();
    this.onResize();
    this.loop(performance.now());
  }

  public pausar(): void {
    this.ativo = false;
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  public onResize(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 800;
    const h = rect.height || 560;
    this.yInterface = h * 0.5;
    this.arqueiroPos = { x: 130, y: this.yInterface };
    this.olhoPos = { x: 132, y: this.yInterface - 68 };

    // Garante que o peixe fique dentro da água após redimensionamento
    this.peixe.y = Math.max(this.yInterface + 40, Math.min(h - 60, this.peixe.y));
    this.peixe.x = Math.max(300, Math.min(w - 120, this.peixe.x));

    this.recalcularOptica();
  }

  private vincularEventos(): void {
    // Slider de ângulo
    this.ui.sliderAngulo.addEventListener('input', () => {
      const graus = parseFloat(this.ui.sliderAngulo.value);
      this.anguloMira = (graus * Math.PI) / 180;
      this.ui.readoutAngulo.textContent = `${graus.toFixed(1)}°`;
    });

    // Botão disparar
    this.ui.btnDisparar.addEventListener('click', () => this.disparar());

    // Botão novo peixe
    this.ui.btnNovoPeixe.addEventListener('click', () => this.novoAlvo());

    // Interação com o Canvas: mirar com o mouse / toque
    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.ativo) return;
      this.pointerPressionado = true;
      this.atualizarMiraComPonto(e.clientX, e.clientY);
    });

    window.addEventListener('pointermove', (e) => {
      if (!this.ativo || !this.pointerPressionado) return;
      this.atualizarMiraComPonto(e.clientX, e.clientY);
    });

    window.addEventListener('pointerup', () => {
      this.pointerPressionado = false;
    });

    // Tecla Espaço para atirar
    window.addEventListener('keydown', (e) => {
      if (!this.ativo) return;
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        this.disparar();
      }
    });

    this.ui.checkOcultarGuia.addEventListener('change', () => {
      if (this.ui.checkOcultarGuia.checked) {
        this.definirFeedback(
          'alerta',
          '🎯 Guia Oculta',
          'Compense a refração no olho!',
        );
      } else {
        this.definirFeedback(
          'info',
          '🏹 Guia Ativa',
          'Linha reta orientando o disparo.',
        );
      }
    });
  }

  private atualizarMiraComPonto(clientX: number, clientY: number): void {
    if (this.estadoJogo === 'DISPARANDO') return;

    const rect = this.canvas.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    // Vetor do arco (ombro) até o cursor
    const ombroX = this.olhoPos.x - 2;
    const ombroY = this.olhoPos.y + 14;

    const dx = px - ombroX;
    const dy = py - ombroY;

    // Mira voltada para a frente e para baixo (na direção da água)
    if (dx > 20) {
      let ang = Math.atan2(dy, dx);
      // Limita a mira entre -15° e +75°
      ang = Math.max(-0.25, Math.min(1.3, ang));
      this.anguloMira = ang;

      const graus = (ang * 180) / Math.PI;
      this.ui.sliderAngulo.value = graus.toFixed(1);
      this.ui.readoutAngulo.textContent = `${graus.toFixed(1)}°`;
    }
  }

  public disparar(): void {
    if (this.estadoJogo === 'DISPARANDO') return;

    // Se a rodada anterior já encerrou (acertou ou errou), o disparo inicia o próximo peixe
    if (this.estadoJogo === 'ACERTOU' || this.estadoJogo === 'ERROU') {
      this.novoAlvo();
      return;
    }

    this.tentativas++;
    this.estadoJogo = 'DISPARANDO';
    this.ui.btnDisparar.disabled = true;

    // Flecha sai alinhada exatamente com a origem da linha guia
    const origemFlecha = calcularOrigemFlecha(this.olhoPos, this.anguloMira);
    this.flecha = criarFlecha(origemFlecha, this.anguloMira, 760);

    if (this.ui.checkOcultarGuia.checked) {
      this.definirFeedback(
        'info',
        '🏹 Flecha em voo...',
        'Indo até o alvo.',
      );
    } else {
      this.definirFeedback(
        'info',
        '🏹 Flecha em voo...',
        'A flecha segue reta; a luz do peixe não.',
      );
    }
  }

  public novoAlvo(): void {
    this.peixe = this.gerarNovoPeixe();
    this.flecha = null;
    this.estadoJogo = 'MIRANDO';
    this.ui.btnDisparar.disabled = false;
    this.ui.btnDisparar.innerHTML = '🏹 Disparar Flecha <kbd class="lab__kbd">Espaço</kbd>';
    this.recalcularOptica();
    if (this.ui.checkOcultarGuia.checked) {
      this.definirFeedback(
        'info',
        'Novo Alvo',
        'Mire abaixo da imagem aparente!',
      );
    } else {
      this.definirFeedback(
        'info',
        'Novo Peixe na Área!',
        'Mire onde o peixe REALMENTE está.',
      );
    }
  }

  private recalcularOptica(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width || 800;
    this.raioVisao = calcularRaioVisaoEImagemAparente(
      { x: this.peixe.x, y: this.peixe.y },
      this.olhoPos,
      this.yInterface,
      1.0003,
      1.333,
      w,
    );
  }

  private definirFeedback(tipo: 'sucesso' | 'alerta' | 'info', titulo: string, subtitulo: string): void {
    this.feedbackTexto = { tipo, titulo, subtitulo };

    this.ui.readoutFeedbackCard.className = `lab__game-feedback lab__game-feedback--${tipo}`;
    this.ui.readoutFeedbackCard.innerHTML = `
      <div class="lab__game-feedback-title">${titulo}</div>
      <div class="lab__game-feedback-sub">${subtitulo}</div>
    `;
  }

  private atualizarPlacarUI(): void {
    this.ui.readoutAcertos.textContent = this.acertos.toString();
    this.ui.readoutTentativas.textContent = this.tentativas.toString();

    const precisao = this.tentativas > 0 ? (this.acertos / this.tentativas) * 100 : 0;
    this.ui.readoutPrecisao.textContent = `${precisao.toFixed(0)}%`;
  }

  private loop = (tempoAgora: number): void => {
    if (!this.ativo) return;

    const dt = Math.min(0.05, (tempoAgora - this.ultimoTempo) / 1000);
    this.ultimoTempo = tempoAgora;
    const tempoRelativo = (tempoAgora - this.tempoInicio) / 1000;

    // 1. Atualiza animação do peixe (posição estática e fixa, apenas oscilação visual das barbatanas)
    this.peixe.oscilacaoFase += dt;

    // 2. Atualiza física da flecha se houver disparo
    if (this.flecha && this.flecha.ativa && this.estadoJogo === 'DISPARANDO') {
      const rect = this.canvas.getBoundingClientRect();
      const w = rect.width || 800;
      const h = rect.height || 560;
      atualizarFlecha(this.flecha, dt, this.yInterface, w, h);

      // Ponta da flecha
      const ponta: Ponto2D = {
        x: this.flecha.x,
        y: this.flecha.y,
      };

      const resultado = testarColisaoFlecha(
        ponta,
        { x: this.peixe.x, y: this.peixe.y },
        this.raioVisao.imagemAparente,
        21,
      );

      if (resultado === 'ACERTOU_REAL') {
        this.flecha.ativa = false;
        this.estadoJogo = 'ACERTOU';
        this.acertos++;
        this.atualizarPlacarUI();
        if (this.ui.checkOcultarGuia.checked) {
          this.definirFeedback('sucesso', '🎉 Na Mosca!', 'Acertou o peixe real!');
        } else {
          this.definirFeedback(
            'sucesso',
            '🎉 ACERTOU O PEIXE REAL!',
            'Você compensou a refração e acertou o peixe real!',
          );
        }
        this.ui.btnDisparar.disabled = false;
        this.ui.btnDisparar.innerHTML = '🐟 Próximo Peixe <kbd class="lab__kbd">Espaço</kbd>';
      } else if (resultado === 'ERROU_MIROU_APARENTE') {
        this.flecha.ativa = false;
        this.estadoJogo = 'ERROU';
        this.atualizarPlacarUI();
        if (this.ui.checkOcultarGuia.checked) {
          this.definirFeedback('alerta', '⚠ Mirou na Imagem Falsa!', 'O peixe real estava mais abaixo.');
        } else {
          this.definirFeedback(
            'alerta',
            '⚠ VOCÊ MIROU NA IMAGEM FALSA!',
            'O peixe real estava mais abaixo. A refração iludiu seus olhos!',
          );
        }
        this.ui.btnDisparar.disabled = false;
        this.ui.btnDisparar.innerHTML = '🐟 Próxima Tentativa <kbd class="lab__kbd">Espaço</kbd>';
      } else if (!this.flecha.ativa) {
        // Flecha sumiu do canvas sem acertar
        this.estadoJogo = 'ERROU';
        this.atualizarPlacarUI();
        if (this.ui.checkOcultarGuia.checked) {
          this.definirFeedback('alerta', 'Errou o Alvo', 'Peixe revelado mais abaixo.');
        } else {
          this.definirFeedback(
            'alerta',
            'Errou o Alvo',
            'O peixe real estava mais abaixo. Tente novamente!',
          );
        }
        this.ui.btnDisparar.disabled = false;
        this.ui.btnDisparar.innerHTML = '🐟 Próxima Tentativa <kbd class="lab__kbd">Espaço</kbd>';
      }
    }

    // 3. Renderiza a cena gráfica no Canvas
    // O peixe real é revelado SOMENTE quando a rodada encerra (acertou ou errou)
    const exibirPeixeReal = this.estadoJogo === 'ACERTOU' || this.estadoJogo === 'ERROU';

    renderMinigameScene({
      canvas: this.canvas,
      yInterface: this.yInterface,
      arqueiroPos: this.arqueiroPos,
      olhoPos: this.olhoPos,
      anguloMira: this.anguloMira,
      flecha: this.flecha,
      peixe: this.peixe,
      raioVisao: this.raioVisao,
      exibirPeixeReal,
      exibirLinhaGuia: !this.ui.checkOcultarGuia.checked,
      tempo: tempoRelativo,
      feedbackTexto: this.feedbackTexto,
    });

    this.animFrameId = requestAnimationFrame(this.loop);
  };
}

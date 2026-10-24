export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'ic_labs_theme';

/**
 * Retorna o tema atualmente ativo ('light' ou 'dark').
 */
export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') {
    return stored;
  }
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

/**
 * Aplica o tema no elemento raiz <html> e salva no localStorage.
 */
export function setTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Caso o localStorage esteja desabilitado
  }
  atualizarBotoesTema(theme);
  window.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
}

/**
 * Alterna entre 'light' e 'dark'.
 */
export function toggleTheme(): Theme {
  const current = getTheme();
  const next: Theme = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Atualiza o conteúdo visual dos botões de alternância de tema presentes no DOM.
 */
function atualizarBotoesTema(theme: Theme): void {
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  for (const btn of buttons) {
    const isDark = theme === 'dark';
    btn.setAttribute('aria-label', isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    btn.setAttribute('title', isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro');
    btn.innerHTML = isDark
      ? '<span aria-hidden="true">☀️</span>'
      : '<span aria-hidden="true">🌙</span>';
  }
}

/**
 * Inicializa o gerenciador de tema, registrando ouvintes nos botões de alternância.
 */
export function initTheme(onThemeChange?: (theme: Theme) => void): Theme {
  const initialTheme = getTheme();
  document.documentElement.setAttribute('data-theme', initialTheme);
  atualizarBotoesTema(initialTheme);

  // Registra clique em todos os botões com data-theme-toggle
  const buttons = document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]');
  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      toggleTheme();
    });
  }

  // Ouve mudanças disparadas internamente
  if (onThemeChange) {
    window.addEventListener('themechange', ((e: CustomEvent<{ theme: Theme }>) => {
      onThemeChange(e.detail.theme);
    }) as EventListener);
  }

  // Ouve mudanças do sistema operacional se o usuário não tiver preferência explícita salva
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', (e) => {
      const explicit = localStorage.getItem(STORAGE_KEY);
      if (!explicit) {
        setTheme(e.matches ? 'dark' : 'light');
      }
    });
  }

  return initialTheme;
}

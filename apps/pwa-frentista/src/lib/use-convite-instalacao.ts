import { useCallback, useEffect, useState } from 'react';
import { type Convite, decidirConvite, detectarPlataforma, jaInstalado } from './instalacao';

/**
 * `beforeinstallprompt` não existe no lib.dom do TypeScript porque não é padrão
 * — é do Chromium. Declarar aqui é o jeito de tipar sem `any`.
 */
interface EventoDeInstalacao extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Safari do iOS expõe `standalone`; nenhum outro navegador tem. */
type NavegadorComStandalone = Navigator & { standalone?: boolean };

const CHAVE_DISPENSA = 'posto:convite-instalacao-dispensado';

function leuDispensa(): boolean {
  try {
    return localStorage.getItem(CHAVE_DISPENSA) === '1';
  } catch {
    // Safari em aba privada joga exceção só de tocar no localStorage. Preferir
    // mostrar o convite a quebrar a tela.
    return false;
  }
}

/**
 * Liga a decisão pura de `instalacao.ts` aos sinais reais do navegador.
 *
 * @remarks A View não conhece `beforeinstallprompt`, `matchMedia` nem iPad —
 *          só recebe qual dos três convites desenhar.
 */
export function useConviteInstalacao() {
  const [promptNativo, setPromptNativo] = useState<EventoDeInstalacao | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [dispensado, setDispensado] = useState(leuDispensa);

  useEffect(() => {
    const conferirInstalado = () =>
      setInstalado(
        jaInstalado({
          standalonePorMedia: window.matchMedia('(display-mode: standalone)').matches,
          standalonePorNavigator: (navigator as NavegadorComStandalone).standalone === true,
        }),
      );

    conferirInstalado();

    const aoOferecerInstalacao = (evento: Event) => {
      // Sem isto o Chrome mostra a própria barrinha dele, e ficam dois convites
      // na tela dizendo a mesma coisa.
      evento.preventDefault();
      setPromptNativo(evento as EventoDeInstalacao);
    };

    const aoInstalar = () => {
      setInstalado(true);
      setPromptNativo(null);
    };

    const media = window.matchMedia('(display-mode: standalone)');

    window.addEventListener('beforeinstallprompt', aoOferecerInstalacao);
    window.addEventListener('appinstalled', aoInstalar);
    media.addEventListener('change', conferirInstalado);

    return () => {
      window.removeEventListener('beforeinstallprompt', aoOferecerInstalacao);
      window.removeEventListener('appinstalled', aoInstalar);
      media.removeEventListener('change', conferirInstalado);
    };
  }, []);

  const dispensar = useCallback(() => {
    setDispensado(true);
    try {
      localStorage.setItem(CHAVE_DISPENSA, '1');
    } catch {
      // Aba privada: some nesta sessão e volta na próxima. Melhor que quebrar.
    }
  }, []);

  const instalar = useCallback(async () => {
    if (!promptNativo) return;

    await promptNativo.prompt();
    const { outcome } = await promptNativo.userChoice;

    // O evento é de uso único: depois de chamado, o navegador não deixa
    // reaproveitar. Descartar evita um segundo clique que não faz nada.
    setPromptNativo(null);
    if (outcome === 'dismissed') dispensar();
  }, [promptNativo, dispensar]);

  const convite: Convite = decidirConvite({
    plataforma: detectarPlataforma(navigator.userAgent, navigator.maxTouchPoints),
    instalado,
    temPromptNativo: promptNativo !== null,
    dispensado,
  });

  return { convite, instalar, dispensar };
}

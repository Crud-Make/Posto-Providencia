import { useCallback, useEffect, useState } from 'react';
import {
  type Convite,
  decidirConvite,
  detectarPlataforma,
  ehSafari,
  jaInstalado,
} from './instalacao';

const MEDIA_APP_INSTALADO = '(display-mode: standalone)';

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
    const media = window.matchMedia(MEDIA_APP_INSTALADO);

    const conferirInstalado = () =>
      setInstalado(
        jaInstalado({
          standalonePorMedia: media.matches,
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
    await promptNativo.userChoice;

    // O evento é de uso único: depois de chamado, o navegador não deixa
    // reaproveitar. Descartar o evento já esconde o convite nesta sessão.
    //
    // Cancelar o diálogo do sistema NÃO grava dispensa permanente: quem toca
    // "Instalar agora" e desiste quer decidir depois, não sumir com o convite
    // para sempre. Só o X explícito persiste.
    setPromptNativo(null);
  }, [promptNativo]);

  const convite: Convite = decidirConvite({
    plataforma: detectarPlataforma(navigator.userAgent, navigator.maxTouchPoints),
    safariNoIos: ehSafari(navigator.userAgent),
    instalado,
    temPromptNativo: promptNativo !== null,
    dispensado,
  });

  return { convite, instalar, dispensar };
}

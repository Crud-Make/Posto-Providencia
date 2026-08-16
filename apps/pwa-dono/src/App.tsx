import EncerranteScreen from './screens/EncerranteScreen';
import ReloadPrompt from './components/ReloadPrompt';

/**
 * App do dono — uma tela só: a leitura das bombas.
 *
 * @remarks Sem rota e sem seleção de frentista, e os dois de propósito. O
 *          encerrante é a leitura da BOMBA: a tabela `Leitura` não tem coluna
 *          de frentista, e o plano original do OCR já tratava o encerrante
 *          como responsabilidade do dono (ver
 *          `.claude/docs/ocr-encerrante-plano-original.md`). Ter nascido na
 *          aba do PWA do frentista foi o desvio que este app corrige.
 *
 *          `onVoltar` não tem para onde voltar — é a tela raiz. Recarregar é o
 *          gesto mais próximo de "começar de novo" que faz sentido aqui, e
 *          mantém a prop da tela sem inventar navegação que não existe.
 */
export default function App() {
    return (
        <>
            <EncerranteScreen onVoltar={() => window.location.reload()} />
            <ReloadPrompt />
        </>
    );
}

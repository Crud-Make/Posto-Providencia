import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ConviteInstalacao from './components/convite-instalacao';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Montado aqui, e não no App: o App tem 7 caminhos de retorno — foi assim
        que o ReloadPrompt acabou repetido 7 vezes. Sendo sobreposição fixa,
        montar uma vez na raiz cobre todas as telas. */}
    <ConviteInstalacao />
  </StrictMode>,
);

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import ConviteInstalacao from './components/convite-instalacao';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    {/* Sobreposição fixa: monta uma vez na raiz, fora do App. */}
    <ConviteInstalacao />
  </StrictMode>,
);

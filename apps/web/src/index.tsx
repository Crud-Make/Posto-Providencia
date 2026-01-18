// [09/01 20:02] Ponto de entrada do aplicativo.
/**
 * Inicialização do React e montagem do componente App.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  throw new Error("Não foi possível encontrar o elemento raiz 'root'.");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
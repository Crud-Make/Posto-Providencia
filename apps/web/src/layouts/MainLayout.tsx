import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import BarraLateral from '../components/BarraLateral';
import Cabecalho from '../components/Cabecalho';

// [14/01 06:50] Criado Layout Principal para suportar React Router.
// Contém a lógica de Sidebar e Header.

const MainLayout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-200">

      {/* Overlay Backdrop para Mobile */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Barra Lateral (Desktop + Mobile Drawer) */}
      <BarraLateral
        onClose={() => setIsMobileMenuOpen(false)}
        className={`
          ${isMobileMenuOpen ? 'flex fixed inset-y-0 left-0 z-50 shadow-xl' : 'hidden'} 
          lg:flex lg:static lg:shadow-none lg:h-screen lg:sticky lg:top-0
        `}
      />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Cabeçalho para Mobile */}
        <div className="lg:hidden">
          <Cabecalho
            onMobileMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          />
        </div>

        {/* Conteúdo Principal (Outlet do Router) */}
        <main className="flex-1 overflow-y-auto w-full custom-scrollbar">
          <div className="w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default MainLayout;

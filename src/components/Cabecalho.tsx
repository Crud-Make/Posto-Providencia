import React from 'react';
import { Fuel, Menu, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import PostoSelector from './common/PostoSelector';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

// [14/01 06:45] Refatorado para usar React Router (Link).
// Removido currentView e onNavigate, pois a navegação é via URL.

/**
 * Componente de Cabeçalho (Header) do Dashboard.
 * 
 * @param onMobileMenuToggle - Função para abrir/fechar o menu mobile (Side Drawer).
 * 
 * Contém a identificação do posto ativo, troca de tema e menu hambúrguer para dispositivos móveis.
 */
const Cabecalho: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 transition-colors duration-200">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">

        <div className="flex items-center gap-3">
          <button
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden text-gray-600 dark:text-gray-300"
            onClick={onMobileMenuToggle}
          >
            <Menu size={24} />
          </button>

          <div className="flex items-center gap-2">
            <Link
              to="/dashboard"
              className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white cursor-pointer hover:bg-blue-700 transition-colors"
            >
              <Fuel size={18} />
            </Link>
            <PostoSelector />
          </div>
        </div>

        <div className="flex items-center gap-2 text-gray-500">
          <button
            onClick={toggleTheme}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 transition-colors"
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
};

export default Cabecalho;

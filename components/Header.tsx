import React, { useState } from 'react';
import { Fuel, Menu, X, Sun, Moon } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import PostoSelector from './PostoSelector';

interface HeaderProps {
  currentView: 'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'clients' | 'daily_report' | 'expenses' | 'ai_strategy' | 'owner_dashboard' | 'baratencia';
  onNavigate: (view: 'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'clients' | 'daily_report' | 'expenses' | 'ai_strategy' | 'owner_dashboard' | 'baratencia') => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const handleMobileNavigate = (view: any) => {
    onNavigate(view);
    setIsMenuOpen(false);
  }

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50 transition-colors duration-200">
      <div className="px-4 sm:px-6 h-16 flex items-center justify-between">

        <div className="flex items-center gap-3">
          <button
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg lg:hidden text-gray-600 dark:text-gray-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white cursor-pointer"
              onClick={() => onNavigate('dashboard')}
            >
              <Fuel size={18} />
            </div>
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
          {/* No user avatar needed anymore */}
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="absolute top-16 left-0 right-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-xl p-4 flex flex-col gap-2 lg:hidden animate-in slide-in-from-top-5">
          {[
            { id: 'owner_dashboard', label: 'Visão Proprietário' },
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'closing', label: 'Vendas' },
            { id: 'daily_report', label: 'Relatório Diário' },
            { id: 'purchase', label: 'Compras' },
            { id: 'attendants', label: 'Frentistas' },
            { id: 'clients', label: 'Clientes / Fiado' },
            { id: 'baratencia', label: 'Baratência' },
            { id: 'inventory', label: 'Tanques (Combustível)' },
            { id: 'products', label: 'Produtos e Estoque' },
            { id: 'finance', label: 'Empréstimos' },
            { id: 'expenses', label: 'Gestão de Despesas' },
            { id: 'solvency', label: 'Painel de Solvência' },
            { id: 'settings', label: 'Configurações' },
            { id: 'schedule', label: 'Escala e Folgas' },
            { id: 'ai_strategy', label: 'Estrategista IA' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => handleMobileNavigate(item.id)}
              className={`w-full text-left px-4 py-3 rounded-lg text-sm font-bold
                  ${currentView === item.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }
                `}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

export default Header;

import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Banknote,
  Settings,
  Fuel,
  ShoppingBag,
  ClipboardList,
  Sun,
  Moon,
  Calendar,
  Crown
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onClose?: () => void;
  className?: string;
}

// [14/01 06:40] Refatorado para usar React Router (NavLink) em vez de estado manual.
// Removemos currentView e onNavigate, pois a rota define o estado ativo.

/**
 * Componente de Menu Lateral (Sidebar) do Dashboard.
 * 
 * @param onClose - Função opcional para fechar o menu (usado no mobile).
 * @param className - Classes CSS opcionais adicionais.
 * 
 * Responsável pela navegação principal entre os módulos do sistema.
 */
const BarraLateral: React.FC<SidebarProps> = ({ onClose, className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { path: '/proprietario', label: 'Visão Proprietário', icon: Crown },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/fechamento', label: 'Fechamento de Caixa', icon: ShoppingCart },
    { path: '/relatorio-diario', label: 'Relatório Diário', icon: ClipboardList },
    { path: '/compras', label: 'Compras', icon: ShoppingBag },
    { path: '/frentistas', label: 'Frentistas', icon: Users },
    { path: '/clientes', label: 'Clientes / Fiado', icon: Users },
    { path: '/estoque/tanques', label: 'Tanques (Combustível)', icon: Fuel },
    { path: '/estoque/produtos', label: 'Produtos e Estoque', icon: Package },
    { path: '/financeiro', label: 'Empréstimos', icon: Banknote },
    { path: '/despesas', label: 'Gestão de Despesas', icon: ShoppingBag },
    { path: '/escalas', label: 'Escala e Folgas', icon: Calendar },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <>
      <aside className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-screen overflow-y-auto sticky top-0 z-40 transition-transform duration-200 ${className}`}>
        {/* Logo & Close Button */}
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Fuel size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-900 dark:text-white leading-tight">Posto Providência</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Gestão Integrada</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              <Users size={24} className="sr-only" />
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${isActive
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon
                    size={20}
                    className={isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
                  />
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            <span>Modo {theme === 'light' ? 'Escuro' : 'Claro'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default BarraLateral;

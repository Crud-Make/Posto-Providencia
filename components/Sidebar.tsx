import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Banknote,
  Settings,
  Fuel,
  LogOut,
  ShoppingBag,
  ClipboardList,
  BarChart2,
  Sun,
  Moon,
  Calendar,
  Target,
  Building2,
  BrainCircuit
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  currentView: 'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'postos' | 'clients' | 'daily_report' | 'expenses' | 'ai_strategy';
  onNavigate: (view: 'dashboard' | 'closing' | 'inventory' | 'products' | 'purchase' | 'finance' | 'solvency' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings' | 'schedule' | 'postos' | 'clients' | 'daily_report' | 'expenses' | 'ai_strategy') => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, className = '' }) => {
  const { theme, toggleTheme } = useTheme();

  const menuItems = [
    { id: 'ai_strategy', label: 'Estrategista IA', icon: BrainCircuit },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'closing', label: 'Fechamento de Caixa', icon: ShoppingCart },
    { id: 'daily_report', label: 'Relatório Diário', icon: ClipboardList },
    { id: 'purchase', label: 'Compras', icon: ShoppingBag },
    { id: 'attendants', label: 'Frentistas', icon: Users },
    { id: 'clients', label: 'Clientes / Fiado', icon: Users },
    { id: 'inventory', label: 'Tanques (Combustível)', icon: Fuel },
    { id: 'products', label: 'Produtos e Estoque', icon: Package },
    { id: 'finance', label: 'Empréstimos', icon: Banknote },
    { id: 'expenses', label: 'Gestão de Despesas', icon: ShoppingBag },
    { id: 'solvency', label: 'Painel de Solvência', icon: Target },
    { id: 'schedule', label: 'Escala e Folgas', icon: Calendar },
    { id: 'postos', label: 'Gerenciar Postos', icon: Building2 },
  ] as const;

  return (
    <aside className={`w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-screen sticky top-0 z-40 transition-colors duration-200 ${className}`}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Fuel size={24} />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 dark:text-white leading-tight">Posto Providência</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">Gestão Integrada</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
              ${currentView === item.id
                ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            <item.icon
              size={20}
              className={currentView === item.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}
            />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          <span>Mode {theme === 'light' ? 'Escuro' : 'Claro'}</span>
        </button>
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-[#E0D0B8] flex items-center justify-center overflow-hidden border-2 border-white dark:border-gray-600 shadow-sm">
            <img src="https://ui-avatars.com/api/?name=Admin+Gerente&background=E0D0B8&color=fff" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Admin Gerente</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@posto.com.br</p>
          </div>
          <LogOut size={16} className="text-gray-400 dark:text-gray-500 group-hover:text-red-500 dark:group-hover:text-red-400 transition-colors" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
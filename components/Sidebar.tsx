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
  BarChart2
} from 'lucide-react';

interface SidebarProps {
  currentView: 'dashboard' | 'closing' | 'inventory' | 'purchase' | 'finance' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings';
  onNavigate: (view: 'dashboard' | 'closing' | 'inventory' | 'purchase' | 'finance' | 'analysis' | 'readings' | 'reports' | 'sales_dashboard' | 'attendants' | 'settings') => void;
  className?: string;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate, className = '' }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'closing', label: 'Vendas', icon: ShoppingCart },
    { id: 'purchase', label: 'Compras', icon: ShoppingBag },
    { id: 'attendants', label: 'Frentistas', icon: Users },
    { id: 'inventory', label: 'Estoque', icon: Package },
    { id: 'finance', label: 'Financeiro', icon: Banknote },
    { id: 'analysis', label: 'Análise de Custos', icon: BarChart2 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <aside className={`w-64 bg-white border-r border-gray-200 flex-col h-screen sticky top-0 z-40 transition-colors duration-200 ${className}`}>
      {/* Logo */}
      <div className="p-6 flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
          <Fuel size={24} />
        </div>
        <div>
          <h1 className="font-bold text-gray-900 leading-tight">Posto Providência</h1>
          <p className="text-xs text-gray-500">Gestão Integrada</p>
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
                ? 'bg-blue-50 text-blue-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }
            `}
          >
            <item.icon
              size={20}
              className={currentView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
            />
            {item.label}
          </button>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer group">
          <div className="w-10 h-10 rounded-full bg-[#E0D0B8] flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
            <img src="https://ui-avatars.com/api/?name=Admin+Gerente&background=E0D0B8&color=fff" alt="Admin" className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">Admin Gerente</p>
            <p className="text-xs text-gray-500 truncate">admin@posto.com.br</p>
          </div>
          <LogOut size={16} className="text-gray-400 group-hover:text-red-500 transition-colors" />
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
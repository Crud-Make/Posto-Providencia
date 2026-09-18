import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Settings,
  Fuel,
  ShoppingBag,
  ClipboardList,
  Sun,
  Moon,
  Calendar,
  Crown,
  Table2,
  Menu,
  LogOut,
  Calculator
} from 'lucide-react';
import { useTheme } from '../contexts/useTheme';
import { useAuth } from '../contexts/useAuth';
import { NavLink } from 'react-router-dom';

interface SidebarProps {
  onClose?: () => void;
  className?: string;
  /** Barra recolhida à faixa de ícones. Só tem efeito de `lg` (1024px) para cima. */
  recolhida?: boolean;
  /** Alterna entre barra completa e faixa de ícones. Sem isso o ☰ não é renderizado. */
  onAlternarRecolhida?: () => void;
}

// [14/01 06:40] Refatorado para usar React Router (NavLink) em vez de estado manual.
// Removemos currentView e onNavigate, pois a rota define o estado ativo.

/**
 * Componente de Menu Lateral (Sidebar) do Dashboard.
 * 
 * @param onClose - Função opcional para fechar o menu (usado no mobile).
 * @param className - Classes CSS opcionais adicionais.
 * @param recolhida - Recolhe a barra à faixa de ícones no desktop.
 * @param onAlternarRecolhida - Alterna recolhida/completa (botão ☰).
 *
 * Responsável pela navegação principal entre os módulos do sistema.
 *
 * @remarks [31/07] O recolhimento é aplicado só com prefixo `lg:`. Abaixo de 1024px a
 *          barra é o drawer mobile, que ocupa a tela inteira e já tem seu próprio X —
 *          recolher ali viraria uma faixa de ícones sobre um fundo escuro, sem ganho.
 */
const BarraLateral: React.FC<SidebarProps> = ({ onClose, className = '', recolhida = false, onAlternarRecolhida }) => {
  const { theme, toggleTheme } = useTheme();
  const { autenticado, sair } = useAuth();

  // Recolhida, a barra vira faixa de ícones. Antes isto eram 16 ternários de
  // `recolhida` espalhados pelo JSX — um por slot de estilo —, e cada um contava
  // para a complexidade da função (CCN 22, acima do teto de 20 do gate). A decisão
  // é uma só, então é tomada uma vez; o JSX só consome o resultado.
  const estreita = recolhida
    ? {
      aside: 'lg:w-16',
      cabecalho: 'lg:p-3 lg:justify-center',
      marca: 'lg:hidden',
      nav: 'lg:px-2',
      item: 'lg:justify-center lg:px-0 lg:gap-0',
      rotulo: 'lg:hidden',
      rodape: 'lg:p-2',
    }
    : { aside: '', cabecalho: '', marca: '', nav: '', item: '', rotulo: '', rodape: '' };

  // Tooltip nativa só faz sentido quando o rótulo sumiu da tela.
  const dica = (texto: string) => (recolhida ? texto : undefined);

  const modoAlvo = theme === 'light' ? 'Escuro' : 'Claro';

  // Definição dos itens do menu lateral
  const menuItems = [
    { path: '/proprietario', label: 'Visão Proprietário', icon: Crown },
    // A planilha do posto tem tela própria: são três tabelas densas, uma leitura
    // diferente dos cartões de acompanhamento da Visão Proprietário.
    { path: '/planilha', label: 'Planilha do Mês', icon: Table2 },
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/fechamento', label: 'Fechamento de Caixa', icon: ShoppingCart },
    { path: '/relatorio-diario', label: 'Relatório Diário', icon: ClipboardList },
    { path: '/compras', label: 'Compras', icon: ShoppingBag },
    // [03/09] Estava fora do menu — só se chegava digitando a URL, e a tela passou
    // semanas quebrada sem ninguém notar. Custo da compra do mês + simulador de preço.
    { path: '/analise-custos', label: 'Análise de Custos', icon: Calculator },
    { path: '/frentistas', label: 'Frentistas', icon: Users },
    { path: '/clientes', label: 'Clientes / Fiado', icon: Users },
    { path: '/estoque/tanques', label: 'Tanques (Combustível)', icon: Fuel },
    { path: '/estoque/produtos', label: 'Produtos e Estoque', icon: Package },
    // [31/07] "Gestão Financeira" (/financeiro) saiu daqui: virou a aba "Receitas e Despesas"
    // dentro de Fechamento de Caixa, onde o caixa já é conferido. A rota antiga redireciona.
    { path: '/escalas', label: 'Escala e Folgas', icon: Calendar },
    { path: '/configuracoes', label: 'Configurações', icon: Settings },
  ] as const;

  return (
    <>
      <aside className={`w-64 ${estreita.aside} bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-col h-screen overflow-y-auto overflow-x-hidden sticky top-0 z-40 transition-[width,transform] duration-200 ${className}`}>
        {/* Logo, botão de recolher (desktop) e botão de fechar (mobile) */}
        <div className={`p-6 flex items-center justify-between ${estreita.cabecalho}`}>
          {/* A marca do posto (mesma do login e da aba). O PNG tem fundo branco, então vai
              num tile branco de propósito — no modo escuro vira um cartão, não um recorte. */}
          <div className={`flex items-center ${estreita.marca}`}>
            <h1 className="bg-white rounded-lg px-2 py-1 shadow-sm ring-1 ring-gray-200 dark:ring-gray-600">
              <img
                src="/marca-posto@2x.png"
                alt="Posto Providência"
                className="h-10 w-auto"
                draggable={false}
              />
            </h1>
          </div>
          {onAlternarRecolhida && (
            <button
              onClick={onAlternarRecolhida}
              // `hidden lg:flex`: no mobile quem fecha é o X ao lado, não este botão.
              className="hidden lg:flex p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={recolhida ? 'Expandir menu' : 'Recolher menu'}
              aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!recolhida}
            >
              <Menu size={20} />
            </button>
          )}
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
        <nav className={`flex-1 px-4 py-6 space-y-1 ${estreita.nav}`}>
          {menuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              // Recolhida, o rótulo some da tela — o `title` é o que sobra para
              // identificar o ícone (tooltip nativa, sem dependência de tooltip).
              title={dica(item.label)}
              className={({ isActive }) => `
                w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                ${estreita.item}
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
                    className={`shrink-0 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300'}`}
                  />
                  <span className={estreita.rotulo}>{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className={`p-4 border-t border-gray-200 dark:border-gray-700 mt-auto ${estreita.rodape}`}>
          <button
            onClick={toggleTheme}
            title={dica(`Modo ${modoAlvo}`)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${estreita.item}`}
          >
            {theme === 'light' ? <Moon size={18} className="shrink-0" /> : <Sun size={18} className="shrink-0" />}
            <span className={estreita.rotulo}>Modo {modoAlvo}</span>
          </button>

          {/* `sair()` existia no AuthContext desde o início e nunca teve porta
              na interface: dava para entrar no painel e não dava para largar
              dele. */}
          {autenticado && (
            <button
              onClick={() => { void sair(); onClose?.(); }}
              title={dica('Sair da conta')}
              className={`mt-1 w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-700 dark:hover:text-red-400 transition-colors ${estreita.item}`}
            >
              <LogOut size={18} className="shrink-0" />
              <span className={estreita.rotulo}>Sair</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};

export default BarraLateral;

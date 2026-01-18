import React from 'react';
import { AlertTriangle, TrendingUp } from 'lucide-react';

interface FuelTankProps {
  name: string;
  productName: string;
  productColor?: string;
  capacity: number;
  currentVolume: number;
  status?: 'ok' | 'warning' | 'critical';
}

const FuelTank: React.FC<FuelTankProps> = ({
  name,
  productName,
  productColor,
  capacity,
  currentVolume
}) => {
  const percentage = capacity > 0 ? Math.min(Math.max((currentVolume / capacity) * 100, 0), 100) : 0;

  // Cores baseadas no produto ou status
  const getColor = () => {
    // Mapeamento simples de cores se vierem nomes
    if (productColor) return productColor;
    const lowerName = productName.toLowerCase();
    if (lowerName.includes('gasolina') && lowerName.includes('aditivada')) return '#3B82F6'; // Blue (Aditivada Premium)
    if (lowerName.includes('gasolina')) return '#F87171'; // Lighter Red (Comum)
    if (lowerName.includes('etanol')) return '#10B981'; // Green
    if (lowerName.includes('diesel') && lowerName.includes('s-10')) return '#F59E0B'; // Amber (S10)
    if (lowerName.includes('diesel')) return '#D97706'; // Darker Amber (S500)
    return '#6B7280'; // Gray default
  };

  const color = getColor();

  // Define status colors for borders/text based on fill level
  const isLow = percentage < 15;
  const statusColor = isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center relative overflow-hidden transition-all hover:shadow-lg">
      <div className="w-full flex justify-between items-start mb-4">
        <div className="text-left">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[180px]" title={name}>{name}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {productName}
          </span>
        </div>
        {isLow && (
          <div className="animate-pulse text-red-500" title="Nível Crítico">
            <AlertTriangle size={20} />
          </div>
        )}
      </div>

      {/* Visualização do Tanque */}
      <div className="relative w-32 h-44 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden mb-4 shadow-inner">
        {/* Líquido */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out flex items-end justify-center backdrop-blur-sm"
          style={{
            height: `${percentage}%`,
            backgroundColor: color,
            opacity: 0.85
          }}
        >
          <div className="w-full h-1 bg-white/30 absolute top-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>

        {/* Marcações de Régua */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 pointer-events-none">
          {[100, 75, 50, 25, 0].map(mark => (
            <div key={mark} className="flex items-center w-full opacity-50">
              <span className="text-[9px] text-gray-400 w-6 text-right pr-1 font-mono">{mark}%</span>
              <div className="h-[1px] bg-gray-400 w-2"></div>
            </div>
          ))}
        </div>

        {/* Overlay Texto */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-xl font-bold font-mono drop-shadow-md ${percentage > 50 ? 'text-white' : 'text-gray-500'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-center w-full">
        <div className={`text-2xl font-bold font-mono ${statusColor}`}>
          {currentVolume.toLocaleString('pt-BR')} L
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pb-4 border-b border-gray-100 dark:border-gray-700">
          Capacidade: {capacity.toLocaleString('pt-BR')} L
        </div>
      </div>

      {/* Indicador de Espaço Vazio */}
      <div className="mt-4 w-full flex justify-between text-xs">
        <span className="text-gray-500 flex items-center gap-1">
          <TrendingUp size={12} className="text-green-500" />
          Espaço Livre:
        </span>
        <span className="font-bold text-green-600 dark:text-green-400 font-mono">
          {(capacity - currentVolume).toLocaleString('pt-BR')} L
        </span>
      </div>
    </div>
  );
};

export default FuelTank;

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  trendValue: string;
  trendLabel: string;
  isNegativeTrend?: boolean;
  Icon: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  alert?: boolean;
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trendValue,
  trendLabel,
  isNegativeTrend,
  Icon,
  iconBgColor = 'bg-gray-50',
  iconColor = 'text-gray-400',
  alert
}) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-between h-40 shadow-sm relative overflow-hidden group hover:shadow-md transition-all duration-200">
      {alert && (
        <div className="absolute right-0 top-0 p-4 opacity-10">
          <AlertTriangle size={80} className="text-red-500" />
        </div>
      )}

      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${iconBgColor} ${iconColor}`}>
          <Icon size={24} />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm mt-4">
        <span className={`flex items-center font-semibold ${isNegativeTrend ? 'text-red-500' : 'text-green-500'} ${alert ? 'text-red-600' : ''}`}>
          {isNegativeTrend ? <TrendingDown size={16} className="mr-1" /> : <TrendingUp size={16} className="mr-1" />}
          {trendValue}
        </span>
        <span className="text-gray-400 dark:text-gray-500 text-xs">{trendLabel}</span>
      </div>
    </div>
  );
};

export default KPICard;
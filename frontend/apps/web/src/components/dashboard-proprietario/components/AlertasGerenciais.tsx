import React from 'react';
import { AlertTriangle, Info, CheckCircle, XCircle } from 'lucide-react';
import { AlertaDashboard } from '../types';

interface AlertasGerenciaisProps {
  alertas: AlertaDashboard[];
}

export const AlertasGerenciais: React.FC<AlertasGerenciaisProps> = ({ alertas }) => {
  const getAlertConfig = (type: AlertaDashboard['type']) => {
    switch (type) {
      case 'warning':
        return {
          bg: 'bg-amber-50 dark:bg-amber-900/20',
          border: 'border-amber-200 dark:border-amber-800',
          icon: AlertTriangle,
          iconColor: 'text-amber-500',
          textColor: 'text-amber-800 dark:text-amber-200'
        };
      case 'danger':
        return {
          bg: 'bg-red-50 dark:bg-red-900/20',
          border: 'border-red-200 dark:border-red-800',
          icon: XCircle,
          iconColor: 'text-red-500',
          textColor: 'text-red-800 dark:text-red-200'
        };
      case 'success':
        return {
          bg: 'bg-emerald-50 dark:bg-emerald-900/20',
          border: 'border-emerald-200 dark:border-emerald-800',
          icon: CheckCircle,
          iconColor: 'text-emerald-500',
          textColor: 'text-emerald-800 dark:text-emerald-200'
        };
      default:
        return {
          bg: 'bg-blue-50 dark:bg-blue-900/20',
          border: 'border-blue-200 dark:border-blue-800',
          icon: Info,
          iconColor: 'text-blue-500',
          textColor: 'text-blue-800 dark:text-blue-200'
        };
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <AlertTriangle className="w-5 h-5 text-amber-500" />
        Alertas & Insights
      </h2>
      <div className="space-y-3">
        {alertas.map((alert, index) => {
          const config = getAlertConfig(alert.type);
          const Icon = config.icon;
          
          return (
            <div
              key={index}
              className={`flex items-center gap-3 p-4 rounded-xl border ${config.bg} ${config.border} animate-in fade-in slide-in-from-bottom-2 duration-300`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 ${config.iconColor}`} />
              <div className="flex-1">
                <span className={`font-medium ${config.textColor}`}>{alert.posto}:</span>{' '}
                <span className="text-gray-700 dark:text-gray-300">{alert.message}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

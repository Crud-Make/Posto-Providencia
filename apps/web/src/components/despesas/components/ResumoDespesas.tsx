import React from 'react';
import { Clock, CheckCircle2 } from 'lucide-react';
import KPICard from '../../dashboard/components/KPICard';

interface ResumoDespesasProps {
    stats: {
        totalPending: number;
        totalPaidThisMonth: number;
        countPending: number;
    };
    formatCurrency: (value: number) => string;
}

const ResumoDespesas: React.FC<ResumoDespesasProps> = ({ stats, formatCurrency }) => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <KPICard
                title="Total Pendente"
                value={formatCurrency(stats.totalPending)}
                trendValue={stats.countPending.toString()}
                trendLabel="despesas pendentes"
                isNegativeTrend={stats.totalPending > 0}
                Icon={Clock}
                iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                iconColor="text-orange-600 dark:text-orange-400"
            />
            <KPICard
                title="Pago este Mês"
                value={formatCurrency(stats.totalPaidThisMonth)}
                trendValue="R$"
                trendLabel="pago no mês atual"
                Icon={CheckCircle2}
                iconBgColor="bg-green-50 dark:bg-green-900/20"
                iconColor="text-green-600 dark:text-green-400"
            />
        </div>
    );
};

export default ResumoDespesas;

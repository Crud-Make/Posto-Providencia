// [10/01 08:56] Componente de consultor chat IA
import React, { useState } from 'react';
import { Brain, Send } from 'lucide-react';
import { DashboardMetrics, StockAlert, AttendantPerformance } from '../types';
import { formatCurrency } from '../utils';

interface ConsultorChatIAProps {
    metrics: DashboardMetrics | null;
    stockAlerts: StockAlert[];
    topPerformers: AttendantPerformance[];
}

export const ConsultorChatIA: React.FC<ConsultorChatIAProps> = ({ metrics, stockAlerts, topPerformers }) => {
    const [chatInput, setChatInput] = useState('');
    const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([
        { role: 'ai', content: 'Olá! Sou seu Consultor IA. Pergunte sobre vendas, estoque, frentistas ou qualquer aspecto do seu negócio.' }
    ]);

    const handleChatSubmit = () => {
        if (!chatInput.trim()) return;

        const userMessage = chatInput.trim();
        setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
        setChatInput('');

        // Simple AI response simulation (in production, this would call an AI API)
        setTimeout(() => {
            let response = 'Ainda estou aprendendo! Em breve poderei responder perguntas complexas sobre seu negócio.';

            const lowerMsg = userMessage.toLowerCase();
            if (lowerMsg.includes('venda') || lowerMsg.includes('faturamento')) {
                response = metrics
                    ? `Sua receita projetada para este mês é de ${formatCurrency(metrics.receitaProjetada)}, com variação de ${metrics.receitaVariacao > 0 ? '+' : ''}${metrics.receitaVariacao.toFixed(1)}% em relação ao mês anterior.`
                    : 'Carregando dados de vendas...';
            } else if (lowerMsg.includes('estoque') || lowerMsg.includes('combustível') || lowerMsg.includes('tanque')) {
                const critical = stockAlerts.filter(a => a.status === 'CRÍTICO');
                response = critical.length > 0
                    ? `Atenção! ${critical.map(c => c.combustivel).join(', ')} está(ão) com estoque crítico.`
                    : 'Todos os estoques estão em níveis adequados.';
            } else if (lowerMsg.includes('margem') || lowerMsg.includes('lucro')) {
                response = metrics
                    ? `Sua margem média atual é de ${metrics.margemMedia.toFixed(1)}%. ${metrics.margemVariacao >= 0 ? 'Boa performance!' : 'Houve uma queda, verifique os preços.'}`
                    : 'Carregando dados de margem...';
            } else if (lowerMsg.includes('frentista') || lowerMsg.includes('funcionário') || lowerMsg.includes('equipe')) {
                response = topPerformers.length > 0
                    ? `O frentista com melhor desempenho é ${topPerformers[0].nome} com média de ${formatCurrency(topPerformers[0].vendaMedia)}/dia.`
                    : 'Carregando dados de funcionários...';
            }

            setChatMessages(prev => [...prev, { role: 'ai', content: response }]);
        }, 800);
    };

    return (
        <div className="bg-gradient-to-br from-indigo-50 to-white dark:from-slate-800 dark:to-slate-900 rounded-xl border border-indigo-100 dark:border-indigo-900 shadow-md p-5">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-indigo-600 rounded-lg text-white shadow-lg shadow-indigo-500/30">
                    <Brain className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Consultor IA</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Pergunte sobre seus dados</p>
                </div>
            </div>

            <div className="mb-3 space-y-2 max-h-48 overflow-y-auto">
                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`px-3 py-2 rounded-2xl text-xs max-w-[90%] ${msg.role === 'user'
                            ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-900 dark:text-indigo-100 rounded-tr-none'
                            : 'bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-tl-none shadow-sm'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
            </div>

            <div className="relative">
                <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleChatSubmit()}
                    placeholder="Digite sua pergunta..."
                    className="w-full pl-3 pr-10 py-2.5 bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm outline-none"
                />
                <button
                    onClick={handleChatSubmit}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors"
                >
                    <Send className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

import React from 'react';
import { TrendingUp, MapPin } from 'lucide-react';
import { Calendario, modoDia } from '@shared/ui/calendario';

/**
 * Abas do Fechamento de Caixa.
 *
 * @remarks [31/07] Extraído para cá porque a união estava escrita à mão em dois lugares
 *          (props deste componente e estado do orquestrador) — adicionar aba exigia lembrar
 *          de editar os dois. `AbaFechamento` agora é a fonte única.
 *
 *          `receitas-despesas` NÃO é `financeiro`: essa chave já pertence à aba "Fechamento
 *          Financeiro", que trata das formas de pagamento do dia. Esta aqui é o painel de
 *          lançamentos por período, herdado da antiga rota `/financeiro`.
 */
import { ABAS, type AbaFechamento } from '../abas';
export type { AbaFechamento };

/**
 * Componente de cabeçalho do Fechamento Diário
 * Contém seletor de data e abas de navegação
 *
 * @remarks [16/08] O seletor de turno saiu daqui. O posto não trabalha por turno — é um
 *          encerrante por bico por dia, regra confirmada pelo dono em 31/07 e já gravada
 *          no índice de produção `leitura_unica_bico_data (bico_id, data)`, sem turno.
 *          Enquanto o seletor existiu, a tela era obrigada a carimbar "Manhã" num turno
 *          que não existe na operação, e o painel e o app do dono gravavam valores
 *          diferentes na mesma coluna.
 */
interface HeaderFechamentoProps {
    selectedDate: string;
    setSelectedDate: (date: string) => void;
    activeTab: AbaFechamento;
    setActiveTab: (tab: AbaFechamento) => void;
    postoNome?: string;
    loading?: boolean;
}

/**
 * HeaderFechamento
 * @param props - Propriedades do componente
 */
export const HeaderFechamento: React.FC<HeaderFechamentoProps> = ({
    selectedDate,
    setSelectedDate,
    activeTab,
    setActiveTab,
    postoNome,
    loading
}) => {
    return (
        <div className="bg-slate-900/80 backdrop-blur-md border-b border-slate-700/50 sticky top-0 z-30 transition-all duration-300">
            {/* // [19/01 00:36] Ajuste de layout: Header agora usa largura total. */}
            {/* Motivo: Evitar conteúdo comprimido no centro em telas grandes. */}
            <div className="w-full px-4 sm:px-6 lg:px-10 h-20 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3 tracking-tight">
                        <div className="p-2 bg-blue-600/20 rounded-lg">
                            <TrendingUp className="text-blue-400" size={24} />
                        </div>
                        Fechamento de Caixa
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 ml-1">
                        Insira as leituras para calcular as vendas do dia.
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {/* Seletor de Contexto Modernizado */}
                    <div className="flex items-center gap-3 bg-slate-800/50 p-1.5 rounded-xl border border-slate-700/50">
                        <Calendario
                            modo={modoDia}
                            valor={selectedDate}
                            aoMudar={setSelectedDate}
                            tom="escuro"
                            className="py-2"
                        />
                    </div>

                    {/* Botão de Ajuda / Posto */}
                    <div className="hidden md:flex items-center px-4 py-2 bg-slate-800/50 text-slate-300 rounded-xl border border-slate-700/50 hover:bg-slate-800 transition-colors">
                        <MapPin size={16} className="mr-2 text-emerald-400" />
                        <span className="text-sm font-semibold tracking-wide">{postoNome}</span>
                    </div>
                </div>
            </div>

            {/* Tabs - Estilo Pill Navigation */}
            {/* // [19/01 00:36] Ajuste de layout: Tabs agora usam largura total. */}
            {/* Motivo: Alinhar com o container principal sem max-width. */}
            {/* [20/01 11:30] Adição da aba Detalhamento Frentistas */}
            {/* [31/07] Os 6 botões viraram um map sobre ABAS: eram blocos idênticos a menos */}
            {/* do rótulo e da cor, e a sexta aba tornaria a repetição cara de manter. */}
            <div className="w-full px-4 sm:px-6 lg:px-10 flex gap-2 mt-2 pb-0 overflow-x-auto">
                {ABAS.map(({ chave, rotulo, classeAtiva }) => (
                    <button
                        key={chave}
                        onClick={() => setActiveTab(chave)}
                        aria-current={activeTab === chave ? 'page' : undefined}
                        className={`flex-1 md:flex-none whitespace-nowrap px-6 py-3 text-sm font-bold border-b-2 transition-all duration-200 ${activeTab === chave
                            ? classeAtiva
                            : 'border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700'
                            }`}
                    >
                        {rotulo}
                    </button>
                ))}
            </div>

            {loading && (
                <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-900/20 overflow-hidden">
                    <div className="animate-progress w-full h-full bg-blue-500 origin-left-right"></div>
                </div>
            )}
        </div>
    );
};

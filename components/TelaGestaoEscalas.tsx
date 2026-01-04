import React, { useState, useEffect, useRef } from 'react';
import { Calendar, ChevronLeft, ChevronRight, User, Save, RefreshCw, Download, FileText, X, Edit2 } from 'lucide-react';
import { frentistaService, escalaService } from '../services/api';
import { usePosto } from '../contexts/PostoContext';

/**
 * Interface para dados básicos de um frentista
 */
interface Frentista {
    id: number;
    nome: string;
}

/**
 * Interface para registro de escala (trabalho/folga) de um frentista
 * Armazena informações sobre o tipo de dia e observações opcionais
 */
interface Escala {
    id: number;
    frentista_id: number;
    data: string; // Formato: YYYY-MM-DD
    tipo: 'FOLGA' | 'TRABALHO';
    observacao?: string; // Observações sobre o dia (ex: médico, troca de turno)
}

/**
 * Interface para controle do modal de observações
 * Gerencia o estado de abertura e dados do modal
 */
interface ObservacaoModal {
    isOpen: boolean;
    frentistaId: number | null;
    frentistaName: string;
    day: number; // Dia do mês (1-31)
    currentObservacao: string;
    escalaId: number | null; // ID da escala existente, se houver
}

/**
 * Componente de Gestão de Escala e Folgas
 * 
 * Permite ao dono do posto:
 * - Visualizar escala mensal de todos os frentistas
 * - Marcar folgas clicando nas células
 * - Adicionar observações em qualquer dia (clique direito ou botão de edição)
 * - Exportar escala para PDF/impressão
 * 
 * Funcionalidades:
 * - Navegação entre meses
 * - Indicadores visuais de folgas (F vermelho)
 * - Indicadores de observações (ícone de documento)
 * - Destaque de finais de semana
 * - Modal para edição de observações
 * - Exportação formatada para PDF
 */

const TelaGestaoEscalas: React.FC = () => {
    const { postoAtivoId } = usePosto();
    const [currentDate, setCurrentDate] = useState(new Date());
    const printRef = useRef<HTMLDivElement>(null);

    const [frentistas, setFrentistas] = useState<Frentista[]>([]);
    const [escalas, setEscalas] = useState<Escala[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [observacaoModal, setObservacaoModal] = useState<ObservacaoModal>({
        isOpen: false,
        frentistaId: null,
        frentistaName: '',
        day: 0,
        currentObservacao: '',
        escalaId: null
    });

    useEffect(() => {
        loadData();
    }, [currentDate, postoAtivoId]);

    /**
     * Carrega dados de frentistas e escalas do mês atual
     * Executa sempre que o mês ou posto ativo mudar
     * 
     * Filtra apenas frentistas ativos para exibição
     */
    const loadData = async () => {
        try {
            setLoading(true);
            const [frentistasData, escalasData] = await Promise.all([
                frentistaService.getAll(postoAtivoId),
                escalaService.getByMonth(currentDate.getMonth() + 1, currentDate.getFullYear(), postoAtivoId)
            ]);

            setFrentistas(frentistasData.filter(f => f.ativo));
            setEscalas(escalasData);
        } catch (error) {
            console.error(error);
            alert('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    /**
     * Auxiliar para formatar data como YYYY-MM-DD localmente
     */
    const formatDate = (year: number, month: number, day: number) => {
        return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    };

    /**
     * Manipula clique em uma célula da escala
     * Toggle entre FOLGA e TRABALHO (padrão)
     * 
     * @param frentistaId - ID do frentista
     * @param day - Dia do mês clicado
     */
    const handleCellClick = async (frentistaId: number, day: number) => {
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
        const existing = escalas.find(e => e.frentista_id === frentistaId && e.data === dateStr);

        try {
            if (existing) {
                // Se for folga, remove o registro (volta ao padrão Trabalho)
                // Se for trabalho com observação, apenas remove o tipo Folga se houver
                if (existing.tipo === 'FOLGA') {
                    await escalaService.delete(existing.id);
                    setEscalas(prev => prev.filter(e => e.id !== existing.id));
                } else {
                    // Se era só um registro de trabalho com observação, muda para Folga
                    await escalaService.update(existing.id, { tipo: 'FOLGA' });
                    setEscalas(prev => prev.map(e =>
                        e.id === existing.id ? { ...e, tipo: 'FOLGA' } : e
                    ));
                }
            } else {
                // Cria nova escala marcada como FOLGA
                const newEscala = await escalaService.create({
                    frentista_id: frentistaId,
                    data: dateStr,
                    tipo: 'FOLGA',
                    posto_id: postoAtivoId || 1
                });

                setEscalas(prev => [...prev, newEscala]);
            }
        } catch (error) {
            console.error(error);
            alert('Erro ao atualizar escala');
        }
    };

    /**
     * Retorna o número de dias no mês atual
     */
    const getDaysInMonth = (date: Date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const days = Array.from({ length: getDaysInMonth(currentDate) }, (_, i) => i + 1);

    const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

    /**
     * Retorna a letra do dia da semana (D, S, T, Q, Q, S, S)
     */
    const getDayLabel = (day: number) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return weekDays[d.getDay()];
    };

    /**
     * Verifica se o dia é final de semana (sábado ou domingo)
     * Usado para aplicar estilo diferenciado nas células
     */
    const isWeekend = (day: number) => {
        const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).getDay();
        return d === 0 || d === 6;
    };

    /**
     * Abre o modal para adicionar/editar observação de um dia específico
     * 
     * @param frentistaId - ID do frentista
     * @param frentistaName - Nome do frentista (para exibição)
     * @param day - Dia do mês
     * 
     * Carrega observação existente se houver escala para este dia
     */

    const handleOpenObservacao = (frentistaId: number, frentistaName: string, day: number) => {
        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
        const escala = escalas.find(e => e.frentista_id === frentistaId && e.data === dateStr);

        setObservacaoModal({
            isOpen: true,
            frentistaId,
            frentistaName,
            day,
            currentObservacao: escala?.observacao || '',
            escalaId: escala?.id || null
        });
    };

    const handleSaveObservacao = async (observacao: string) => {
        if (!observacaoModal.frentistaId) return;

        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), observacaoModal.day);

        try {
            if (observacaoModal.escalaId) {
                // Atualizar escala existente
                await escalaService.update(observacaoModal.escalaId, { observacao });
                setEscalas(prev => prev.map(e =>
                    e.id === observacaoModal.escalaId ? { ...e, observacao } : e
                ));
            } else {
                // Criar nova escala com observação
                const newEscala = await escalaService.create({
                    frentista_id: observacaoModal.frentistaId,
                    data: dateStr,
                    tipo: 'TRABALHO',
                    observacao,
                    posto_id: postoAtivoId || 1
                });
                setEscalas(prev => [...prev, newEscala]);
            }

            setObservacaoModal({ ...observacaoModal, isOpen: false });
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar observação');
        }
    };

    /**
     * Exporta a escala do mês atual para PDF/impressão
     * 
     * Funcionalidade:
     * - Abre nova janela com HTML formatado para impressão
     * - Layout em paisagem (landscape) para caber todos os dias do mês
     * - Inclui cabeçalho, tabela completa, legenda e rodapé
     * - Indicadores: F (folga), 📝 (observação), destaque de finais de semana
     * 
     * O usuário pode imprimir ou salvar como PDF pelo navegador
     */
    const handleExportPDF = () => {
        // Abre nova janela em branco para renderizar o HTML de impressão
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('Por favor, permita pop-ups para exportar o PDF');
            return;
        }

        const monthName = currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });

        // Constrói HTML completo com estilos CSS inline para impressão
        // Importante: Estilos devem ser inline pois a janela não tem acesso ao CSS externo
        let html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Escala - ${monthName}</title>
                <style>
                    @page { size: landscape; margin: 1cm; }
                    body { 
                        font-family: Arial, sans-serif; 
                        font-size: 10px;
                        margin: 0;
                        padding: 20px;
                    }
                    h1 { 
                        text-align: center; 
                        font-size: 18px;
                        margin-bottom: 10px;
                        text-transform: capitalize;
                    }
                    .subtitle {
                        text-align: center;
                        color: #666;
                        margin-bottom: 20px;
                        font-size: 11px;
                    }
                    table { 
                        width: 100%; 
                        border-collapse: collapse; 
                        margin-top: 10px;
                    }
                    th, td { 
                        border: 1px solid #ddd; 
                        padding: 6px; 
                        text-align: center;
                    }
                    th { 
                        background-color: #f5f5f5; 
                        font-weight: bold;
                        font-size: 9px;
                    }
                    .frentista-col {
                        text-align: left;
                        font-weight: bold;
                        background-color: #fafafa;
                        min-width: 120px;
                    }
                    .folga { 
                        background-color: #fee; 
                        color: #c00;
                        font-weight: bold;
                    }
                    .weekend { 
                        background-color: #f9f9f9; 
                    }
                    .obs-icon {
                        color: #0066cc;
                        font-size: 8px;
                    }
                    .footer {
                        margin-top: 20px;
                        text-align: center;
                        font-size: 9px;
                        color: #666;
                    }
                    .legend {
                        margin-top: 15px;
                        display: flex;
                        justify-content: center;
                        gap: 20px;
                        font-size: 9px;
                    }
                    .legend-item {
                        display: flex;
                        align-items: center;
                        gap: 5px;
                    }
                    .legend-box {
                        width: 15px;
                        height: 15px;
                        border: 1px solid #ddd;
                    }
                </style>
            </head>
            <body>
                <h1>Escala de Trabalho - ${monthName}</h1>
                <div class="subtitle">Posto Providência</div>
                <table>
                    <thead>
                        <tr>
                            <th class="frentista-col">Frentista</th>
        `;

        // Cabeçalho com dias
        const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
        days.forEach(day => {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
            const dayLabel = weekDays[d.getDay()];
            const isWknd = isWeekend(day);
            html += `<th class="${isWknd ? 'weekend' : ''}">${day}<br/><small>${dayLabel}</small></th>`;
        });

        html += `
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Linhas de frentistas
        frentistas.forEach(frentista => {
            html += `<tr><td class="frentista-col">${frentista.nome}</td>`;

            days.forEach(day => {
                const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
                const escala = escalas.find(e => e.frentista_id === frentista.id && e.data === dateStr);
                const isFolga = escala?.tipo === 'FOLGA';
                const hasObs = escala?.observacao && escala.observacao.trim() !== '';
                const isWknd = isWeekend(day);

                let cellClass = isWknd ? 'weekend' : '';
                if (isFolga) cellClass += ' folga';

                let cellContent = isFolga ? 'F' : '-';
                if (hasObs) cellContent += ' <span class="obs-icon">📝</span>';

                html += `<td class="${cellClass}">${cellContent}</td>`;
            });

            html += `</tr>`;
        });

        html += `
                    </tbody>
                </table>
                <div class="legend">
                    <div class="legend-item">
                        <div class="legend-box folga"></div>
                        <span>Folga</span>
                    </div>
                    <div class="legend-item">
                        <div class="legend-box weekend"></div>
                        <span>Final de Semana</span>
                    </div>
                    <div class="legend-item">
                        <span class="obs-icon">📝</span>
                        <span>Com Observação</span>
                    </div>
                </div>
                <div class="footer">
                    Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(html);
        printWindow.document.close();

        // Aguardar carregamento e imprimir
        printWindow.onload = () => {
            printWindow.focus();
            printWindow.print();
        };
    };


    return (
        <div className="p-6 max-w-[1600px] mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Calendar className="text-blue-600" />
                        Gestão de Escala e Folgas
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400">Clique nos dias para definir as folgas dos frentistas.</p>
                </div>

                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <span className="font-bold text-lg min-w-[150px] text-center capitalize">
                        {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
                    </span>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                    >
                        <ChevronRight size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-300 dark:bg-gray-600 mx-2"></div>
                    <button
                        onClick={handleExportPDF}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        title="Exportar para PDF"
                    >
                        <Download size={18} />
                        <span className="hidden sm:inline">Exportar PDF</span>
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 dark:bg-gray-900/50 text-gray-500 dark:text-gray-400">
                        <tr>
                            <th className="p-4 min-w-[200px] sticky left-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 z-10">Frentista</th>
                            {days.map(day => (
                                <th key={day} className={`p-2 text-center min-w-[40px] border-l border-gray-100 dark:border-gray-700 ${isWeekend(day) ? 'bg-gray-100/50 dark:bg-gray-800' : ''}`}>
                                    <div className="font-bold">{day}</div>
                                    <div className="text-xs font-normal">{getDayLabel(day)}</div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {loading ? (
                            <tr><td colSpan={days.length + 1} className="p-8 text-center text-gray-500">Carregando...</td></tr>
                        ) : (
                            frentistas.map(frentista => (
                                <tr key={frentista.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="p-4 font-medium text-gray-900 dark:text-white sticky left-0 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 z-10 flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                                            {frentista.nome.charAt(0)}
                                        </div>
                                        {frentista.nome}
                                    </td>
                                    {days.map(day => {
                                        const dateStr = formatDate(currentDate.getFullYear(), currentDate.getMonth(), day);
                                        const escala = escalas.find(e => e.frentista_id === frentista.id && e.data === dateStr);
                                        const isFolga = escala?.tipo === 'FOLGA';
                                        const hasObservacao = escala?.observacao && escala.observacao.trim() !== '';

                                        return (
                                            <td
                                                key={day}
                                                onClick={() => handleCellClick(frentista.id, day)}
                                                onContextMenu={(e) => {
                                                    e.preventDefault();
                                                    handleOpenObservacao(frentista.id, frentista.nome, day);
                                                }}
                                                className={`p-1 border-l border-gray-100 dark:border-gray-700 cursor-pointer text-center relative group ${isWeekend(day) ? 'bg-gray-50/50' : ''}`}
                                                title={hasObservacao ? `Observação: ${escala.observacao}` : 'Clique para marcar folga | Clique direito para adicionar observação'}
                                            >
                                                <div className={`mx-auto w-8 h-8 rounded-lg flex items-center justify-center transition-all relative ${isFolga
                                                    ? 'bg-red-100 text-red-600 font-bold border-2 border-red-200'
                                                    : 'hover:bg-blue-50 text-transparent hover:text-blue-300'
                                                    }`}>
                                                    {isFolga ? 'F' : '•'}
                                                    {hasObservacao && (
                                                        <FileText
                                                            size={10}
                                                            className="absolute -top-1 -right-1 text-blue-600 bg-white rounded-full p-0.5"
                                                        />
                                                    )}
                                                </div>
                                                {/* Botão de editar observação visível no hover */}
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleOpenObservacao(frentista.id, frentista.nome, day);
                                                    }}
                                                    className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 p-1 bg-gray-700 text-white rounded-bl transition-opacity"
                                                    title="Adicionar/Editar Observação"
                                                >
                                                    <Edit2 size={10} />
                                                </button>
                                            </td>
                                        );
                                    })}

                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-red-100 border-2 border-red-200 flex items-center justify-center text-red-600 font-bold text-xs">F</div>
                    <span>Folga</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded border border-gray-200 flex items-center justify-center text-gray-300 text-xs">•</div>
                    <span>Trabalho (Padrão)</span>
                </div>
                <div className="flex items-center gap-2">
                    <FileText size={16} className="text-blue-600" />
                    <span>Com Observação</span>
                </div>
            </div>

            {/* Modal de Observações */}
            {observacaoModal.isOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-700">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                                    Observação do Dia
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {observacaoModal.frentistaName} - Dia {observacaoModal.day}
                                </p>
                            </div>
                            <button
                                onClick={() => setObservacaoModal({ ...observacaoModal, isOpen: false })}
                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-4">
                            <textarea
                                id="observacao-textarea"
                                defaultValue={observacaoModal.currentObservacao}
                                placeholder="Digite aqui qualquer observação sobre este dia (ex: médico, falta justificada, troca de turno, etc.)"
                                className="w-full h-32 p-3 border border-gray-300 dark:border-gray-600 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                                autoFocus
                            />
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setObservacaoModal({ ...observacaoModal, isOpen: false })}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={() => {
                                    const textarea = document.getElementById('observacao-textarea') as HTMLTextAreaElement;
                                    handleSaveObservacao(textarea.value);
                                }}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                            >
                                <Save size={18} />
                                Salvar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TelaGestaoEscalas;

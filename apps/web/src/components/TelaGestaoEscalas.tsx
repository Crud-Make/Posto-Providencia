import React from 'react';
import { usePosto } from '../contexts/PostoContext';
import { useEscalas } from './escalas/hooks/useEscalas';
import { exportarEscalaParaPdf } from './escalas/utils/exportPdf';

// Subcomponentes modularizados
import EscalaHeader from './escalas/EscalaHeader';
import EscalaTable from './escalas/EscalaTable';
import EscalaLegend from './escalas/EscalaLegend';
import ObservacaoModal from './escalas/ObservacaoModal';

/**
 * Tela de Gestão de Escalas e Folgas (Refatorada)
 * 
 * Componente orquestrador que utiliza o hook useEscalas para lógica de negócio
 * e subcomponentes especializados para a interface seguindo o padrão Clean Code.
 * 
 * @returns Elemento JSX da página de gestão de escalas
 */
// [11/01 16:50] Modularização completa da TelaGestaoEscalas (Issue #20) seguindo novos padrões de UI/UX e Clean Code.
const TelaGestaoEscalas: React.FC = () => {
    const { postoAtivoId } = usePosto();

    // Hook principal com toda a lógica de estado e operações em Português
    const {
        dataAtual,
        frentistas,
        escalas,
        carregando,
        modalObservacao,
        setModalObservacao,
        mesAnterior,
        proximoMes,
        alternarFolga,
        abrirObservacao,
        salvarObservacao,
        obterDiasNoMes,
        ehFinalDeSemana,
        obterLabelDia,
        formatarData
    } = useEscalas(postoAtivoId);

    // Array de dias do mês atual para renderização da tabela
    const dias = Array.from({ length: obterDiasNoMes() }, (_, i) => i + 1);

    /**
     * Aciona o utilitário de exportação para PDF com dados formatados para impressão
     */
    const handleExportarPDF = () => {
        exportarEscalaParaPdf(
            dataAtual,
            frentistas,
            escalas,
            dias,
            ehFinalDeSemana,
            formatarData
        );
    };

    return (
        <div className="p-4 sm:p-6 max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-24 font-sans">
            {/* Cabeçalho com navegação estilizada */}
            <EscalaHeader
                dataAtual={dataAtual}
                onMesAnterior={mesAnterior}
                onProximoMes={proximoMes}
                onExportarPDF={handleExportarPDF}
            />

            {/* Tabela de escala com suporte a Sticky Columns e Hover Effects */}
            <EscalaTable
                carregando={carregando}
                frentistas={frentistas}
                escalas={escalas}
                dias={dias}
                ehFinalDeSemana={ehFinalDeSemana}
                obterLabelDia={obterLabelDia}
                onCliqueCelula={alternarFolga}
                onAbrirObservacao={abrirObservacao}
                formatarData={formatarData}
                anoAtual={dataAtual.getFullYear()}
                mesAtual={dataAtual.getMonth()}
            />

            {/* Legenda visual e guia de interação */}
            <EscalaLegend />

            {/* Modal de anotações diárias com UX otimizada */}
            <ObservacaoModal
                isOpen={modalObservacao.isOpen}
                frentistaName={modalObservacao.frentistaName}
                day={modalObservacao.day}
                currentObservacao={modalObservacao.currentObservacao}
                onClose={() => setModalObservacao(prev => ({ ...prev, isOpen: false }))}
                onSave={salvarObservacao}
            />
        </div>
    );
};

export default TelaGestaoEscalas;

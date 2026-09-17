import React, { useState } from 'react';
import { AlertTriangle, CalendarX, Loader2, Check } from 'lucide-react';
import { Calendario, modoMes } from '@shared/ui/calendario';
import { useApagarMes } from '../hooks/useApagarMes';

interface ModalApagarMesProps {
    isOpen: boolean;
    postoId?: number;
    onClose: () => void;
}

/**
 * Apaga o movimento de um mês inteiro.
 *
 * @remarks
 * Existe para limpar dado de teste na implantação, quando o posto ainda está
 * aprendendo o fluxo e envia encerrante errado de propósito.
 *
 * A contagem aparece **antes** de propósito: confirmar sem saber quantas linhas
 * vão embora é como assinar papel em branco. E o resultado mostra o que de fato
 * saiu, porque o `DELETE` anônimo responde sucesso mesmo quando a RLS barra.
 */
export const ModalApagarMes: React.FC<ModalApagarMesProps> = ({ isOpen, postoId, onClose }) => {
    const [confirmacao, setConfirmacao] = useState('');
    const { mes, definirMes, contagem, contando, apagando, resultado, erro, apagar, limpar } =
        useApagarMes(postoId, isOpen);

    if (!isOpen) return null;

    const total = contagem
        ? contagem.leituras + contagem.fechamentos + contagem.fechamentosFrentista + contagem.recebimentos
        : 0;

    const fechar = () => {
        setConfirmacao('');
        limpar();
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg border-2 border-red-500 overflow-hidden">
                <div className="bg-gradient-to-r from-red-600 to-orange-600 p-6">
                    <div className="flex items-center gap-3 text-white">
                        <CalendarX size={32} />
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Apagar um mês</h3>
                            <p className="text-red-100 text-sm font-medium mt-1">Esta ação é IRREVERSÍVEL!</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="mes-apagar" className="block text-sm font-bold text-gray-900 dark:text-white">
                            Mês do movimento
                        </label>
                        <Calendario
                            id="mes-apagar"
                            modo={modoMes}
                            valor={mes}
                            aoMudar={novo => { definirMes(novo); setConfirmacao(''); }}
                            desabilitado={apagando}
                            className="w-full py-3"
                        />
                    </div>

                    <div className="bg-red-50 dark:bg-red-950/30 border-2 border-red-200 dark:border-red-800 rounded-lg p-4">
                        <p className="text-sm text-gray-900 dark:text-white font-bold mb-2">O que será apagado:</p>
                        {contando ? (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Contando…</p>
                        ) : contagem ? (
                            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4 list-disc">
                                <li><strong>{contagem.leituras}</strong> leituras de bico</li>
                                <li><strong>{contagem.fechamentos}</strong> fechamentos de caixa</li>
                                <li><strong>{contagem.fechamentosFrentista}</strong> fechamentos de frentista</li>
                                <li><strong>{contagem.recebimentos}</strong> recebimentos</li>
                            </ul>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic">Escolha um mês.</p>
                        )}
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400">
                        Cadastros não são tocados: frentistas, bicos, combustíveis, preços e configurações
                        continuam como estão. Só sai o movimento do mês escolhido.
                    </p>

                    {erro && (
                        <p className="text-sm text-red-600 dark:text-red-400 font-semibold">{erro}</p>
                    )}

                    {resultado && (
                        <div className={`rounded-lg p-4 border-2 ${resultado.sobrou
                            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800'
                            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'}`}>
                            {resultado.sobrou ? (
                                <>
                                    <p className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-2">
                                        <AlertTriangle size={16} /> Apagou só uma parte
                                    </p>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                                        Sobraram <strong>{resultado.depois.leituras}</strong> leituras e{' '}
                                        <strong>{resultado.depois.fechamentos}</strong> fechamentos. O banco só
                                        permite apagar movimento dos <strong>últimos 7 dias</strong> por esta tela —
                                        o que for mais antigo precisa ser apagado pelo painel do Supabase.
                                    </p>
                                </>
                            ) : (
                                <p className="text-sm font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                    <Check size={16} /> Mês apagado. Saíram {resultado.antes.leituras} leituras e{' '}
                                    {resultado.antes.fechamentos} fechamentos.
                                </p>
                            )}
                        </div>
                    )}

                    {!resultado && (
                        <div className="space-y-2">
                            <label htmlFor="confirma-apagar" className="block text-sm font-bold text-gray-900 dark:text-white">
                                Para continuar, digite <span className="text-red-600 dark:text-red-400">APAGAR</span>:
                            </label>
                            <input
                                id="confirma-apagar"
                                type="text"
                                value={confirmacao}
                                onChange={e => setConfirmacao(e.target.value.toUpperCase())}
                                placeholder="Digite APAGAR"
                                disabled={apagando || total === 0}
                                className="w-full px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold text-center text-lg disabled:opacity-50"
                            />
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={fechar}
                            disabled={apagando}
                            className="flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                        >
                            {resultado ? 'Fechar' : 'Cancelar'}
                        </button>
                        {!resultado && (
                            <button
                                onClick={apagar}
                                disabled={apagando || confirmacao !== 'APAGAR' || total === 0}
                                className="flex-1 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {apagando ? <Loader2 size={18} className="animate-spin" /> : <CalendarX size={18} />}
                                {apagando ? 'Apagando…' : 'Apagar o mês'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

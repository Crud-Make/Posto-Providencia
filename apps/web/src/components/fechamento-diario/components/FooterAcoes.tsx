import React from 'react';
import { Save as SaveIcon, Loader2 } from 'lucide-react';

interface FooterAcoesProps {
    totalVendas: number;
    totalFrentistas: number;
    diferenca: number;
    saving: boolean;
    podeFechar: boolean;
    handleSave: () => void;
}

export const FooterAcoes: React.FC<FooterAcoesProps> = ({
    totalVendas,
    totalFrentistas,
    diferenca,
    saving,
    podeFechar,
    handleSave
}) => {
    return (
        // [31/07] `sticky` no lugar de `fixed`: a barra agora participa do layout e o
        // próprio navegador reserva a altura dela, seja qual for.
        // Motivo: com `fixed` ela saía do fluxo e o espaço era reservado por um `pb-24`
        // (96px) fixo no container. Abaixo de `md` a barra empilha em duas linhas e vai a
        // 162px — 66px de conteúdo (a última linha da tabela) ficavam cobertos para sempre,
        // mesmo rolando até o fim. No desktop sobravam 1,7px: passava por coincidência.
        <div className="sticky bottom-0 bg-slate-900/95 backdrop-blur-xl border-t border-slate-700 p-2 shadow-2xl z-40 print:hidden text-white">
            {/* // [19/01 00:37] Ajuste de layout: Footer agora usa largura total. */}
            {/* Motivo: Evitar conteúdo comprimido no centro em telas grandes. */}
            <div className="w-full px-2 lg:px-3 flex flex-col md:flex-row justify-between items-center gap-2 md:gap-0">
                <div className="flex gap-4 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <div className="bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Vendas (Bomba)</p>
                        <p className="text-base font-bold text-blue-400 font-mono">
                            {totalVendas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Apurado (Frentistas)</p>
                        {/* Vermelho quando FALTA, e falta é diferença POSITIVA
                            (§6: concentrador − conferido). A condição era `< 0`
                            porque o cálculo vinha invertido; corrigido o sinal
                            em 16/08/2026, a cor tinha de virar junto — senão
                            falta apareceria em verde. */}
                        <p className={`text-base font-bold font-mono ${diferenca > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {totalFrentistas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </p>
                    </div>
                    {/* Três estados, não dois — e o terceiro custou um susto real.
                        Em 19/08/2026 os cinco frentistas do dia entraram (R$ 9.738,86)
                        SEM nenhum encerrante lançado: `totalVendas` era 0, a diferença
                        dava 0 por falta de termo de comparação, e a tarja anunciava
                        "✓ Bateu" num dia que ninguém tinha conferido. Zero de venda com
                        caixa recebido não é dia fechado — é dia sem encerrante, e tem de
                        dizer isso.

                        Meio centavo de tolerância no "bateu": a diferença chega como
                        float, e um -0,000001 de arredondamento viraria "-R$ 0,00". */}
                    {(() => {
                        // **"Bateu" exige ter com o que comparar.** Sem venda apurada a
                        // diferença dá zero por ausência de termo, não por acerto — e
                        // anunciar acerto aí é o pior erro que este painel pode cometer,
                        // porque some justamente com o aviso de que ninguém conferiu nada.
                        //
                        // A primeira versão desta guarda exigia `totalFrentistas > 0` para
                        // reclamar, e por isso o dia INTEIRAMENTE vazio voltava a dizer
                        // "✓ Bateu" (0 − 0 = 0). Os dois casos foram vistos ao vivo em
                        // 19/08/2026, com o dono olhando a tela. A condição é só uma: sem
                        // `totalVendas`, não existe conferência.
                        const semEncerrante = totalVendas < 0.005;
                        const diaVazio = semEncerrante && totalFrentistas < 0.005;
                        const bateu = !semEncerrante && Math.abs(diferenca) < 0.005;

                        const borda = semEncerrante
                            ? (diaVazio ? 'border-l-slate-600' : 'border-l-amber-500')
                            : bateu ? 'border-l-emerald-500' : 'border-l-orange-500/50';
                        const cor = semEncerrante
                            ? (diaVazio ? 'text-slate-500' : 'text-amber-400')
                            : bateu ? 'text-emerald-500' : diferenca > 0 ? 'text-red-500' : 'text-amber-500';
                        const texto = diaVazio
                            ? 'dia sem lançamento'
                            : semEncerrante
                                ? 'sem encerrante'
                                : bateu
                                    ? '✓ Bateu'
                                    : diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        const rodape = diaVazio
                            ? 'nem leitura de bomba nem caixa de frentista neste dia'
                            : semEncerrante
                                ? 'não dá para conferir o caixa sem a leitura das bombas'
                                : null;

                        return (
                            <div className={`bg-slate-800/50 px-3 py-1 rounded-lg border border-slate-700/50 border-l-4 ${borda}`}>
                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                                    Diferença <span className="normal-case font-normal">(+ falta · − sobra)</span>
                                </p>
                                <p className={`text-base font-bold font-mono ${cor}`}>{texto}</p>
                                {rodape && (
                                    <p className="text-[10px] text-amber-400/70 normal-case font-normal">{rodape}</p>
                                )}
                            </div>
                        );
                    })()}
                </div>

                <button
                    onClick={handleSave}
                    disabled={saving || !podeFechar}
                    className="flex-1 md:flex-none px-5 py-1.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20 transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <SaveIcon size={18} />}
                    Salvar Fechamento
                </button>
            </div>
        </div>
    );
};

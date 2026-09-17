/**
 * O que cada frentista enviou no dia — a tela que a notificação manda abrir.
 *
 * @remarks É aqui que o dinheiro aparece, e de propósito: o aviso no celular
 *          não leva valor nenhum, porque chega com o aparelho BLOQUEADO, à
 *          vista de qualquer um. Falta de caixa é o assunto mais sensível do
 *          posto — fica atrás do desbloqueio.
 */
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, RefreshCw, TrendingUp } from 'lucide-react';
import { criarAcessoEnvios, type EnvioDeFechamento } from '@posto/api-core';
import { isSobra } from '@posto/utils';
import { supabase } from '../lib/supabase';
import BotaoNotificacoes from '../components/botao-notificacoes';

const POSTO_ID = 1;
const acesso = criarAcessoEnvios(supabase);

const reais = (valor: number | null) =>
    (valor ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** "2026-08-30" sem passar por `new Date`, que joga o dia para trás em UTC. */
const diaBonito = (iso: string) => {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
};

const horaDoEnvio = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--';

/** Iniciais para quem ainda não pôs foto de perfil. */
const iniciais = (nome: string) => {
    const partes = nome.trim().split(/\s+/).filter(Boolean);
    if (partes.length === 0) return '?';
    if (partes.length === 1) return partes[0].charAt(0).toUpperCase();
    return (partes[0].charAt(0) + partes[partes.length - 1].charAt(0)).toUpperCase();
};

interface Props {
    readonly dataIso: string;
    readonly onTrocarData: (dataIso: string) => void;
    readonly onVoltar: () => void;
}

export default function EnviosScreen({ dataIso, onTrocarData, onVoltar }: Props) {
    const [envios, setEnvios] = useState<EnvioDeFechamento[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);

    const carregar = useCallback(async () => {
        setCarregando(true);
        setErro(null);
        try {
            setEnvios(await acesso.listarDoDia(POSTO_ID, dataIso));
        } catch (e) {
            setErro(e instanceof Error ? e.message : 'Não consegui carregar os envios.');
        } finally {
            setCarregando(false);
        }
    }, [dataIso]);

    useEffect(() => { void carregar(); }, [carregar]);

    // Soma só o que a tela mostra. Não é cálculo de fechamento: é o total do
    // que os frentistas declararam neste dia, para o dono bater de olho.
    const totalConferido = envios.reduce((soma, e) => soma + (e.valor_conferido ?? 0), 0);
    // `null` não entra na conta: diferença NÃO CALCULADA é diferente de zero, e
    // somá-la como "bateu" esconderia justamente a linha que ninguém apurou.
    const comProblema = envios.filter(e => e.diferenca_calculada != null && e.diferenca_calculada !== 0).length;
    const semApurar = envios.filter(e => e.diferenca_calculada == null).length;

    return (
        <div className="min-h-screen bg-[#0A0D14] text-slate-100 pb-10">
            <header className="bg-[#D32F2F] px-5 pt-6 pb-8 rounded-b-[2rem]">
                <div className="flex items-center justify-between mb-4">
                    <button onClick={onVoltar} aria-label="Voltar" className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center border border-white/10">
                        <ArrowLeft size={20} className="text-white" />
                    </button>
                    <h1 className="text-xl font-bold text-white">Envios dos frentistas</h1>
                    <button onClick={() => void carregar()} aria-label="Atualizar" className="w-10 h-10 rounded-full bg-black/20 flex items-center justify-center border border-white/10">
                        <RefreshCw size={18} className={`text-white ${carregando ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                <input
                    type="date"
                    value={dataIso}
                    onChange={(e) => e.target.value && onTrocarData(e.target.value)}
                    className="w-full bg-black/25 text-white rounded-xl px-4 py-3 border border-white/15 font-semibold"
                />
            </header>

            <div className="px-5 -mt-5">
                <div className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-xs">Conferido em {diaBonito(dataIso)}</p>
                        <p className="text-2xl font-bold text-white">{reais(totalConferido)}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-slate-400 text-xs">{envios.length} envio{envios.length === 1 ? '' : 's'}</p>
                        <p className={`text-sm font-semibold ${comProblema ? 'text-amber-400' : 'text-emerald-400'}`}>
                            {comProblema ? `${comProblema} com diferença` : 'todos bateram'}
                        </p>
                        {semApurar > 0 && (
                            <p className="text-xs text-slate-500">{semApurar} sem apurar</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Fica logo abaixo do resumo, não no topo: o dono precisa ver do
                que se trata a tela antes de decidir ser avisado por ela. */}
            <div className="px-5 mt-4">
                <BotaoNotificacoes />
            </div>

            <div className="px-5 mt-5 space-y-3">
                {erro && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">{erro}</div>
                )}

                {!carregando && !erro && envios.length === 0 && (
                    <p className="text-slate-400 text-sm italic py-8 text-center">
                        Nenhum frentista enviou o fechamento de {diaBonito(dataIso)}.
                    </p>
                )}

                {envios.map((envio) => {
                    // `null` é um terceiro estado, não zero: o envio existe mas a
                    // diferença nunca foi apurada. Chamar isso de "bateu" seria
                    // afirmar sobre dinheiro o que ninguém conferiu.
                    const semApuracao = envio.diferenca_calculada == null;
                    const diferenca = envio.diferenca_calculada ?? 0;
                    const bateu = !semApuracao && diferenca === 0;
                    const sobra = isSobra(diferenca);
                    const nome = envio.frentista?.nome ?? 'Frentista';

                    return (
                        <div key={envio.id} className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 flex items-center gap-4">
                            {envio.frentista?.foto ? (
                                <img src={envio.frentista.foto} alt={`Foto de ${nome}`} className="w-12 h-12 rounded-full object-cover border border-red-800/50" />
                            ) : (
                                <div className="w-12 h-12 rounded-full bg-red-900/40 border border-red-800/50 flex items-center justify-center">
                                    <span className="text-red-500 font-bold">{iniciais(nome)}</span>
                                </div>
                            )}

                            <div className="flex-1 min-w-0">
                                <p className="font-bold text-white truncate">{nome}</p>
                                <p className="text-xs text-slate-400">
                                    {horaDoEnvio(envio.data_hora_envio)} · {reais(envio.valor_conferido)} conferido
                                </p>
                            </div>

                            <div className="text-right shrink-0">
                                {semApuracao ? (
                                    <span className="text-slate-500 text-xs font-semibold">sem apurar</span>
                                ) : bateu ? (
                                    <span className="inline-flex items-center gap-1 text-emerald-400 text-sm font-semibold">
                                        <Check size={14} /> bateu
                                    </span>
                                ) : (
                                    <>
                                        <span className={`inline-flex items-center gap-1 text-sm font-bold ${sobra ? 'text-sky-400' : 'text-amber-400'}`}>
                                            {sobra ? <TrendingUp size={14} /> : <AlertTriangle size={14} />}
                                            {sobra ? 'Sobra' : 'Falta'}
                                        </span>
                                        <p className={`text-sm font-semibold ${sobra ? 'text-sky-400' : 'text-amber-400'}`}>
                                            {reais(Math.abs(diferenca))}
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

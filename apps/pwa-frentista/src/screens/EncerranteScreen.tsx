import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Camera, Check, AlertCircle, Loader2, Gauge, RefreshCw } from 'lucide-react';
import { api } from '../services/api';

interface EncerranteProps {
    frentistaId: number;
    frentistaNome: string;
    onVoltar: () => void;
}

interface BicoInfo {
    id: number;
    numero: number;
    combustivel_id: number;
    combNome: string;
    preco: number;
}

const POSTO_ID = 1;
// Teto de litros plausível por bico num turno — acima disso, provavelmente é
// dígito errado (troca de dígito costuma gerar diferenças de milhares de litros).
const MAX_LITROS_PLAUSIVEL = 3000;

// "1861796.633" -> "1.861.796,633" (formato do papel, pra o frentista conferir)
const formatBR = (dotStr: string | null): string => {
    if (!dotStr) return '';
    const [int, dec = ''] = String(dotStr).split('.');
    const intFmt = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return dec ? `${intFmt},${dec}` : intFmt;
};

// "1.861.796,633" -> 1861796.633
const parseBR = (s: string): number => {
    const limpo = (s || '').replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
    const n = parseFloat(limpo);
    return isNaN(n) ? 0 : n;
};

const formatNum = (n: number, casas = 3) =>
    n.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });

// Reduz a foto no cliente antes de mandar (mantém a latência ~3s e evita payload gigante)
async function fileParaBase64Reduzido(file: File, maxDim = 1000, quality = 0.82) {
    const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
    });
    const img: HTMLImageElement = await new Promise((res, rej) => {
        const i = new Image();
        i.onload = () => res(i);
        i.onerror = rej;
        i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas não suportado');
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL('image/jpeg', quality);
    return { base64: out.split(',')[1], mimeType: 'image/jpeg', preview: out };
}

const EncerranteScreen: React.FC<EncerranteProps> = ({ frentistaNome, onVoltar }) => {
    const [bicos, setBicos] = useState<BicoInfo[]>([]);
    const [ultimas, setUltimas] = useState<Map<number, number>>(new Map());
    const [carregandoBase, setCarregandoBase] = useState(true);

    const [preview, setPreview] = useState<string | null>(null);
    const [lendo, setLendo] = useState(false);
    // valores editáveis por bico_id, no formato BR
    const [valores, setValores] = useState<Record<number, string>>({});
    const [temLeitura, setTemLeitura] = useState(false);
    // bico_id -> a 2ª leitura (auto-conferência) divergiu da 1ª nesse bico
    const [duvidaOcr, setDuvidaOcr] = useState<Record<number, boolean>>({});

    const [enviando, setEnviando] = useState(false);
    const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

    // Trava o auto-reload do service worker durante TODO o tempo na tela Encerrante.
    // Antes travava só durante o processamento, mas o reload acontecia enquanto a
    // câmera nativa estava aberta (a 1ª foto era perdida e precisava tirar de novo).
    useEffect(() => {
        (window as any).__encerranteBusy = true;
        return () => { (window as any).__encerranteBusy = false; };
    }, []);

    // Mantém a function quente o tempo todo na tela (ping ao abrir + a cada 45s),
    // pra a foto nunca cair num cold start (~1 min).
    useEffect(() => {
        api.aquecerEncerrante();
        const t = setInterval(() => api.aquecerEncerrante(), 45000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        Promise.all([api.getBicos(POSTO_ID), api.getUltimasLeiturasPorBico(POSTO_ID)])
            .then(([bs, ult]) => {
                const mapped: BicoInfo[] = (bs as any[]).map(b => ({
                    id: b.id,
                    numero: b.numero,
                    combustivel_id: b.combustivel_id,
                    combNome: b.combustivel?.nome ?? '—',
                    preco: Number(b.combustivel?.preco_venda ?? 0),
                }));
                setBicos(mapped);
                setUltimas(ult);
            })
            .catch(err => setFeedback({ tipo: 'erro', msg: err.message || 'Erro ao carregar bicos' }))
            .finally(() => setCarregandoBase(false));
    }, []);

    const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = ''; // permite re-selecionar a mesma foto
        if (!file) return;
        setFeedback(null);
        setLendo(true);
        try {
            const { base64, mimeType, preview } = await fileParaBase64Reduzido(file);
            setPreview(preview);
            const leituras = await api.lerEncerrante(base64, mimeType);

            // Mapeia por número do bico (papel lista 1..6 na ordem)
            const porNumero = new Map<number, string | null>();
            const duvidaPorNumero = new Map<number, boolean>();
            leituras.forEach(l => {
                porNumero.set(Number(l.bico), l.numero);
                duvidaPorNumero.set(Number(l.bico), l.confianca === false);
            });

            const novos: Record<number, string> = {};
            const duvidas: Record<number, boolean> = {};
            bicos.forEach(b => {
                novos[b.id] = formatBR(porNumero.get(b.numero) ?? null);
                duvidas[b.id] = duvidaPorNumero.get(b.numero) ?? false;
            });
            setValores(novos);
            setDuvidaOcr(duvidas);
            setTemLeitura(true);
            const lidos = leituras.filter(l => l.numero).length;
            const comDuvida = Object.values(duvidas).filter(Boolean).length;
            setFeedback(comDuvida > 0
                ? { tipo: 'erro', msg: `Li ${lidos} de ${bicos.length} bicos, mas ${comDuvida} ficaram em dúvida (destacados). Confira antes de enviar.` }
                : { tipo: 'ok', msg: `Li ${lidos} de ${bicos.length} bicos. Confira e ajuste se precisar.` });
        } catch (err: any) {
            setFeedback({ tipo: 'erro', msg: err.message || 'Não consegui ler a foto. Tente novamente.' });
        } finally {
            setLendo(false);
        }
    };

    const litrosPreview = (b: BicoInfo): number => {
        const final = parseBR(valores[b.id] || '');
        const inicial = ultimas.get(b.id);
        if (!final || inicial === undefined) return 0;
        return Math.max(0, final - inicial);
    };

    // Aviso de plausibilidade: leitura final menor que a inicial (bomba não anda pra
    // trás) ou litros vendidos acima do teto plausível — geralmente sinal de dígito
    // errado, mesmo quando a auto-conferência do OCR bateu.
    const avisoPlausibilidade = (b: BicoInfo): string | null => {
        const final = parseBR(valores[b.id] || '');
        const inicial = ultimas.get(b.id);
        if (!final || inicial === undefined) return null;
        if (final < inicial) return 'Leitura final menor que a anterior — confira o número.';
        if (final - inicial > MAX_LITROS_PLAUSIVEL) return `Mais de ${MAX_LITROS_PLAUSIVEL}L de diferença — confira o número.`;
        return null;
    };

    const avisoBico = (b: BicoInfo): string | null => {
        if (duvidaOcr[b.id]) return 'A leitura ficou em dúvida na conferência automática.';
        return avisoPlausibilidade(b);
    };

    const temAlgumAviso = useMemo(
        () => bicos.some(b => avisoBico(b) !== null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [bicos, valores, ultimas, duvidaOcr],
    );

    const handleEnviar = async () => {
        setFeedback(null);

        if (temAlgumAviso) {
            const bicosComAviso = bicos.filter(b => avisoBico(b) !== null).map(b => b.numero).join(', ');
            const confirmar = window.confirm(
                `Bico(s) ${bicosComAviso} com leitura em dúvida. Tem certeza que quer enviar assim mesmo?`
            );
            if (!confirmar) return;
        }

        const linhas = bicos
            .map(b => {
                const final = parseBR(valores[b.id] || '');
                if (!final) return null;
                const inicial = ultimas.get(b.id) ?? final; // 1ª leitura do bico = base (litros 0)
                return {
                    bico_id: b.id,
                    combustivel_id: b.combustivel_id,
                    leitura_inicial: inicial,
                    leitura_final: final,
                    preco_litro: b.preco,
                };
            })
            .filter(Boolean) as any[];

        if (linhas.length === 0) {
            setFeedback({ tipo: 'erro', msg: 'Nenhum valor preenchido. Fotografe o papel primeiro.' });
            return;
        }

        setEnviando(true);
        try {
            const data = new Date().toISOString().split('T')[0];
            await api.salvarLeituras({ postoId: POSTO_ID, data, linhas });
            setFeedback({ tipo: 'ok', msg: `${linhas.length} leituras enviadas com sucesso!` });
            setTemLeitura(false);
            setPreview(null);
            setValores({});
            setDuvidaOcr({});
            // recarrega as últimas leituras (agora as que acabamos de gravar viram base)
            api.getUltimasLeiturasPorBico(POSTO_ID).then(setUltimas).catch(() => { });
        } catch (err: any) {
            setFeedback({ tipo: 'erro', msg: err.message || 'Erro ao enviar as leituras.' });
        } finally {
            setEnviando(false);
        }
    };

    const totalValor = useMemo(
        () => bicos.reduce((sum, b) => sum + litrosPreview(b) * b.preco, 0),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [bicos, valores, ultimas],
    );

    return (
        <div className="flex flex-col min-h-screen bg-[#0A0D14] text-slate-100 font-sans pb-32">
            {/* Header */}
            <div className="p-5 pb-3">
                <button onClick={onVoltar} className="flex items-center gap-1 text-slate-400 mb-4 active:scale-95 transition-transform">
                    <ChevronLeft size={20} /> Voltar
                </button>
                <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-full bg-[#FF756B]/10 flex items-center justify-center border border-[#FF756B]/30">
                        <Gauge size={22} className="text-[#FF756B]" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white leading-tight">Enviar Encerrante</h1>
                        <p className="text-sm text-slate-400">{frentistaNome}</p>
                    </div>
                </div>
            </div>

            <div className="px-5 space-y-4 flex-1">
                {/* Botão de foto */}
                <label className={`block rounded-2xl border-2 border-dashed transition-colors cursor-pointer
                    ${lendo ? 'border-slate-700 bg-[#131722]' : 'border-[#FF756B]/40 bg-[#FF756B]/5 active:scale-[0.99]'}`}>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFoto} disabled={lendo} />
                    <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                        {lendo ? (
                            <>
                                <Loader2 size={34} className="text-[#FF756B] animate-spin mb-3" />
                                <p className="text-white font-bold">Lendo o papel…</p>
                                <p className="text-slate-400 text-xs mt-1">A primeira leitura do dia pode levar até ~40s.</p>
                            </>
                        ) : (
                            <>
                                <Camera size={34} className="text-[#FF756B] mb-3" />
                                <p className="text-white font-bold">{temLeitura ? 'Tirar outra foto' : 'Fotografar papel do encerrante'}</p>
                                <p className="text-slate-400 text-xs mt-1">Enquadre a lista "IMPRESSÃO DE ENCERRANTES".</p>
                            </>
                        )}
                    </div>
                </label>

                {preview && !lendo && (
                    <div className="flex items-center gap-3 bg-[#131722] rounded-xl p-2 border border-slate-800/60">
                        <img src={preview} alt="foto" className="w-14 h-14 rounded-lg object-cover" />
                        <span className="text-slate-400 text-sm">Foto enviada para leitura.</span>
                    </div>
                )}

                {/* Feedback */}
                {feedback && (
                    <div className={`flex items-start gap-2 rounded-xl p-3 text-sm font-medium border
                        ${feedback.tipo === 'ok'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                        {feedback.tipo === 'ok' ? <Check size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                        <span>{feedback.msg}</span>
                    </div>
                )}

                {/* Lista dos bicos */}
                {carregandoBase ? (
                    <p className="text-slate-500 text-sm italic py-4">Carregando bicos…</p>
                ) : (
                    <div className="space-y-3">
                        {bicos.map(b => {
                            const litros = litrosPreview(b);
                            const inicial = ultimas.get(b.id);
                            const aviso = avisoBico(b);
                            return (
                                <div key={b.id} className={`bg-[#131722] rounded-2xl p-4 border ${aviso ? 'border-amber-500/60' : 'border-slate-800/60'}`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-7 h-7 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-bold flex items-center justify-center border border-indigo-500/30">
                                                {b.numero}
                                            </span>
                                            <div>
                                                <p className="text-white text-sm font-bold leading-none">Bico {b.numero}</p>
                                                <p className="text-slate-500 text-[11px] mt-0.5">{b.combNome} · R$ {formatNum(b.preco, 2)}/L</p>
                                            </div>
                                        </div>
                                        {temLeitura && litros > 0 && (
                                            <span className="text-emerald-400 text-[11px] font-semibold">{formatNum(litros)} L</span>
                                        )}
                                    </div>
                                    <div className="flex items-end gap-1 border-b border-slate-700/50 pb-1">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={valores[b.id] || ''}
                                            onChange={e => {
                                                setValores(prev => ({ ...prev, [b.id]: e.target.value }));
                                                setDuvidaOcr(prev => (prev[b.id] ? { ...prev, [b.id]: false } : prev));
                                            }}
                                            placeholder="0,000"
                                            className="bg-transparent text-white text-lg font-semibold w-full outline-none focus:ring-0 placeholder:text-slate-600"
                                        />
                                    </div>
                                    {inicial !== undefined && (
                                        <p className="text-slate-600 text-[10px] mt-1">Leitura anterior: {formatNum(inicial)}</p>
                                    )}
                                    {aviso && (
                                        <p className="text-amber-400 text-[11px] mt-1 flex items-center gap-1">
                                            <AlertCircle size={11} /> {aviso}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Total */}
                {temLeitura && (
                    <div className="bg-[#131722] rounded-2xl p-4 border border-slate-800/60 flex justify-between items-center">
                        <span className="text-slate-400 font-medium text-sm">Total estimado de vendas</span>
                        <span className="text-emerald-400 font-bold text-lg">
                            {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                )}
            </div>

            {/* Botão enviar */}
            <div className="px-5 pt-4">
                <button
                    onClick={handleEnviar}
                    disabled={enviando || !temLeitura}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all
                        ${enviando || !temLeitura
                            ? 'bg-indigo-600/40 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.3)]'}`}
                >
                    {enviando ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                    {enviando ? 'Enviando…' : 'Confirmar e Enviar Leituras'}
                </button>
            </div>
        </div>
    );
};

export default EncerranteScreen;

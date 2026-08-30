import React, { useEffect, useMemo, useState } from 'react';
import { corDoProduto } from '@posto/utils';
import { ChevronLeft, Camera, Check, AlertCircle, Loader2, Gauge, RefreshCw, CalendarX } from 'lucide-react';
import { api } from '../services/api';
import type { DiaEmFalta } from '@posto/api-core';
import { hojeIso, deIsoLocal } from '@posto/utils';

/** `2026-08-14` → `14/08 (sex)`. Dia da semana ajuda a reconhecer o dia esquecido. */
const rotuloDoDia = (iso: string): string => {
    const d = deIsoLocal(iso);
    const semana = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} (${semana})`;
};

interface EncerranteProps {
    /** Só rótulo: quem fotografou não é gravado — `Leitura` não tem frentista. */
    frentistaNome?: string;
    onVoltar: () => void;
}

interface BicoInfo {
    id: number;
    numero: number;
    combustivel_id: number;
    combNome: string;
    /** `Combustivel.codigo` — chave da cor da planilha. */
    combCodigo: string | null;
    preco: number;
}

// Formato bruto devolvido por api.getBicos (select com join em Combustivel).
interface BicoRow {
    id: number;
    numero: number;
    combustivel_id: number;
    combustivel: { nome: string; codigo: string; preco_venda: number } | null;
}

// Formato aceito por api.salvarLeituras.
interface LinhaLeitura {
    bico_id: number;
    combustivel_id: number;
    leitura_inicial: number;
    leitura_final: number;
    preco_litro: number;
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

/**
 * Máscara de digitação: os TRÊS ÚLTIMOS dígitos são sempre os mililitros.
 *
 * @remarks Digitar `1740317000` produz `1.740.317,000`. Quem digita a vírgula
 *          também acerta — ela é descartada e a contagem de dígitos é a mesma.
 *
 *          Esta é a MESMA convenção do painel (`formatarEntradaEncerrante` em
 *          `useLeituras.ts`), e a consistência aqui não é estética: é a mesma
 *          pessoa lançando encerrante nos dois lugares.
 *
 *          ⚠️ **Esta heurística é proibida para dinheiro e correta para
 *          encerrante**, e a diferença é o que impede alguém de copiá-la para o
 *          lugar errado. Em dinheiro, o número de casas varia, e supor três
 *          decimais já transformou **R$ 7.436,00 em R$ 7,44 em produção** (é o
 *          `analisarValor` que o `campo-numerico.ts` da `/planilha` substituiu
 *          justamente por isso). O encerrante é o odômetro da bomba: ele tem
 *          três casas SEMPRE, impressas no papel, e é por isso que aqui não há
 *          o que adivinhar.
 *
 *          O custo aceito: quem digitar só a parte inteira (`1740317`) recebe
 *          `1.740,317`, mil vezes menor. É por isso que a tela mostra a leitura
 *          anterior embaixo de cada campo e avisa em âmbar quando o número
 *          retrocede — o erro fica visível antes de gravar.
 */
const mascaraEncerrante = (texto: string): string => {
    const digitos = texto.replace(/\D/g, '');
    if (digitos === '') return '';

    const acolchoado = digitos.padStart(4, '0');
    const decimais = acolchoado.slice(-3);
    const inteiro = acolchoado.slice(0, -3).replace(/^0+(?=\d)/, '');
    const comMilhar = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

    return `${comMilhar},${decimais}`;
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

    // Dia que está sendo fechado. Padrão é hoje — a operação normal — mas o dono
    // precisa poder lançar um dia passado (encerrante esquecido, replay de
    // período). Tudo que depende de data lê daqui, nunca de `hojeIso()` direto.
    const [dataEnvio, setDataEnvio] = useState<string>(() => hojeIso());
    const [enviando, setEnviando] = useState(false);
    const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'erro'; msg: string } | null>(null);

    // Trava o auto-reload do service worker durante TODO o tempo na tela Encerrante.
    // Antes travava só durante o processamento, mas o reload acontecia enquanto a
    // câmera nativa estava aberta (a 1ª foto era perdida e precisava tirar de novo).
    useEffect(() => {
        window.__encerranteBusy = true;
        return () => { window.__encerranteBusy = false; };
    }, []);

    // Mantém a function quente o tempo todo na tela (ping ao abrir + a cada 45s),
    // pra a foto nunca cair num cold start (~1 min).
    useEffect(() => {
        api.aquecerEncerrante();
        const t = setInterval(() => api.aquecerEncerrante(), 45000);
        return () => clearInterval(t);
    }, []);

    // Dias passados sem encerrante (ou com encerrante pela metade). Carregado
    // depois dos bicos, porque depende de saber quantos bicos são esperados.
    const [diasEmFalta, setDiasEmFalta] = useState<DiaEmFalta[]>([]);

    // Incrementa depois de cada envio: as leituras recém-gravadas viram a base
    // do próximo, e o aviso de dias em falta precisa ser refeito.
    const [versaoBase, setVersaoBase] = useState(0);

    useEffect(() => {
        // Trocar o dia no meio de uma carga deixa duas respostas em voo; sem
        // esta flag a que chega por último vence, e a base pode ficar sendo a
        // do dia errado — que é o que `handleEnviar` grava como inicial.
        let ativo = true;
        setCarregandoBase(true);
        Promise.all([
            api.getBicos(POSTO_ID),
            api.getUltimasLeiturasPorBico(POSTO_ID, dataEnvio),
            api.getUltimosPrecosPorBico(POSTO_ID, dataEnvio),
        ])
            .then(([bs, ult, precos]) => {
                if (!ativo) return;
                // Cliente Supabase não tipado com o Database gerado: o join infere `combustivel`
                // como array na estrutura, mas essa FK é many-to-one — em runtime vem objeto único.
                const mapped: BicoInfo[] = (bs as unknown as BicoRow[]).map(b => ({
                    id: b.id,
                    numero: b.numero,
                    combustivel_id: b.combustivel_id,
                    combNome: b.combustivel?.nome ?? '—',
                    combCodigo: b.combustivel?.codigo ?? null,
                    // Cadastro é o preço de HOJE. Num dia passado ele produz valor
                    // errado sem avisar — foi o que fez o replay de 01/01 fechar em
                    // R$ 10.503,77 contra R$ 9.430,34 da planilha. O preço do último
                    // dia lançado manda; o cadastro só entra quando não há dia
                    // anterior nenhum.
                    preco: precos.get(b.id) ?? Number(b.combustivel?.preco_venda ?? 0),
                }));
                setBicos(mapped);
                setUltimas(ult);

                // Falha em silêncio de propósito: o aviso é conveniência, e um
                // erro de rede aqui não pode impedir alguém de enviar o
                // encerrante que está na mão.
                api.diasEmFalta(POSTO_ID, mapped.length)
                    .then(faltas => { if (ativo) setDiasEmFalta(faltas); })
                    .catch(() => { });
            })
            .catch(err => { if (ativo) setFeedback({ tipo: 'erro', msg: err.message || 'Erro ao carregar bicos' }); })
            .finally(() => { if (ativo) setCarregandoBase(false); });
        return () => { ativo = false; };
        // Trocar o dia troca a base: a inicial de cada bico é o fechamento do dia
        // anterior AO ESCOLHIDO, não ao de hoje.
    }, [dataEnvio, versaoBase]);

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
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Não consegui ler a foto. Tente novamente.';
            setFeedback({ tipo: 'erro', msg });
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

    /**
     * Libera o envio: basta um bico com valor, com ou sem foto.
     *
     * @remarks Deliberadamente **não** olha `temLeitura`. O OCR é o caminho
     *          feliz, não o único — foto tremida, rede caindo no posto ou a
     *          função fria deixavam o frentista digitar os números na mão e
     *          descobrir só no fim que o botão continuava travado.
     */
    const temValorParaEnviar = useMemo(
        () => bicos.some(b => parseBR(valores[b.id] || '') > 0),
        [bicos, valores],
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
            .map((b): LinhaLeitura | null => {
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
            .filter((l): l is LinhaLeitura => l !== null);

        if (linhas.length === 0) {
            setFeedback({ tipo: 'erro', msg: 'Nenhum valor preenchido. Fotografe o papel ou digite as leituras.' });
            return;
        }

        setEnviando(true);
        try {
            await api.salvarLeituras({ postoId: POSTO_ID, data: dataEnvio, linhas });
            setFeedback({ tipo: 'ok', msg: `${linhas.length} leituras enviadas para ${rotuloDoDia(dataEnvio)}!` });
            setTemLeitura(false);
            setPreview(null);
            setValores({});
            setDuvidaOcr({});
            // recarrega a base pelo mesmo efeito da data (as que acabamos de gravar
            // viram base), em vez de um fetch solto que corria com a troca de dia
            setVersaoBase(v => v + 1);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Erro ao enviar as leituras.';
            setFeedback({ tipo: 'erro', msg });
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
                        <p className="text-sm text-slate-400">{frentistaNome ?? 'Leitura das bombas'}</p>
                    </div>
                </div>

                {/* Dia do lançamento. Vem em hoje, que é o caso de sempre; trocar
                    serve para o encerrante esquecido e para o replay de período
                    passado. Fica destacado quando NÃO é hoje, para ninguém lançar
                    num dia errado sem perceber. */}
                <label
                    className={`mt-4 flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        dataEnvio === hojeIso()
                            ? 'border-slate-700 bg-slate-900/60'
                            : 'border-amber-500/40 bg-amber-500/10'
                    }`}
                >
                    <span className="text-sm text-slate-400 shrink-0">Dia do encerrante</span>
                    <input
                        type="date"
                        value={dataEnvio}
                        max={hojeIso()}
                        onChange={(e) => setDataEnvio(e.target.value || hojeIso())}
                        className="bg-transparent text-right text-white font-semibold text-sm outline-none"
                    />
                </label>
                {dataEnvio !== hojeIso() && (
                    <p className="mt-1.5 text-xs text-amber-300">
                        Lançando em {rotuloDoDia(dataEnvio)} — não é hoje.
                    </p>
                )}
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

                {/* Dias em falta — silencioso quando não há nenhum. O encerrante
                    passou a depender de uma pessoa só; esquecer um dia não
                    produzia sinal nenhum antes deste bloco. */}
                {diasEmFalta.length > 0 && (
                    <div className="rounded-xl p-3 border bg-amber-500/10 border-amber-500/30">
                        <div className="flex items-start gap-2 text-amber-300 text-sm font-semibold">
                            <CalendarX size={16} className="mt-0.5 shrink-0" />
                            <span>
                                {diasEmFalta.length === 1
                                    ? '1 dia sem o encerrante completo'
                                    : `${diasEmFalta.length} dias sem o encerrante completo`}
                            </span>
                        </div>
                        <ul className="mt-2 space-y-1">
                            {diasEmFalta.map(dia => (
                                <li key={dia.data} className="text-amber-200/80 text-xs flex justify-between gap-3">
                                    <span>{rotuloDoDia(dia.data)}</span>
                                    <span>
                                        {dia.bicosLancados === 0
                                            ? 'nenhum bico'
                                            : `${dia.bicosLancados} de ${dia.bicosEsperados} bicos`}
                                    </span>
                                </li>
                            ))}
                        </ul>
                        <p className="text-amber-200/60 text-[11px] mt-2">
                            Dá para lançar qualquer dia de 2026 enquanto o histórico está sendo reconstruído. Lançar no futuro segue barrado.
                        </p>
                    </div>
                )}

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
                                            <span className="w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center" style={{ backgroundColor: corDoProduto(b.combCodigo).fundo, color: corDoProduto(b.combCodigo).texto }}>
                                                {b.numero}
                                            </span>
                                            <div>
                                                <p className="text-white text-sm font-bold leading-none">Bico {b.numero}</p>
                                                <p className="text-slate-500 text-[11px] mt-0.5">{b.combNome} · R$ {formatNum(b.preco, 2)}/L</p>
                                            </div>
                                        </div>
                                        {litros > 0 && (
                                            <span className="text-emerald-400 text-[11px] font-semibold">{formatNum(litros)} L</span>
                                        )}
                                    </div>
                                    <div className="flex items-end gap-1 border-b border-slate-700/50 pb-1">
                                        <input
                                            type="text"
                                            inputMode="decimal"
                                            value={valores[b.id] || ''}
                                            onChange={e => {
                                                const comMascara = mascaraEncerrante(e.target.value);
                                                setValores(prev => ({ ...prev, [b.id]: comMascara }));
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
                {temValorParaEnviar && (
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
                    disabled={enviando || carregandoBase || !temValorParaEnviar}
                    className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-bold text-white transition-all
                        ${enviando || carregandoBase || !temValorParaEnviar
                            ? 'bg-indigo-600/40 cursor-not-allowed'
                            : 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 shadow-[0_0_20px_rgba(79,70,229,0.3)]'}`}
                >
                    {enviando || carregandoBase ? <RefreshCw size={20} className="animate-spin" /> : <Check size={20} />}
                    {enviando ? 'Enviando…' : carregandoBase ? 'Carregando base do dia…' : 'Confirmar e Enviar Leituras'}
                </button>
            </div>
        </div>
    );
};

export default EncerranteScreen;

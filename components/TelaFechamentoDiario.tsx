import React, { useState, useEffect, useMemo } from 'react';
import {
   Fuel,
   Calendar,
   CheckCircle2,
   AlertTriangle,
   Save as SaveIcon,
   Loader2,
   RefreshCw,
   Printer,
   X,
   Clock,
   User,
   CreditCard,
   Banknote,
   Smartphone,
   FileText,
   HelpCircle,
   Info,
   Plus,
   TrendingUp,
   AlertOctagon,
   TrendingDown,
   Pencil,
   Check,
   ShoppingBag,
   Calculator,
   Building2,
   Activity,
   PieChart as PieChartIcon,
   BarChart3
} from 'lucide-react';
import {
   PieChart,
   Pie,
   Cell,
   ResponsiveContainer,
   Tooltip,
   Legend,
   BarChart,
   Bar,
   XAxis,
   YAxis,
   CartesianGrid
} from 'recharts';
import {
   bicoService,
   leituraService,
   frentistaService,
   turnoService,
   formaPagamentoService,
   fechamentoService,
   fechamentoFrentistaService,
   recebimentoService,
   notificationService,
   combustivelService,
   vendaProdutoService,
   api
} from '../services/api';
import { supabase } from '../services/supabase';
import type { Bico, Bomba, Combustivel, Leitura, Frentista, Turno, FormaPagamento } from '../services/database.types';
import { useAuth } from '../contexts/AuthContext';
import { usePosto } from '../contexts/PostoContext';
import { DifferenceAlert, ProgressIndicator } from './ValidationAlert';

// Imports da refatoração (#7)
import { analisarValor, formatarParaBR } from '../utils/formatters';
import { CORES_COMBUSTIVEL, CORES_GRAFICO_COMBUSTIVEL, CORES_GRAFICO_PAGAMENTO } from '../types/fechamento';
import { useCarregamentoDados } from '../hooks/useCarregamentoDados';
import { usePagamentos } from '../hooks/usePagamentos';
import { useLeituras } from '../hooks/useLeituras';
import { useSessoesFrentistas } from '../hooks/useSessoesFrentistas';
import { useAutoSave } from '../hooks/useAutoSave';
import { useFechamento } from '../hooks/useFechamento';
import type { BicoComDetalhes, EntradaPagamento } from '../types/fechamento';

// [REFATORADO 2026-01-08] Tipos movidos para types/fechamento.ts
// Usando BicoComDetalhes e EntradaPagamento importados acima

// Local state for each frentista's closing session
// Interface FrentistaSession removida (substituída por SessaoFrentista do hook)

// [REFATORADO 2026-01-08] Cores movidas para types/fechamento.ts
// Usando imports acima: CORES_COMBUSTIVEL, CORES_GRAFICO_COMBUSTIVEL, CORES_GRAFICO_PAGAMENTO
const FUEL_COLORS = CORES_COMBUSTIVEL;
const FUEL_CHART_COLORS = CORES_GRAFICO_COMBUSTIVEL;
const PAYMENT_CHART_COLORS = CORES_GRAFICO_PAGAMENTO;

// [REFATORADO 2026-01-08] Turnos agora são carregados do banco de dados
// Mantendo DEFAULT_TURNOS como fallback local
const DEFAULT_TURNOS = [
   { id: 1, nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00' },
   { id: 2, nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00' },
   { id: 3, nome: 'Noite', horario_inicio: '22:00', horario_fim: '06:00' },
];


// --- Utility Functions (moved outside to avoid hoisting issues and pure logic) ---
// [REFATORADO 2026-01-08] Funções parseValue e formatToBR movidas para utils/formatters.ts
// Agora usamos analisarValor e formatarParaBR importados acima

// Aliases para manter compatibilidade
const parseValue = analisarValor;
const formatToBR = formatarParaBR;
/**
 * Formata valor monetário durante a digitação.
 * Permite digitação natural: "10" fica "R$ 10" e o usuário adiciona vírgula e centavos.
 *
 * [RESTAURADO 2026-01-08] Comportamento original (antes da máscara calculadora)
 * Issue #3: Máscara estava obrigando digitar "1,0" para obter "10,00"
 *
 * Exemplos:
 * - Digita "10" → R$ 10
 * - Digita "10," → R$ 10,
 * - Digita "10,5" → R$ 10,5
 * - Digita "10,50" → R$ 10,50
 * - Ao sair do campo (onBlur): "R$ 10" → "R$ 10,00"
 *
 * @param value - Valor digitado
 * @returns Valor formatado como R$ X.XXX ou R$ X.XXX,XX
 */
const formatSimpleValue = (value: string) => {
   if (!value) return '';

   // Remove o prefixo R$ e espaços
   let cleaned = value.replace(/^R\$\s*/, '').trim();

   // Remove pontos de milhar antigos para processar corretamente
   cleaned = cleaned.replace(/\./g, '');

   // Se vazio ou só vírgula isolada
   if (!cleaned || cleaned === ',') return '';

   const parts = cleaned.split(',');
   // Garante apenas números na parte inteira
   let inteiro = parts[0].replace(/[^\d]/g, '');

   // Se não sobrou nada na parte inteira
   if (!inteiro && parts.length === 1) return '';
   if (!inteiro) inteiro = '0';

   // Remove zeros à esquerda (ex: 010 -> 10), mas mantém '0' se for só zero
   inteiro = inteiro.replace(/^0+(?=\d)/, '');

   // Adiciona pontos de milhar na parte inteira
   if (inteiro.length > 3) {
      inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   }

   // Se tem vírgula no valor, mantém a parte decimal como está
   if (parts.length > 1) {
      let decimal = parts.slice(1).join('').replace(/[^\d]/g, '');
      return `R$ ${inteiro},${decimal}`;
   }

   // Se NÃO tem vírgula, retorna SÓ o inteiro (sem ,00)
   // O ,00 será adicionado apenas no onBlur
   return `R$ ${inteiro}`;
};

/**
 * Formata valor ao sair do campo (onBlur).
 * Adiciona os centavos ",00" se o usuário não digitou.
 *
 * @param value - Valor atual do campo
 * @returns Valor com 2 casas decimais garantidas
 */
const formatValueOnBlur = (value: string) => {
   if (!value) return '';

   // Se já tem vírgula, mantém como está
   if (value.includes(',')) return value;

   // Se não tem vírgula, adiciona ,00
   return `${value},00`;
};

// Get payment icon
const getPaymentIcon = (tipo: string) => {
   switch (tipo) {
      case 'dinheiro': return <Banknote size={18} className="text-green-600" />;
      case 'cartao_credito': return <CreditCard size={18} className="text-blue-600" />;
      case 'cartao_debito': return <CreditCard size={18} className="text-purple-600" />;
      case 'pix': return <Smartphone size={18} className="text-cyan-600" />;
      default: return <FileText size={18} className="text-gray-600" />;
   }
};

// Get payment label
const getPaymentLabel = (tipo: string) => {
   switch (tipo) {
      case 'dinheiro': return 'Dinheiro';
      case 'cartao_credito': return 'Cartão Crédito';
      case 'cartao_debito': return 'Cartão Débito';
      case 'pix': return 'PIX';
      default: return tipo;
   }
};

const TelaFechamentoDiario: React.FC = () => {
   const { user } = useAuth();
   const { postoAtivoId, postos, setPostoAtivoById, postoAtivo } = usePosto();

   // [REFATORADO 2026-01-08] Usa hook customizado para carregamento de dados
   // Substitui estados manuais de bicos, frentistas, turnos e função loadData()
   const {
      bicos,
      frentistas,
      turnos,
      carregando: loadingDados,
      erro: erroDados,
      carregarDados
   } = useCarregamentoDados(postoAtivoId);

   // State
   // State
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   // Additional states
   const [selectedTurno, setSelectedTurno] = useState<number | null>(null);

   // [REFATORADO 2026-01-08] Hook useLeituras (precisa vir depois de selectedDate e selectedTurno)
   const {
      leituras,
      carregando: loadingLeituras,
      erro: erroLeituras,
      carregarLeituras,
      alterarInicial,
      alterarFechamento,
      aoSairInicial,
      aoSairFechamento,
      calcLitros: calcLitrosHook,
      calcVenda: calcVendaHook,
      totals,
      getSummaryByCombustivel: getSummaryByCombustivelHook
   } = useLeituras(postoAtivoId, selectedDate, selectedTurno, bicos);

   // [REFATORADO 2026-01-08] Hook useSessoesFrentistas
   const {
      sessoes: sessoesFrentistas,
      carregando: carregandoFrentistas,
      totais: totaisFrentistas,
      carregarSessoes: carregarSessoesFrentistas,
      adicionarFrentista,
      removerFrentista,
      atualizarSessao,
      alterarCampoFrentista,
      aoSairCampoFrentista
   } = useSessoesFrentistas(postoAtivoId);

   // Carrega sessões quando data/turno mudam
   useEffect(() => {
      if (selectedDate && selectedTurno) {
         carregarSessoesFrentistas(selectedDate, selectedTurno);
      }
   }, [selectedDate, selectedTurno, carregarSessoesFrentistas]);

   // [RESTORED] Estados de UI essenciais
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   // frentistaSessions removido (gerenciado pelo hook)
   const [observacoes, setObservacoes] = useState<string>('');
   const [showHelp, setShowHelp] = useState(false);
   const [dayClosures, setDayClosures] = useState<any[]>([]);
   const [activeTab, setActiveTab] = useState<'leituras' | 'financeiro'>('leituras');
   const lastLoadedContext = React.useRef<{ date: string; turno: number | null }>({ date: '', turno: null });

   // Estado para edição de preço inline
   const [editingPrice, setEditingPrice] = useState<number | null>(null); // combustivel_id sendo editado
   const [tempPrice, setTempPrice] = useState<string>('');

   // --- AUTOSAVE LOGIC ---
   // [REFATORADO 2026-01-08] Lógica de autosave extraída para hook useAutoSave
   const {
      restaurado,
      limparAutoSave,
      rascunhoRestaurado
   } = useAutoSave({
      postoId: postoAtivoId,
      dataSelecionada: selectedDate,
      turnoSelecionado: selectedTurno,
      leituras,
      sessoesFrentistas,
      carregando: loading,
      salvando: saving
   });

   // Restaura turno do rascunho quando disponível
   useEffect(() => {
      if (rascunhoRestaurado?.turnoSelecionado && !selectedTurno) {
         setSelectedTurno(rascunhoRestaurado.turnoSelecionado);
      }
   }, [rascunhoRestaurado, selectedTurno]);

   // [REFATORADO 2026-01-08] Hook gerencia pagamentos automaticamente
   const {
      pagamentos: payments,
      totalLiquido,
      totalTaxas,
      alterarPagamento: handlePaymentChange,
      aoSairPagamento: handlePaymentBlur
   } = usePagamentos(postoAtivoId);

   // [REFATORADO 2026-01-08] frentistasTotals substituído por totaisFrentistas do hook

   // [REFATORADO 2026-01-08] Sincroniza loading local com loading do hook
   useEffect(() => {
      setLoading(loadingDados);
      if (erroDados) {
         setError(erroDados);
      }
   }, [loadingDados, erroDados]);

   const loadDayClosures = async () => {
      try {
         const closures = await fechamentoService.getByDate(selectedDate, postoAtivoId);
         setDayClosures(closures);
      } catch (err) {
         console.error('Error loading day closures:', err);
      }
   };

   useEffect(() => {
      if (selectedDate) {
         loadDayClosures();
      }

      if (selectedDate && selectedTurno) {
         // loadFrentistaSessions removido (feito via useEffect do hook)
      } else {
         // setFrentistaSessions([]); gerenciado pelo hook
      }
   }, [selectedDate, selectedTurno, postoAtivoId]);

   // Realtime Subscription para atualizações automáticas do Sistema
   useEffect(() => {
      console.log('Iniciando subscriptions realtime...', { selectedDate, selectedTurno });

      // Canal unificado para monitorar mudanças
      const channel = supabase
         .channel('system-updates')
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'FechamentoFrentista' },
            (payload) => {
               console.log('🔔 Realtime: FechamentoFrentista alterado', payload);
               if (selectedDate && selectedTurno) {
                  console.log('Recarregando frentistas...');
                  carregarSessoesFrentistas(selectedDate, selectedTurno);
               }
            }
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Fechamento' },
            (payload) => {
               console.log('🔔 Realtime: Fechamento alterado', payload);
               if (selectedDate) loadDayClosures();
               if (selectedDate && selectedTurno) carregarSessoesFrentistas(selectedDate, selectedTurno);
            }
         )
         .subscribe((status) => {
            console.log('Status da subscription realtime:', status);
         });

      // DESATIVADO: Polling estava apagando dados digitados pelo usuário
      // O realtime do Supabase é suficiente para receber atualizações do mobile
      /*
      const intervalId = setInterval(() => {
         if (selectedDate && selectedTurno) {
            // Silencioso para não poluir o log, ou com log se preferir debug
            // loadFrentistaSessions(); 
            // Vou usar a função existente mas talvez valha a pena criar uma versão "silent" se tivesse muito log
            loadFrentistaSessions();
         }
      }, 5000);
      */

      return () => {
         supabase.removeChannel(channel);
         // clearInterval(intervalId);
      };
   }, [selectedDate, selectedTurno]);

   // [REFATORADO 2026-01-08] loadFrentistaSessions removido
   // [REFATORADO 2026-01-08] updatePaymentsFromFrentistas removido
   /**
    * Carrega as leituras dos bicos para a data e turno selecionados.
    * 
    * Comportamento:
    * 1. Se houver leituras salvas para o turno, carrega os dados do banco (Modo Edição).
    * 2. Se for uma nova data/turno (Modo Criação), busca a última leitura final do bico 
    *    gravada no sistema para usar como leitura inicial automática.
    * 
    * Nota: A automação agiliza o lançamento diário e histórico, evitando redigitação.
    */
   // [REFATORADO 2026-01-08] loadLeituras removido, hook gerencia carregamento automaticamente
   // useEffect de carregamento removido
   // Effect para recarregar leituras quando data ou turno mudam


   // [REFATORADO 2026-01-08] Handlers substituídos pelos do hook (handleInicialChange -> alterarInicial, etc)
   // Lógica de handlers manuais removida

   // Formata valor com vírgula quando o campo perde o foco
   // Converte qualquer formato para "1.718.359,423" (últimos 3 dígitos são SEMPRE decimais)
   const formatOnBlur = (value: string): string => {
      if (!value) return '';

      // Remove TUDO exceto números (remove pontos e vírgulas)
      let cleaned = value.replace(/[^0-9]/g, '');
      if (cleaned.length === 0) return '';

      // Números muito pequenos (até 3 dígitos): são decimais puros (0,00X)
      if (cleaned.length <= 3) {
         return `0,${cleaned.padStart(3, '0')}`;
      }

      // Separa: últimos 3 dígitos são SEMPRE decimais, resto é inteiro
      let inteiro = cleaned.slice(0, -3);
      const decimal = cleaned.slice(-3);

      // Remove zeros à esquerda da parte inteira
      inteiro = inteiro.replace(/^0+/, '') || '0';

      // Adiciona pontos de milhar
      if (inteiro.length > 3) {
         inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }

      return `${inteiro},${decimal}`;
   };

   // Handler para quando o campo INICIAL perde o foco
   // [REFATORADO 2026-01-08] Handlers de blur substituídos pelo hook
   // Lógica manual removida

   // Formata entrada de encerrante: adiciona pontos de milhar na parte inteira
   // Vírgula deve ser digitada manualmente pelo usuário para separar decimais
   // Ex: "1718359" -> "1.718.359" (apenas milhar)
   // Ex: "1718359,423" -> "1.718.359,423" (mantém vírgula do usuário)
   const formatEncerranteInput = (value: string): string => {
      if (!value) return '';

      // Remove tudo exceto números e vírgula
      let cleaned = value.replace(/[^0-9,]/g, '');
      if (cleaned.length === 0) return '';

      // Se tem vírgula, separa parte inteira e decimal
      if (cleaned.includes(',')) {
         const parts = cleaned.split(',');
         let inteiro = parts[0] || '';
         let decimal = parts.slice(1).join(''); // Pega tudo após a primeira vírgula

         // Remove zeros à esquerda desnecessários na parte inteira (exceto se for só "0")
         if (inteiro.length > 1) {
            inteiro = inteiro.replace(/^0+/, '') || '0';
         }
         if (inteiro === '') inteiro = '0';

         // Adiciona pontos de milhar na parte inteira
         if (inteiro.length > 3) {
            inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
         }

         return `${inteiro},${decimal}`;
      }

      // Sem vírgula: apenas formata parte inteira com pontos de milhar
      let inteiro = cleaned;

      // Remove zeros à esquerda desnecessários (exceto se for só "0")
      if (inteiro.length > 1) {
         inteiro = inteiro.replace(/^0+/, '') || '0';
      }

      // Adiciona pontos de milhar
      if (inteiro.length > 3) {
         inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      }

      return inteiro;
   };

   // Inicia edição de preço inline
   const handleEditPrice = (combustivelId: number, currentPrice: number) => {
      setEditingPrice(combustivelId);
      setTempPrice(currentPrice.toFixed(2).replace('.', ','));
   };

   // Salva novo preço no banco e atualiza estado local
   const handleSavePrice = async (combustivelId: number) => {
      try {
         const newPrice = parseFloat(tempPrice.replace(',', '.'));
         if (isNaN(newPrice) || newPrice <= 0) {
            setError('Preço inválido. Digite um valor maior que zero.');
            return;
         }

         // Atualiza no banco
         await combustivelService.update(combustivelId, { preco_venda: newPrice });

         // [REFATORADO 2026-01-08] Hook gerencia estado de bicos (read-only)
         // Recarrega dados para refletir mudança
         await carregarDados();

         setEditingPrice(null);
         setTempPrice('');
         setSuccess(`Preço atualizado para R$ ${newPrice.toFixed(2).replace('.', ',')}`);

         // Limpa mensagem após 2 segundos
         setTimeout(() => setSuccess(null), 2000);
      } catch (err) {
         console.error('Erro ao salvar preço:', err);
         setError('Erro ao salvar preço. Tente novamente.');
      }
   };

   // [REFATORADO 2026-01-08] Cálculos consolidados extraídos para hook useFechamento
   // O hook centraliza: totalProdutos, totalPagamentos, diferença, validações, etc.
   const {
      totalProdutos,
      totalPagamentos,
      diferenca,
      diferencaPercentual,
      temLeiturasInvalidas,
      podeFechar,
      exibicao
   } = useFechamento(
      bicos as BicoComDetalhes[],
      leituras,
      sessoesFrentistas,
      payments as EntradaPagamento[]
   );

   // Alias para compatibilidade com código antigo
   const totalPayments = totalPagamentos;

   // Calculate percentage (mantido para uso em gráficos)
   const calcPercentage = (litros: number): number => {
      if (totals.litros === 0) return 0;
      return (litros / totals.litros) * 100;
   };

   // Check if difference is significant (> R$ 100)
   const isDifferenceSignificant = Math.abs(diferenca) > 100;
   const isDifferenceNegative = diferenca < 0;

   // [REFATORADO 2026-01-08] Handlers removidos (handleAddFrentista, updateFrentistaSession, handleRemoveFrentista)
   // Substituídos pelos handlers do hook useSessoesFrentistas

   // Handle cancel
   const handleCancel = () => {
      // [REFATORADO 2026-01-08] Hook gerencia estado
      // setLeituras({});
      // [REFATORADO 2026-01-08] payments agora é read-only do hook
      // setPayments(prev => prev.map(p => ({ ...p, valor: '' })));
      // setFrentistaSessions([]); // Gerenciado pelo hook
      setSelectedTurno(null);
      setSuccess(null);
      setError(null);
      // [REFATORADO 2026-01-08] Hook gerencia carregamento automaticamente
      window.location.reload();
   };

   // Handle print
   const handlePrint = () => {
      window.print();
   };

   // Handle save
   const handleSave = async () => {
      if (!user) {
         setError('Usuário não autenticado. Por favor, faça login novamente.');
         return;
      }

      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         // 1. Get or Create Daily Closing (Fechamento) per shift
         if (!selectedTurno) {
            setError('Por favor, selecione o turno antes de salvar.');
            setSaving(false);
            return;
         }

         let fechamento = await fechamentoService.getByDateAndTurno(selectedDate, selectedTurno, postoAtivoId);

         if (!fechamento) {
            console.log("Criando novo fechamento para data:", selectedDate, "turno:", selectedTurno);
            fechamento = await fechamentoService.create({
               data: selectedDate,
               usuario_id: user.id,
               turno_id: selectedTurno,
               status: 'RASCUNHO',
               posto_id: postoAtivoId
            });
         } else {
            // Limpa dados anteriores para evitar duplicação ao re-salvar
            // Esta etapa é crucial para garantir que, ao re-salvar um fechamento existente,
            // os registros dependentes (leituras, fechamentos de frentista, recebimentos)
            // sejam removidos e recriados com os dados mais recentes, evitando duplicações
            // e mantendo a integridade dos dados.
            await Promise.all([
               leituraService.deleteByShift(selectedDate, selectedTurno, postoAtivoId),
               // Exclui todos os fechamentos de frentista vinculados a este fechamento principal.
               // Importante: Antes da exclusão, o método remove notificações vinculadas e
               // desvincula notas de frentista e vendas de produtos para evitar violações de integridade
               // (Foreign Key Constraints) e permitir que os registros originais sejam preservados sem o vínculo.
               fechamentoFrentistaService.deleteByFechamento(fechamento.id),
               recebimentoService.deleteByFechamento(fechamento.id)
            ]);
         }

         // 2. Save Readings (Leituras)
         const leiturasToCreate = bicos
            .filter(bico => {
               const i = parseValue(leituras[bico.id]?.inicial || '');
               const f = parseValue(leituras[bico.id]?.fechamento || '');
               return f > i;
            })
            .map(bico => ({
               bico_id: bico.id,
               data: selectedDate,
               leitura_inicial: parseValue(leituras[bico.id]?.inicial || ''),
               leitura_final: parseValue(leituras[bico.id]?.fechamento || ''),
               combustivel_id: bico.combustivel.id,
               preco_litro: bico.combustivel.preco_venda,
               usuario_id: user.id,
               turno_id: selectedTurno,
               posto_id: postoAtivoId
            }));

         if (leiturasToCreate.length === 0) {
            setError('Nenhuma leitura válida para salvar. O fechamento deve ser maior que o inicial.');
            setSaving(false);
            return;
         }

         await leituraService.bulkCreate(leiturasToCreate);

         // 3. Save Attendant Closings (FechamentoFrentista)
         // 3. Save Attendant Closings (FechamentoFrentista)
         if (sessoesFrentistas.length > 0) {
            const frentistasToCreate = sessoesFrentistas
               .filter(fs => fs.frentistaId !== null)
               .map(fs => {
                  const totalInformado =
                     parseValue(fs.valor_cartao_debito) +
                     parseValue(fs.valor_cartao_credito) +
                     parseValue(fs.valor_nota) +
                     parseValue(fs.valor_pix) +
                     parseValue(fs.valor_dinheiro) +
                     parseValue(fs.valor_baratao);

                  const totalVendido = parseValue(fs.valor_encerrante);

                  // Se o encerrante for informado, a diferença é automática (falta)
                  // Caso contrário usa a lógica de valor_conferido manual
                  const diferencaFinal = totalVendido > 0 ? (totalVendido - totalInformado) : 0;
                  const valorConferido = totalVendido > 0 ? totalVendido : (parseValue(fs.valor_conferido) || totalInformado);

                  return {
                     fechamento_id: fechamento!.id,
                     frentista_id: fs.frentistaId!,
                     valor_cartao: parseValue(fs.valor_cartao_debito) + parseValue(fs.valor_cartao_credito), // Mantém retrocompatibilidade
                     valor_cartao_debito: parseValue(fs.valor_cartao_debito),
                     valor_cartao_credito: parseValue(fs.valor_cartao_credito),
                     valor_dinheiro: parseValue(fs.valor_dinheiro),
                     valor_pix: parseValue(fs.valor_pix),
                     valor_nota: parseValue(fs.valor_nota),
                     baratao: parseValue(fs.valor_baratao),
                     encerrante: totalVendido,
                     diferenca_calculada: diferencaFinal,
                     valor_conferido: valorConferido,
                     observacoes: (fs.status === 'conferido' && !(fs.observacoes || '').includes('[CONFERIDO]'))
                        ? `[CONFERIDO] ${fs.observacoes || ''}`.trim()
                        : (fs.observacoes || ''),
                     posto_id: postoAtivoId
                  };
               });

            if (frentistasToCreate.length > 0) {
               const createdFechamentos = await fechamentoFrentistaService.bulkCreate(frentistasToCreate);

               if (createdFechamentos) {
                  // IDs atualizados automaticamente ao recarregar dados
               }

               // Enviar notificações para frentistas com diferença negativa (falta de caixa)
               for (const frenData of frentistasToCreate) {
                  // ... rest of notification logic ...
                  if (frenData.diferenca_calculada > 0) {
                     try {
                        // Buscar o fechamento criado para obter o ID
                        const createdRecord = createdFechamentos?.find(
                           (f: any) => f.frentista_id === frenData.frentista_id
                        );

                        if (createdRecord) {
                           await notificationService.sendFaltaCaixaNotification(
                              frenData.frentista_id,
                              createdRecord.id,
                              frenData.diferenca_calculada
                           );
                        }
                     } catch (notifError) {
                        console.error('Erro ao enviar notificação:', notifError);
                     }
                  }
               }
            }
         }

         // 4. Save Detailed Receipts (Recebimento)
         const recebimentosToCreate = payments
            .filter(p => parseValue(p.valor) > 0)
            .map(p => ({
               fechamento_id: fechamento.id,
               forma_pagamento_id: p.id,
               valor: parseValue(p.valor),
               observacoes: 'Fechamento Geral'
            }));

         if (recebimentosToCreate.length > 0) {
            await recebimentoService.bulkCreate(recebimentosToCreate);
         }

         // 5. Update Fechamento status and totals
         await fechamentoService.update(fechamento.id, {
            status: 'FECHADO',
            total_vendas: totals.valor + totalProdutos,
            total_recebido: totalPayments,
            diferenca: diferenca,
            observacoes: observacoes
         });

         setSuccess(`${leiturasToCreate.length} leituras e fechamento financeiro salvos com sucesso!`);

         // Reset fechamento values
         const updatedLeituras = { ...leituras };
         bicos.forEach(bico => {
            if (updatedLeituras[bico.id]) {
               updatedLeituras[bico.id].fechamento = '';
            }
         });
         // [REFATORADO 2026-01-08] Recarrega leituras do banco
         await carregarLeituras();
         // setLeituras(updatedLeituras);

         // Reset payments
         // [REFATORADO 2026-01-08] payments agora é read-only do hook
         // setPayments(prev => prev.map(p => ({ ...p, valor: '' })));
         setObservacoes('');
         // setFrentistaSessions([]) removido - hook recarrega
         localStorage.removeItem('daily_closing_draft_v1'); // Limpa rascunho após salvar

         // [REFATORADO 2026-01-08] Hook recarrega dados automaticamente
         await loadDayClosures();

      } catch (err: any) {
         console.error('Full error object:', err);
         console.error('Error saving readings:', err?.message || err);
         setError(`Erro ao salvar: ${err?.message || 'Erro desconhecido'}`);
      } finally {
         setSaving(false);
      }
   };


   if (loading) {
      return (
         <div className="flex items-center justify-center min-h-screen">
            <div className="flex flex-col items-center gap-4">
               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
               <span className="text-gray-500 dark:text-gray-400 font-medium">Carregando dados...</span>
            </div>
         </div>
      );
   }

   const summaryData = getSummaryByCombustivelHook();

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32 print:pb-0 print:max-w-none">

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
            <div>
               <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-black text-gray-900 dark:text-white">Fechamento de Caixa</h1>
                  <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200 dark:border-gray-700">
                     <Building2 size={16} className="text-gray-500 dark:text-gray-400" />
                     <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 transform translate-y-[1px]">
                        {postoAtivo?.nome}
                     </span>
                  </div>
               </div>
               <p className="text-gray-500 dark:text-gray-400 mt-2">Insira as leituras de fechamento para calcular as vendas do dia.</p>
            </div>

            <div className="flex flex-wrap gap-4">
               {/* Posto Selector - OCULTO (modo posto único) */}
               {/*
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <Building2 size={12} />
                     Posto
                  </span>
                  <select
                     value={postoAtivoId}
                     onChange={(e) => setPostoAtivoById(Number(e.target.value))}
                     className="h-[42px] px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors min-w-[200px]"
                  >
                     {postos.map(posto => (
                        <option key={posto.id} value={posto.id}>
                           {posto.nome}
                        </option>
                     ))}
                  </select>
               </div>
               */}

               {/* Date Picker */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <Calendar size={12} />
                     Data do Fechamento
                  </span>
                  <div className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm overflow-hidden">
                     <Calendar size={18} className="text-gray-400 ml-4" />
                     <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-2 py-2.5 text-sm font-semibold text-gray-900 dark:text-white outline-none border-none bg-transparent dark:bg-gray-800"
                     />
                  </div>
               </div>

               {/* Turno Selector - OCULTO (seleção automática em background) */}
               {/* 
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                     <Clock size={12} />
                     Turno
                  </span>
                  <select
                     value={selectedTurno || ''}
                     onChange={(e) => setSelectedTurno(e.target.value ? Number(e.target.value) : null)}
                     className="h-[42px] px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm text-sm font-semibold text-gray-900 dark:text-white outline-none cursor-pointer hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                     <option value="">Selecionar turno...</option>
                     {turnos.map(turno => (
                        <option key={turno.id} value={turno.id}>
                           {turno.nome}
                        </option>
                     ))}
                  </select>
               </div>
               */}

               {/* Refresh Button */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
                  <button
                     onClick={() => {
                        carregarDados();
                        if (selectedDate) loadDayClosures();
                        if (selectedDate && selectedTurno) carregarSessoesFrentistas(selectedDate, selectedTurno);
                     }}
                     className="flex items-center gap-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2.5 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                     title="Atualizar todos os dados"
                  >
                     <RefreshCw size={18} className="text-gray-500 dark:text-gray-400" />
                  </button>
               </div>

               {/* Help Button */}
               <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">&nbsp;</span>
                  <button
                     onClick={() => setShowHelp(!showHelp)}
                     className={`flex items-center gap-2 border rounded-lg px-4 py-2.5 shadow-sm transition-colors ${showHelp ? 'bg-blue-50 border-blue-300 text-blue-600' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                     title="Ajuda"
                  >
                     <HelpCircle size={18} />
                  </button>
               </div>
            </div>
         </div>

         {/* Help Panel */}
         {
            showHelp && (
               <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 print:hidden">
                  <div className="flex items-start gap-4">
                     <div className="p-2 bg-blue-100 rounded-lg">
                        <Info size={24} className="text-blue-600" />
                     </div>
                     <div className="flex-1">
                        <h3 className="font-bold text-blue-900 mb-3">Como preencher o fechamento</h3>
                        <ul className="space-y-2 text-sm text-blue-800">
                           <li className="flex items-start gap-2">
                              <span className="font-bold text-blue-600">1.</span>
                              <span><strong>Data e Turno:</strong> Selecione a data do fechamento e o turno de trabalho.</span>
                           </li>
                           <li className="flex items-start gap-2">
                              <span className="font-bold text-blue-600">2.</span>
                              <span><strong>Leituras:</strong> O valor <em>Inicial</em> é preenchido automaticamente. Digite o valor de <em>Fechamento</em>.</span>
                           </li>
                           <li className="flex items-start gap-2">
                              <span className="font-bold text-blue-600">3.</span>
                              <span><strong>Formato:</strong> Use vírgula como separador decimal (ex: 1.234,567).</span>
                           </li>
                           <li className="flex items-start gap-2">
                              <span className="font-bold text-blue-600">4.</span>
                              <span><strong>Cálculo:</strong> O sistema calcula automaticamente os litros e valores ao digitar.</span>
                           </li>
                        </ul>
                     </div>
                     <button
                        onClick={() => setShowHelp(false)}
                        className="p-1 hover:bg-blue-100 rounded-lg transition-colors"
                     >
                        <X size={18} className="text-blue-600" />
                     </button>
                  </div>
               </div>
            )
         }

         {/* Error/Success Messages */}
         {
            error && (
               <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 font-medium flex items-center gap-2 print:hidden">
                  <AlertTriangle size={18} />
                  {error}
               </div>
            )
         }
         {
            success && (
               <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 font-medium flex items-center gap-2 print:hidden">
                  <CheckCircle2 size={18} />
                  {success}
               </div>
            )
         }

         {/* Print Header */}
         <div className="hidden print:block mb-8">
            <div className="text-center border-b-2 border-gray-800 pb-4 mb-4">
               <h1 className="text-2xl font-black">FECHAMENTO DE CAIXA</h1>
               <p className="text-lg mt-2">Data: {new Date(selectedDate).toLocaleDateString('pt-BR')}</p>
               {/* Turno removido - modo diário simplificado */}
               {sessoesFrentistas.length > 0 && (
                  <p>Frentistas: {sessoesFrentistas.map(fs => frentistas.find(f => f.id === fs.frentistaId)?.nome).filter(Boolean).join(', ')}</p>
               )}
            </div>
         </div>

         {/* Tab Navigation */}
         <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-1.5 print:hidden">
            <div className="flex gap-1">
               <button
                  onClick={() => setActiveTab('leituras')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'leituras' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
               >
                  <Fuel size={18} />
                  Leituras de Bomba
               </button>
               <button
                  onClick={() => setActiveTab('financeiro')}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-bold text-sm transition-all ${activeTab === 'financeiro' ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
               >
                  <CreditCard size={18} />
                  Fechamento Financeiro
               </button>
            </div>
         </div>

         {/* Aba Leituras */}
         <div className={activeTab === 'leituras' ? 'contents' : 'hidden'}>
            {/* Main Table - Venda Concentrador (EXATO como planilha) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="px-6 py-4 border-b bg-gradient-to-r from-yellow-50 to-green-50 dark:from-yellow-900/20 dark:to-green-900/20 border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                     <Fuel size={20} className="text-blue-600" />
                     Venda Concentrador
                  </h2>
                  <span className="lg:hidden text-xs text-blue-600 dark:text-blue-400 font-medium animate-pulse flex items-center gap-1">
                     <div className="flex gap-0.5">
                        <span className="w-1 h-1 bg-blue-600 rounded-full opacity-40"></span>
                        <span className="w-1 h-1 bg-blue-600 rounded-full opacity-70"></span>
                        <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                     </div>
                     Deslize
                  </span>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[900px]">
                     <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-xs uppercase font-bold text-gray-600 dark:text-gray-300">
                           <th className="px-4 py-3 text-left">Produtos</th>
                           <th className="px-4 py-3 text-right">Inicial</th>
                           <th className="px-4 py-3 text-right bg-yellow-50 dark:bg-yellow-900/20">Fechamento</th>
                           <th className="px-4 py-3 text-right">Litros (L)</th>
                           <th className="px-4 py-3 text-right">Valor LT $</th>
                           <th className="px-4 py-3 text-right">Venda bico R$</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {bicos.map((bico) => {
                           const colors = FUEL_COLORS[bico.combustivel.codigo] || FUEL_COLORS['GC'];
                           const inicial = leituras[bico.id]?.inicial || '';
                           const fechamento = leituras[bico.id]?.fechamento || '';
                           const litrosData = calcLitrosHook(bico.id);
                           const vendaData = calcVendaHook(bico.id);
                           // Validação inline simples: fechamento > inicial
                           const isValid = (() => {
                              const i = parseValue(leituras[bico.id]?.inicial || '');
                              const f = parseValue(leituras[bico.id]?.fechamento || '');
                              return f > i;
                           })();

                           return (
                              <tr key={bico.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 {/* Produtos - Combustivel + Bico */}
                                 <td className="px-4 py-3 font-bold text-gray-900 dark:text-white">
                                    {bico.combustivel.codigo}, Bico {bico.numero.toString().padStart(2, '0')}
                                 </td>

                                 {/* Inicial (INPUT) */}
                                 <td className="px-4 py-3">
                                    <input
                                       type="text"
                                       value={leituras[bico.id]?.inicial || ''}
                                       onChange={(e) => alterarInicial(bico.id, e.target.value)}
                                       onBlur={() => aoSairInicial(bico.id)}
                                       className="w-full text-right font-mono py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                                       placeholder="0,000"
                                    />
                                 </td>

                                 {/* Fechamento (INPUT) */}
                                 <td className="px-4 py-3 bg-yellow-50/50 dark:bg-yellow-900/10">
                                    <input
                                       type="text"
                                       value={leituras[bico.id]?.fechamento || ''}
                                       onChange={(e) => alterarFechamento(bico.id, e.target.value)}
                                       onBlur={() => aoSairFechamento(bico.id)}
                                       className={`w-full text-right font-mono py-2 px-3 rounded-lg border outline-none
                                    ${fechamento && !isValid
                                             ? 'border-red-300 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                                             : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100'}
                                    `}
                                       placeholder="0,000"
                                    />
                                 </td>

                                 {/* Litros (CALCULADO - exibe "-" quando inválido) */}
                                 <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                                    {litrosData.display !== '-' ? `${litrosData.display} L` : '-'}
                                 </td>

                                 {/* Valor LT $ (EDITÁVEL - clique no lápis para alterar) */}
                                 <td className="px-4 py-3 text-right font-mono text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                                    {editingPrice === bico.combustivel.id ? (
                                       <div className="flex items-center justify-end gap-1">
                                          <span className="text-xs text-gray-400">R$</span>
                                          <input
                                             type="text"
                                             value={tempPrice}
                                             onChange={(e) => setTempPrice(e.target.value.replace(/[^0-9,]/g, ''))}
                                             onKeyDown={(e) => {
                                                if (e.key === 'Enter') handleSavePrice(bico.combustivel.id);
                                                if (e.key === 'Escape') setEditingPrice(null);
                                             }}
                                             className="w-16 text-right py-1 px-2 border border-blue-300 rounded text-sm font-mono bg-white dark:bg-gray-700 dark:text-white focus:ring-1 focus:ring-blue-200 outline-none"
                                             autoFocus
                                          />
                                          <button
                                             onClick={() => handleSavePrice(bico.combustivel.id)}
                                             className="p-1 text-green-600 hover:bg-green-50 rounded"
                                             title="Salvar"
                                          >
                                             <Check size={14} />
                                          </button>
                                          <button
                                             onClick={() => setEditingPrice(null)}
                                             className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                                             title="Cancelar"
                                          >
                                             <X size={14} />
                                          </button>
                                       </div>
                                    ) : (
                                       <div className="flex items-center justify-end gap-1 group">
                                          <span>R$ {bico.combustivel.preco_venda.toFixed(2).replace('.', ',')}</span>
                                          <button
                                             onClick={() => handleEditPrice(bico.combustivel.id, bico.combustivel.preco_venda)}
                                             className="p-1 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                             title="Editar preço"
                                          >
                                             <Pencil size={12} />
                                          </button>
                                       </div>
                                    )}
                                 </td>

                                 {/* Venda bico R$ (CALCULADO - exibe "-" quando litros = "-") */}
                                 <td className="px-4 py-3 text-right font-mono font-bold text-gray-700 dark:text-gray-300">
                                    {vendaData.display}
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>

                     {/* TOTAL Row (EXATO como planilha - "RES X,XX") */}
                     <tfoot>
                        <tr className="bg-gray-200 dark:bg-gray-700 font-black text-gray-900 dark:text-white border-t-2 border-gray-300 dark:border-gray-600">
                           <td className="px-4 py-4">Total.</td>
                           <td className="px-4 py-4 text-right">-</td>
                           <td className="px-4 py-4 text-right">-</td>
                           <td className="px-4 py-4 text-right">-</td>
                           <td className="px-4 py-4 text-right">-</td>
                           <td className="px-4 py-4 text-right font-mono text-green-700 dark:text-green-400 text-lg">
                              RES {totals.valorDisplay}
                           </td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>

            {/* Summary by Fuel Type */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">Resumo por Combustível</h2>
               </div>

               <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                     <thead>
                        <tr className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white uppercase font-bold text-xs border-b border-gray-200 dark:border-gray-600">
                           <th className="px-4 py-3 text-left bg-gray-50 dark:bg-gray-800">Combustível</th>
                           <th className="px-4 py-3 text-right bg-gray-50 dark:bg-gray-800">Litros (L)</th>
                           <th className="px-4 py-3 text-right bg-gray-50 dark:bg-gray-800">Valor R$</th>
                           <th className="px-4 py-3 text-right bg-gray-50 dark:bg-gray-800">%</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {summaryData.map((item) => {
                           const colors = FUEL_COLORS[item.codigo] || FUEL_COLORS['GC'];
                           const percentage = calcPercentage(item.litros);

                           return (
                              <tr key={item.codigo} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                 <td className="px-4 py-3">
                                    <span className="inline-block px-3 py-1 rounded border border-gray-300 dark:border-gray-600 font-bold text-sm shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white">
                                       {item.nome}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 rounded font-mono font-bold text-sm border border-gray-300 dark:border-gray-600">
                                       {formatToBR(item.litros, 3)} L
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 rounded font-mono font-bold text-sm border border-gray-300 dark:border-gray-600">
                                       {item.valor.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                       })}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white px-2 py-1 rounded font-bold text-sm border border-gray-300 dark:border-gray-600">
                                       {percentage.toFixed(1)}%
                                    </span>
                                 </td>
                              </tr>
                           );
                        })}
                     </tbody>
                     <tfoot>
                        <tr className="bg-gray-100 dark:bg-gray-800 font-black text-gray-700 dark:text-gray-300 border-t-4 border-gray-200 dark:border-gray-700">
                           <td className="px-4 py-4 text-gray-500 uppercase tracking-wider">TOTAL</td>
                           <td className="px-4 py-4 text-right font-mono text-blue-700 dark:text-blue-400 text-xl">
                              {totals.litrosDisplay} L
                           </td>
                           <td className="px-4 py-4 text-right font-mono text-green-600 dark:text-green-400 text-xl">
                              {totals.valorDisplay}
                           </td>
                           <td className="px-4 py-4 text-right text-gray-800 dark:text-white text-lg">100%</td>
                        </tr>
                     </tfoot>
                  </table>
               </div>
            </div>

            {/* Charts Section - Requested by Owner */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               {/* Chart 1: Volume por Combustível */}
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <TrendingUp size={16} className="text-blue-500" />
                     Volume por Combustível (L)
                  </h3>
                  <div className="flex-1 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={summaryData.filter(item => item.litros > 0)}
                           margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                           <XAxis
                              dataKey="codigo"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                              dy={10}
                           />
                           <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748B', fontSize: 11 }}
                           />
                           <Tooltip
                              cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                              formatter={(value: number) => [`${value.toFixed(3)} L`, 'Volume']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           />
                           <Bar dataKey="litros" radius={[6, 6, 0, 0]} maxBarSize={60}>
                              {summaryData.filter(item => item.litros > 0).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={FUEL_CHART_COLORS[entry.codigo] || '#CBD5E1'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Chart 2: Receita por Combustível */}
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <Banknote size={16} className="text-green-500" />
                     Faturamento por Combustível (R$)
                  </h3>
                  <div className="flex-1 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                           data={summaryData.filter(item => item.valor > 0)}
                           margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                           <XAxis
                              dataKey="codigo"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748B', fontSize: 12, fontWeight: 700 }}
                              dy={10}
                           />
                           <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fill: '#64748B', fontSize: 11 }}
                              tickFormatter={(value) => `R$${value / 1000}k`}
                           />
                           <Tooltip
                              cursor={{ fill: '#F1F5F9', opacity: 0.5 }}
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Valor']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           />
                           <Bar dataKey="valor" radius={[6, 6, 0, 0]} maxBarSize={60}>
                              {summaryData.filter(item => item.valor > 0).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={FUEL_CHART_COLORS[entry.codigo] || '#CBD5E1'} />
                              ))}
                           </Bar>
                        </BarChart>
                     </ResponsiveContainer>
                  </div>
               </div>

               {/* Chart 3: Formas de Pagamento */}
               <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col h-[400px]">
                  <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                     <CreditCard size={16} className="text-purple-500" />
                     Distribuição de Pagamentos
                  </h3>
                  <div className="flex-1 w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                           <Pie
                              data={payments.filter(p => parseValue(p.valor) > 0).map(p => ({ name: p.nome, value: parseValue(p.valor) }))}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              nameKey="name"
                           >
                              {payments.filter(p => parseValue(p.valor) > 0).map((entry, index) => (
                                 <Cell key={`cell-${index}`} fill={PAYMENT_CHART_COLORS[index % PAYMENT_CHART_COLORS.length]} />
                              ))}
                           </Pie>
                           <Tooltip
                              formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Montante']}
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                           />
                           <Legend
                              verticalAlign="bottom"
                              align="center"
                              iconType="circle"
                              layout="horizontal"
                              wrapperStyle={{ paddingTop: '20px' }}
                           />
                        </PieChart>
                     </ResponsiveContainer>
                  </div>
               </div>
            </div>
         </div>

         {/* Aba Financeiro */}
         <div className={activeTab === 'financeiro' ? 'contents' : 'hidden'}>

            {/* Timeline de Status dos Turnos - OCULTO (modo diário simplificado) */}
            {/* 
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6 print:hidden">
               <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Clock size={14} />
                  Status dos Turnos ({selectedDate ? new Date(selectedDate).toLocaleDateString('pt-BR') : '-'})
               </h3>
               <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-thin">
                  {turnos.map((t) => {
                     const closure = dayClosures.find(c => c.turno_id === t.id);
                     const isCurrent = t.id === selectedTurno;
                     const status = closure ? closure.status : 'PENDENTE';
                     const statusColor = status === 'FECHADO' ? 'bg-green-100 text-green-700 border-green-200' :
                        status === 'RASCUNHO' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' :
                           'bg-gray-100 text-gray-400 border-gray-200';

                     return (
                        <div
                           key={t.id}
                           className={`flex-1 min-w-[140px] p-3 rounded-lg border ${isCurrent ? 'ring-2 ring-blue-500 ring-offset-2' : ''} ${status === 'FECHADO' ? 'bg-green-50 border-green-200' : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'} transition-all`}
                        >
                           <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t.nome}</span>
                              {status === 'FECHADO' && <CheckCircle2 size={14} className="text-green-600" />}
                           </div>
                           <div className={`text-[10px] font-bold px-2 py-1 rounded inline-block mb-1 ${statusColor}`}>
                              {status === 'FECHADO' ? 'FECHADO' : status === 'RASCUNHO' ? 'EM ABERTO' : 'PENDENTE'}
                           </div>
                           {closure && (
                              <div className="mt-1 text-xs font-bold text-gray-900 dark:text-gray-100">
                                 {(closure.valor_total_liquido || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </div>
                           )}
                        </div>
                     );
                  })}
               </div>
            </div>
            */}

            {/* Global Payment Recording (Stage 2) */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
               <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <CreditCard size={20} className="text-gray-600 dark:text-gray-400" />
                     Fechamento Financeiro (Totais do Dia)
                  </h2>
                  <div className="flex items-center gap-4">
                     <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black text-gray-400 uppercase">Diferença Global</span>
                        <span className={`text-sm font-black ${Math.abs(diferenca) < 0.01 ? 'text-gray-400' : (diferenca >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400')}`}>
                           {diferenca.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                  </div>
               </div>

               <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                     {payments.map((payment, index) => (
                        <div key={payment.id} className="p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-700/50 hover:bg-white dark:hover:bg-gray-700 hover:border-blue-100 dark:hover:border-blue-800 transition-all">
                           <div className="flex items-center gap-3 mb-3">
                              <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                 {getPaymentIcon(payment.tipo)}
                              </div>
                              <div>
                                 <p className="text-xs font-black text-gray-400 uppercase leading-none">{getPaymentLabel(payment.tipo)}</p>
                                 <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">{payment.nome}</p>
                              </div>
                           </div>
                           <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-bold">R$</span>
                              <input
                                 type="text"
                                 value={payment.valor}
                                 onChange={(e) => handlePaymentChange(index, e.target.value)}
                                 placeholder="0,00"
                                 className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-base font-black text-gray-900 dark:text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 dark:focus:ring-blue-900/50 outline-none transition-all"
                              />
                           </div>
                           {payment.taxa > 0 && (
                              <div className="mt-2 flex justify-between items-center text-[10px]">
                                 <span className="text-gray-400 font-bold uppercase tracking-tighter">Taxa: {payment.taxa}%</span>
                                 <span className="text-gray-500 dark:text-gray-400 font-mono">
                                    - {(parseValue(payment.valor) * (payment.taxa / 100)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </span>
                              </div>
                           )}
                        </div>
                     ))}
                  </div>

                  {/* Payment Summary Footer */}
                  <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-8">
                     {/* Indicador de valores dos frentistas (mobile) */}
                     {sessoesFrentistas.length > 0 && (
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                              <Smartphone size={10} />
                              Total Frentistas (App)
                           </span>
                           <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                              {totaisFrentistas.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </span>
                        </div>
                     )}
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bruto Informado</span>
                        <span className="text-xl font-black text-gray-900 dark:text-white">
                           {totalPayments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total de Taxas</span>
                        <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                           - {totalTaxas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                     <div className="flex flex-col">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Líquido Estimado</span>
                        <span className="text-xl font-black text-green-600 dark:text-green-400">
                           {totalLiquido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
         </div>{/* End Aba Financeiro */}

         {/* Gráfico de Distribuição Financeira */}
         <div className={activeTab === 'financeiro' ? 'contents' : 'hidden'}>
            {(() => {
               const totais = {
                  dinheiro: 0,
                  cartaoCredito: 0,
                  cartaoDebito: 0,
                  pix: 0,
                  notaPrazo: 0,
                  outros: 0
               };

               payments?.forEach(p => {
                  const val = parseValue(p.valor);
                  if (p.tipo === 'dinheiro') totais.dinheiro += val;
                  else if (p.tipo === 'cartao_credito') totais.cartaoCredito += val;
                  else if (p.tipo === 'cartao_debito') totais.cartaoDebito += val;
                  else if (p.tipo === 'pix') totais.pix += val;
                  else if (p.tipo === 'nota_prazo' || p.tipo === 'nota_vale') totais.notaPrazo += val;
                  else totais.outros += val;
               });

               const totalGeral = Object.values(totais).reduce((prev, curr) => prev + curr, 0) || 0.01;

               return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 mt-6 print:break-inside-avoid">
                     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                           <PieChartIcon size={16} className="text-blue-500" />
                           Distribuição da Receita
                        </h3>
                        <div className="h-64">
                           <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                 <Pie
                                    data={[
                                       { name: 'Dinheiro', value: totais.dinheiro },
                                       { name: 'Cartão C.', value: totais.cartaoCredito },
                                       { name: 'Cartão D.', value: totais.cartaoDebito },
                                       { name: 'Pix', value: totais.pix },
                                       { name: 'Nota/Vale', value: totais.notaPrazo },
                                       { name: 'Outros', value: totais.outros }
                                    ].filter(d => d.value > 0)}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                 >
                                    <Cell fill="#22c55e" />
                                    <Cell fill="#3b82f6" />
                                    <Cell fill="#60a5fa" />
                                    <Cell fill="#a855f7" />
                                    <Cell fill="#f97316" />
                                    <Cell fill="#64748b" />
                                 </Pie>
                                 <Tooltip
                                    formatter={(value: any) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                 />
                                 <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                           </ResponsiveContainer>
                        </div>
                     </div>

                     <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 flex flex-col justify-center">
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                           <Activity size={16} className="text-green-500" />
                           Análise de Liquidez
                        </h3>

                        <div className="space-y-4">
                           <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
                              <div className="flex justify-between mb-1">
                                 <span className="text-sm font-medium text-green-800 dark:text-green-300">Receita Líquida (Dinheiro + Pix)</span>
                                 <span className="text-sm font-bold text-green-900 dark:text-green-100">
                                    {(totais.dinheiro + totais.pix).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </span>
                              </div>
                              <div className="w-full bg-green-200 dark:bg-green-800 rounded-full h-2">
                                 <div
                                    className="bg-green-500 h-2 rounded-full"
                                    style={{ width: `${((totais.dinheiro + totais.pix) / totalGeral * 100).toFixed(0)}%` }}
                                 ></div>
                              </div>
                              <p className="text-xs text-green-600 dark:text-green-400 mt-2">Disponibilidade imediata de caixa</p>
                           </div>

                           <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                              <div className="flex justify-between mb-1">
                                 <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Recebíveis (Cartões + Vale)</span>
                                 <span className="text-sm font-bold text-blue-900 dark:text-blue-100">
                                    {(totais.cartaoCredito + totais.cartaoDebito + totais.notaPrazo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                 </span>
                              </div>
                              <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
                                 <div
                                    className="bg-blue-500 h-2 rounded-full"
                                    style={{ width: `${((totais.cartaoCredito + totais.cartaoDebito + totais.notaPrazo) / totalGeral * 100).toFixed(0)}%` }}
                                 ></div>
                              </div>
                              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">Crédito futuro e prazos</p>
                           </div>
                        </div>
                     </div>
                  </div>
               );
            })()}
         </div>


         {/* Frentistas Section (Based on Spreadsheet Logic) - Only visible in Leituras tab */}
         {/* Frentistas Section (Table Layout based on Spreadsheet) */}
         <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden print:break-inside-avoid ${activeTab === 'financeiro' ? 'hidden' : ''}`}>
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                     <User size={20} className="text-blue-600" />
                     Detalhamento por Frentista
                  </h2>
                  <div className="flex gap-2">
                     <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {sessoesFrentistas.length} Ativos
                     </span>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button
                     onClick={() => {
                        carregarDados();
                        carregarSessoesFrentistas(selectedDate, selectedTurno || 0);
                     }}
                     className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-full transition-all shadow-sm border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                     title="Atualizar dados"
                  >
                     <RefreshCw size={18} />
                  </button>


               </div>
            </div>


            <div className="overflow-x-auto custom-scrollbar flex-grow">
               <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-800">
                     <tr>
                        <th scope="col" className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-800 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 w-48 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Meio de Pagamento
                        </th>
                        {sessoesFrentistas.map((session, idx) => {
                           const frentista = frentistas.find(f => f.id === session.frentistaId);
                           return (
                              <th key={session.tempId} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                                 <div className="flex items-center justify-end gap-2 group">
                                    {frentista ? (
                                       <span>{frentista.nome.split(' ')[0]}</span>
                                    ) : (
                                       <select
                                          value={session.frentistaId || ''}
                                          onChange={(e) => atualizarSessao(session.tempId, { frentistaId: Number(e.target.value) })}
                                          className="text-xs p-1 border rounded bg-white dark:bg-gray-700 dark:text-white"
                                       >
                                          <option value="">Selecione...</option>
                                          {frentistas.map(f => (
                                             <option key={f.id} value={f.id}>{f.nome.split(' ')[0]}</option>
                                          ))}
                                       </select>
                                    )}
                                    <button
                                       onClick={() => removerFrentista(session.tempId)}
                                       className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                       title="Remover coluna"
                                    >
                                       <X size={14} />
                                    </button>
                                 </div>
                              </th>
                           );
                        })}
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-100 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           Total Caixa
                        </th>
                     </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                     {/* PIX */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <Smartphone className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Pix
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_pix}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_pix', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_pix', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_pix), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Cartão Débito */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <CreditCard className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Cartão Débito
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_cartao_debito}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_cartao_debito', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_cartao_debito', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_cartao_debito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Cartão Crédito */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <CreditCard className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Cartão Crédito
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_cartao_credito}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_cartao_credito', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_cartao_credito', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_cartao_credito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Notas a Prazo */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <FileText className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Notas a Prazo
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_nota}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_nota', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_nota', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_nota), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Dinheiro */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <Banknote className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Dinheiro
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_dinheiro}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_dinheiro', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_dinheiro', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_dinheiro), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Baratão (Optional/Others) */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <div className="flex items-center">
                              <ShoppingBag className="text-gray-600 dark:text-gray-400 text-sm mr-2" size={16} />
                              Baratão/Outros
                           </div>
                        </td>
                        {sessoesFrentistas.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_baratao}
                                 onChange={(e) => alterarCampoFrentista(session.tempId, 'valor_baratao', e.target.value)}
                                 onBlur={(e) => aoSairCampoFrentista(session.tempId, 'valor_baratao', e.target.value)}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {sessoesFrentistas.reduce((acc, s) => acc + parseValue(s.valor_baratao), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Total Venda Frentista (Sum Row) */}
                     <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        <td className="sticky left-0 z-10 bg-blue-50 dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-blue-100 border-r border-blue-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Total Venda Frentista
                        </td>
                        {sessoesFrentistas.map(session => {
                           const total = parseValue(session.valor_cartao_debito) +
                              parseValue(session.valor_cartao_credito) +
                              parseValue(session.valor_pix) +
                              parseValue(session.valor_nota) +
                              parseValue(session.valor_dinheiro) +
                              parseValue(session.valor_baratao);
                           return (
                              <td key={session.tempId} className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900 dark:text-white">
                                 {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </td>
                           );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-700 dark:text-blue-300 border-l border-blue-100 dark:border-gray-700 bg-blue-100/50 dark:bg-blue-900/40">
                           {totaisFrentistas.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Falta/Diferença */}
                     <tr className="bg-red-50 dark:bg-red-900/10">
                        <td className="sticky left-0 z-10 bg-red-50 dark:bg-gray-800 px-6 py-3 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400 border-r border-red-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Diferença (Falta)
                        </td>
                        {sessoesFrentistas.map(session => {
                           const totalInf = parseValue(session.valor_cartao_debito) +
                              parseValue(session.valor_cartao_credito) +
                              parseValue(session.valor_pix) +
                              parseValue(session.valor_nota) +
                              parseValue(session.valor_dinheiro) +
                              parseValue(session.valor_baratao);
                           const totalVendido = parseValue(session.valor_encerrante);
                           const diff = totalVendido - totalInf;

                           return (
                              <td key={session.tempId} className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold">
                                 <span className={`${diff > 0.01 ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                                    {diff > 0.01 ? diff.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '-'}
                                 </span>
                              </td>
                           );
                        })}
                        <td className="px-6 py-3 whitespace-nowrap text-sm text-right font-bold text-red-600 border-l border-red-100 dark:border-gray-700 bg-red-100/30 dark:bg-red-900/30">
                           {(() => {
                              const totalFalta = sessoesFrentistas.reduce((acc, s) => {
                                 const totalInf = parseValue(s.valor_cartao_debito) + parseValue(s.valor_cartao_credito) + parseValue(s.valor_pix) + parseValue(s.valor_nota) + parseValue(s.valor_dinheiro) + parseValue(s.valor_baratao);
                                 const totalVendido = parseValue(s.valor_encerrante);
                                 const diff = totalVendido - totalInf;
                                 return acc + (diff > 0 ? diff : 0);
                              }, 0);
                              return totalFalta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                           })()}
                        </td>
                     </tr>

                     {/* Percentual */}
                     <tr>
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-3 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 border-r border-gray-200 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Participação %
                        </td>
                        {sessoesFrentistas.map(session => {
                           const totalInf = parseValue(session.valor_cartao_debito) +
                              parseValue(session.valor_cartao_credito) +
                              parseValue(session.valor_pix) +
                              parseValue(session.valor_nota) +
                              parseValue(session.valor_dinheiro) +
                              parseValue(session.valor_baratao);
                           const globalTotal = totaisFrentistas.total || 1;
                           const percent = (totalInf / globalTotal) * 100;

                           return (
                              <td key={session.tempId} className="px-6 py-3 whitespace-nowrap text-xs text-right text-gray-500 dark:text-gray-400">
                                 {percent.toFixed(2)}%
                              </td>
                           );
                        })}
                        <td className="px-6 py-3 whitespace-nowrap text-xs text-right font-semibold text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                           100%
                        </td>
                     </tr>
                  </tbody>
               </table>
            </div>


            <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 sm:px-6">
               <div className="text-xs text-gray-500 dark:text-gray-400 text-center sm:text-left flex justify-between items-center">
                  <span>* Valores de Venda Concentrador devem ser preenchidos com o total vendido registrado na bomba (Encerrante).</span>
                  {sessoesFrentistas.length > 0 && (
                     <button
                        onClick={() => {
                           handleSave();
                        }}
                        className="text-blue-600 hover:text-blue-800 font-bold"
                     >
                        Salvar Alterações
                     </button>
                  )}
               </div>
            </div>
         </div>

         {/* Cash Difference Alert - Show when there's a significant difference */}
         {false && (totaisFrentistas.total > 0 || totalPayments > 0) && totals.valor > 0 && (
            <div className="space-y-4">
               <DifferenceAlert
                  difference={totalPayments - totals.valor}
                  threshold={100}
                  requireJustification={false}
                  className="animate-fade-in-up"
               />

               {/* New: Discrepancy between Sum of Frentistas and Global Total */}
               {sessoesFrentistas.length > 0 && Math.abs(totaisFrentistas.total - totalPayments) > 50 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4 animate-fade-in-up shadow-sm">
                     <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <AlertTriangle size={24} />
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-amber-900 text-sm">Divergência entre Frentistas e Caixa Geral</h4>
                        <p className="text-xs text-amber-800 mt-1">
                           A soma dos envelopes dos frentistas (<strong>{totaisFrentistas.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>)
                           não confere com o total contado pelo gerente (<strong>{totalPayments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>).
                        </p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-2">Diferença: {(totaisFrentistas.total - totalPayments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                     </div>
                  </div>
               )}
            </div>
         )}

         {/* Summary Sections (Recebimentos por Forma remain if needed for global count) */}

         {/* Day Shifts Comparison - Only visible in Financeiro tab */}
         <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:break-inside-avoid ${activeTab === 'leituras' ? 'hidden' : ''}`}>
            <div className="px-6 py-4 border-b border-gray-200 bg-blue-50/50">
               <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <TrendingUp size={20} className="text-blue-600" />
                  Comparativo de Turnos do Dia
               </h2>
            </div>
            <div className="p-6">
               {dayClosures.length === 0 ? (
                  <div className="text-center py-6 text-gray-400 italic text-sm">
                     Nenhum turno fechado para esta data ainda.
                  </div>
               ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     {dayClosures.map((c) => (
                        <div key={c.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex flex-col gap-2">
                           <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase">
                              <div className="flex items-center gap-1">
                                 <Clock size={12} />
                                 {c.turno?.nome || 'Turno'}
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] ${c.status === 'FECHADO' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                 {c.status}
                              </span>
                           </div>
                           <div className="flex flex-col mt-1">
                              <span className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">Venda Bruta</span>
                              <span className="text-lg font-black text-gray-900">
                                 {c.total_vendas?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                              </span>
                           </div>
                           <div className="flex justify-between items-center pt-2 border-t border-gray-200/50">
                              <span className="text-[10px] text-gray-400 font-bold uppercase">Diferença:</span>
                              <span className={`text-xs font-bold ${(c.diferenca || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                 {c.diferenca?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) || 'R$ 0,00'}
                              </span>
                           </div>
                        </div>
                     ))}
                  </div>
               )}
            </div>
         </div>

         {/* Fixed Footer */}
         <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40 print:hidden">
            <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">

               <div className="flex items-center gap-8 w-full sm:w-auto justify-between sm:justify-start">
                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Litros</span>
                     <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-black text-blue-600">{totals.litrosDisplay}</span>
                        <span className="text-sm font-bold text-gray-400">L</span>
                     </div>
                  </div>

                  <div className="h-8 w-px bg-gray-200 hidden sm:block"></div>

                  <div className="flex flex-col">
                     <span className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Faturamento Total</span>
                     <div className="text-2xl font-black text-green-600">
                        {totals.valorDisplay}
                     </div>
                  </div>
               </div>

               <div className="flex items-center gap-3 w-full sm:w-auto">
                  {/* Cancel Button */}
                  <button
                     onClick={handleCancel}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                     <X size={18} />
                     Cancelar
                  </button>

                  {/* Print Button */}
                  <button
                     onClick={handlePrint}
                     disabled={totals.litros === 0}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     <Printer size={18} />
                     Imprimir
                  </button>

                  {/* Save Button */}
                  <button
                     onClick={handleSave}
                     disabled={saving || totals.litros === 0}
                     className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-green-600 text-white text-sm font-bold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                     {saving ? (
                        <>
                           <Loader2 size={18} className="animate-spin" />
                           Salvando...
                        </>
                     ) : (
                        <>
                           <SaveIcon size={18} />
                           Salvar
                        </>
                     )}
                  </button>
               </div>

            </div>
         </div>
      </div>
   );
};

export default TelaFechamentoDiario;
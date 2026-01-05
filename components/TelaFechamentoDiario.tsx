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

// Type for bico with related data
type BicoWithDetails = Bico & { bomba: Bomba; combustivel: Combustivel };

// Payment entry type linked to database configuration
interface PaymentEntry {
   id: number; // ID from database
   nome: string;
   tipo: string;
   valor: string;
   taxa: number; // Taxa percentual
}

// Local state for each frentista's closing session
interface FrentistaSession {
   tempId: string;
   frentistaId: number | null;
   valor_cartao: string;
   valor_cartao_debito: string; // New field
   valor_cartao_credito: string; // New field
   valor_nota: string;
   valor_pix: string;
   valor_dinheiro: string;
   valor_baratao: string;
   valor_encerrante: string;
   valor_conferido: string;
   observacoes: string;
   valor_produtos: string; // New field
   status?: 'pendente' | 'conferido'; // Status do fechamento
   data_hora_envio?: string; // Data e hora do envio pelo app
}

// Fuel colors (mantendo para visualização)
// Fuel colors (Mapped to user request: GC=Red, GA=Blue, ET=Green, S10=Yellow)
const FUEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
   'GC': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
   'GA': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
   'ET': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
   'S10': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
   'DIESEL': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' },
};

const FUEL_CHART_COLORS: Record<string, string> = {
   'GC': '#EF4444', // red-500
   'GA': '#3B82F6', // blue-500
   'ET': '#22C55E', // green-500
   'S10': '#EAB308', // yellow-500
   'DIESEL': '#F59E0B', // amber-500
};

const PAYMENT_CHART_COLORS = [
   '#3B82F6', // blue-500
   '#8B5CF6', // violet-500
   '#EC4899', // pink-500
   '#F97316', // orange-500
   '#10B981', // emerald-500
   '#6366F1', // indigo-500
   '#14B8A6', // teal-500
];

// Turn options
const DEFAULT_TURNOS = [
   { id: 1, nome: 'Manhã', horario_inicio: '06:00', horario_fim: '14:00' },
   { id: 2, nome: 'Tarde', horario_inicio: '14:00', horario_fim: '22:00' },
   { id: 3, nome: 'Noite', horario_inicio: '22:00', horario_fim: '06:00' },
];


// --- Utility Functions (moved outside to avoid hoisting issues and pure logic) ---

// Parse value from string (BR format: 1.234,567)
const parseValue = (value: string): number => {
   if (!value) return 0;

   // Remove espaços
   let cleaned = value.toString().trim();

   // Se tem vírgula, é formato BR tradicional (1.234.567,890)
   // A vírgula é o separador decimal
   if (cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
      return parseFloat(cleaned) || 0;
   }

   // Se não tem vírgula mas tem pontos:
   // Para encerrantes de bomba, assumimos que os últimos 3 dígitos são SEMPRE decimais
   // Exemplo: 1.718.359.423 = 1.718.359,423 = 1718359.423
   if (cleaned.includes('.')) {
      // Remove todos os pontos
      const numStr = cleaned.replace(/\./g, '');

      // Se tem mais de 3 dígitos, os últimos 3 são decimais
      if (numStr.length > 3) {
         const inteiro = numStr.slice(0, -3);
         const decimal = numStr.slice(-3);
         return parseFloat(`${inteiro}.${decimal}`) || 0;
      }

      // Se tem 3 ou menos dígitos, é um valor decimal pequeno (0.xxx)
      return parseFloat(`0.${numStr.padStart(3, '0')}`) || 0;
   }

   // Se não tem nem vírgula nem ponto:
   // Também assumimos últimos 3 dígitos como decimais
   if (cleaned.length > 3) {
      const inteiro = cleaned.slice(0, -3);
      const decimal = cleaned.slice(-3);
      return parseFloat(`${inteiro}.${decimal}`) || 0;
   }

   // Número muito pequeno - é decimal
   if (cleaned.length > 0) {
      return parseFloat(`0.${cleaned.padStart(3, '0')}`) || 0;
   }

   return 0;
};

// Format value to BR format with 3 decimals
const formatToBR = (num: number, decimals: number = 3): string => {
   if (num === 0) return '0,' + '0'.repeat(decimals);

   const parts = num.toFixed(decimals).split('.');
   const integer = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   const decimal = parts[1] || '0'.repeat(decimals);

   return `${integer},${decimal}`;
};

// Ensure comma formatting and thousands dots for input
/**
 * Formata valor para padrão monetário BR com SEMPRE 2 casas decimais.
 * 
 * Exemplos:
 * - "52" → "52,00"
 * - "514,3" → "514,30"
 * - "1562,01" → "1.562,01"
 * - "1939,5" → "1.939,50"
 * 
 * @param value - Valor a ser formatado
 * @returns Valor formatado no padrão BR (1.234,56)
 */
const formatSimpleValue = (value: string) => {
   if (!value) return '';

   // Remove tudo exceto números e vírgula
   let cleaned = value.replace(/[^\d,]/g, '');

   // Se houver múltiplas vírgulas, mantém apenas a primeira
   const parts = cleaned.split(',');
   let inteiro = parts[0] || '';
   let decimal = parts.slice(1).join('').slice(0, 2); // Mantém apenas 2 casas decimais

   // Remove zeros à esquerda desnecessários
   inteiro = inteiro.replace(/^0+(?!$)/, '') || (parts[0] === '0' ? '0' : '');

   // Adiciona pontos de milhar na parte inteira
   if (inteiro.length > 3) {
      inteiro = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
   }

   // GARANTE que sempre terá 2 casas decimais (padrão monetário BR)
   decimal = decimal.padEnd(2, '0');

   // Reconstrói o número no padrão BR: 1.234,56
   return `${inteiro},${decimal}`;
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

   // State
   const [bicos, setBicos] = useState<BicoWithDetails[]>([]);
   const [leituras, setLeituras] = useState<Record<number, { inicial: string; fechamento: string }>>({});
   const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
   const [loading, setLoading] = useState(true);
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   // Additional states
   const [frentistas, setFrentistas] = useState<Frentista[]>([]);
   const [turnos, setTurnos] = useState<Turno[]>([]);
   const [selectedTurno, setSelectedTurno] = useState<number | null>(null);
   const [frentistaSessions, setFrentistaSessions] = useState<FrentistaSession[]>([]);
   const [observacoes, setObservacoes] = useState<string>('');
   const [showHelp, setShowHelp] = useState(false);
   const [dayClosures, setDayClosures] = useState<any[]>([]);
   const [activeTab, setActiveTab] = useState<'leituras' | 'financeiro'>('leituras');
   const lastLoadedContext = React.useRef<{ date: string; turno: number | null }>({ date: '', turno: null });

   // Estado para edição de preço inline
   const [editingPrice, setEditingPrice] = useState<number | null>(null); // combustivel_id sendo editado
   const [tempPrice, setTempPrice] = useState<string>('');

   // --- AUTOSAVE LOGIC ---
   // --- AUTOSAVE LOGIC ---
   const [restored, setRestored] = useState(false);
   const AUTOSAVE_KEY = useMemo(() => `daily_closing_draft_v1_${postoAtivoId}`, [postoAtivoId]);

   // Reset restored state when posto changes
   useEffect(() => {
      setRestored(false);
   }, [postoAtivoId]);

   // Restore from localStorage when data loading finishes
   useEffect(() => {
      if (!loading && !restored) {
         try {
            const draft = localStorage.getItem(AUTOSAVE_KEY);
            if (draft) {
               const parsed = JSON.parse(draft);
               if (parsed.leituras && Object.keys(parsed.leituras).length > 0) {
                  setLeituras(prev => ({ ...prev, ...parsed.leituras }));
               }
               if (parsed.selectedDate) setSelectedDate(parsed.selectedDate);
               if (parsed.selectedTurno) setSelectedTurno(parsed.selectedTurno);
               if (parsed.frentistaSessions && parsed.frentistaSessions.length > 0) {
                  setFrentistaSessions(parsed.frentistaSessions);
               }
               console.log('Rascunho restaurado com sucesso para posto:', postoAtivoId);
            }
         } catch (e) {
            console.error('Erro ao restaurar rascunho:', e);
         } finally {
            setRestored(true);
         }
      }
   }, [loading, restored, AUTOSAVE_KEY]);

   // Save to localStorage on changes
   useEffect(() => {
      if (!loading && !saving && restored) {
         const draft = {
            leituras,
            selectedDate,
            selectedTurno,
            frentistaSessions
         };
         localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(draft));
      }
   }, [leituras, selectedDate, selectedTurno, frentistaSessions, loading, saving, restored, AUTOSAVE_KEY]);
   // ----------------------

   // Payment entries (dynamic) - REMAINING FOR GLOBAL AUDIT
   const [payments, setPayments] = useState<PaymentEntry[]>([]);

   // Sum of all frentista values
   const frentistasTotals = useMemo(() => {
      return frentistaSessions.reduce((acc, fs) => {
         return {
            cartao: acc.cartao + parseValue(fs.valor_cartao),
            nota: acc.nota + parseValue(fs.valor_nota),
            pix: acc.pix + parseValue(fs.valor_pix),
            dinheiro: acc.dinheiro + parseValue(fs.valor_dinheiro),
            total: acc.total + parseValue(fs.valor_cartao) + parseValue(fs.valor_nota) + parseValue(fs.valor_pix) + parseValue(fs.valor_dinheiro) + parseValue(fs.valor_baratao)
         };
      }, { cartao: 0, nota: 0, pix: 0, dinheiro: 0, total: 0 });
   }, [frentistaSessions]);

   // Computed Total Liquido (Global)
   const totalLiquido = useMemo(() => {
      // ... (rest of logic)
      return payments.reduce((acc, p) => {
         const valor = parseValue(p.valor);
         const desconto = valor * (p.taxa / 100);
         return acc + (valor - desconto);
      }, 0);
   }, [payments]);

   const totalTaxas = useMemo(() => {
      return payments.reduce((acc, p) => {
         const valor = parseValue(p.valor);
         return acc + (valor * (p.taxa / 100));
      }, 0);
   }, [payments]);

   // Load data on mount
   useEffect(() => {
      loadData();
   }, [postoAtivoId]);

   const loadData = async () => {
      try {
         setLoading(true);
         setError(null);

         // Fetch bicos with details
         const bicosData = await bicoService.getWithDetails(postoAtivoId);
         setBicos(bicosData);

         // Fetch frentistas
         const frentistasData = await frentistaService.getAll(postoAtivoId);
         console.log('Frentistas carregados:', frentistasData);
         setFrentistas(frentistasData);

         // Fetch turnos e seleciona automaticamente o primeiro (modo diário simplificado)
         const turnosData = await turnoService.getAll(postoAtivoId);
         const availableTurnos = turnosData.length > 0 ? turnosData : DEFAULT_TURNOS as Turno[];
         setTurnos(availableTurnos);

         // Seleção automática: prioriza 'Diário', senão pega o primeiro
         if (availableTurnos.length > 0) {
            const diario = availableTurnos.find(t => t.nome.toLowerCase().includes('diário') || t.nome.toLowerCase().includes('diario'));
            setSelectedTurno(diario ? diario.id : availableTurnos[0].id);
         }

         // Fetch Payment Methods
         const paymentMethodsData = await formaPagamentoService.getAll(postoAtivoId);
         const initialPayments: PaymentEntry[] = paymentMethodsData.map(pm => ({
            id: pm.id,
            nome: pm.nome,
            tipo: pm.tipo,
            valor: '',
            taxa: pm.taxa || 0
         }));
         setPayments(initialPayments);

         // Auto-populate logic moved to loadLeituras controlled by useEffect
         // keeping the setLeituras cleared or empty initially
         // setLeituras(leiturasMap);

      } catch (err) {
         console.error('Error loading data:', err);
         setError('Erro ao carregar dados. Verifique sua conexão.');
      } finally {
         setLoading(false);
      }
   };

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
         loadFrentistaSessions();
      } else {
         setFrentistaSessions([]);
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
                  loadFrentistaSessions();
               }
            }
         )
         .on(
            'postgres_changes',
            { event: '*', schema: 'public', table: 'Fechamento' },
            (payload) => {
               console.log('🔔 Realtime: Fechamento alterado', payload);
               if (selectedDate) loadDayClosures();
               if (selectedDate && selectedTurno) loadFrentistaSessions();
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

   // Helper function para atualizar os pagamentos com base nos totais dos frentistas
   const updatePaymentsFromFrentistas = (sessions: any[]) => {
      if (sessions.length === 0) return;

      // Soma os valores de todas as sessões de frentistas
      const totais = sessions.reduce((acc, s) => ({
         cartao: acc.cartao + (Number(s.valor_cartao) || Number(s.cartao) || 0),
         cartao_debito: acc.cartao_debito + (Number(s.valor_cartao_debito) || 0),
         cartao_credito: acc.cartao_credito + (Number(s.valor_cartao_credito) || 0),
         pix: acc.pix + (Number(s.valor_pix) || Number(s.pix) || 0),
         dinheiro: acc.dinheiro + (Number(s.valor_dinheiro) || Number(s.dinheiro) || 0),
         nota: acc.nota + (Number(s.valor_nota) || Number(s.nota) || 0),
         baratao: acc.baratao + (Number(s.valor_baratao) || Number(s.baratao) || 0),
      }), { cartao: 0, cartao_debito: 0, cartao_credito: 0, pix: 0, dinheiro: 0, nota: 0, baratao: 0 });

      // Atualiza os payments com os totais dos frentistas

      setPayments(prev => prev.map(p => {
         // Mapeia tipos de forma de pagamento para os totais dos frentistas
         if (p.tipo === 'cartao' || p.nome.toLowerCase().includes('cartão')) {
            if (p.nome.toLowerCase().includes('crédito')) {
               return { ...p, valor: totais.cartao_credito > 0 ? formatSimpleValue(totais.cartao_credito.toString().replace('.', ',')) : '' };
            }
            if (p.nome.toLowerCase().includes('débito')) {
               return { ...p, valor: totais.cartao_debito > 0 ? formatSimpleValue(totais.cartao_debito.toString().replace('.', ',')) : '' };
            }
            // Fallback para genérico se não tiver específico
            return { ...p, valor: totais.cartao > 0 ? formatSimpleValue(totais.cartao.toString().replace('.', ',')) : '' };
         }
         if (p.tipo === 'digital' || p.nome.toLowerCase().includes('pix')) {
            return { ...p, valor: totais.pix > 0 ? formatSimpleValue(totais.pix.toString().replace('.', ',')) : '' };
         }
         if (p.tipo === 'fisico' || p.nome.toLowerCase().includes('dinheiro')) {
            return { ...p, valor: totais.dinheiro > 0 ? formatSimpleValue(totais.dinheiro.toString().replace('.', ',')) : '' };
         }
         if (p.nome.toLowerCase().includes('baratão')) {
            return { ...p, valor: totais.baratao > 0 ? formatSimpleValue(totais.baratao.toString().replace('.', ',')) : '' };
         }
         if (p.nome.toLowerCase().includes('nota') || p.nome.toLowerCase().includes('vale')) {
            return { ...p, valor: totais.nota > 0 ? formatSimpleValue(totais.nota.toString().replace('.', ',')) : '' };
         }
         return p;
      }));
   };

   const loadFrentistaSessions = async () => {
      try {
         // 1. Buscar TODOS os frentistas ativos do posto para garantir que todos apareçam nas colunas
         const allFrentistas = await frentistaService.getAll(postoAtivoId);
         const activeFrentistas = allFrentistas.filter(f => f.ativo);

         // Atualiza o estado de frentistas também
         setFrentistas(allFrentistas);

         let foundSessions: any[] = [];

         // 2. Buscar sessões existentes (fechamentos já salvos ou pendentes do mobile)
         const fechamento = await fechamentoService.getByDateAndTurno(selectedDate, selectedTurno!, postoAtivoId);

         if (fechamento) {
            // Se já tem fechamento salvo, busca os itens dele
            foundSessions = await fechamentoFrentistaService.getByFechamento(fechamento.id);
         } else {
            // Se não tem, busca registros soltos enviados pelo mobile para esta data
            const mobileSessions = await fechamentoFrentistaService.getByDate(selectedDate, postoAtivoId);

            // Filtra pelo turno selecionado
            foundSessions = mobileSessions.filter(s => {
               const sessionTurno = s.fechamento?.turno_id;
               return Number(sessionTurno) === Number(selectedTurno);
            });
         }

         // 3. Criar mapa para acesso rápido às sessões existentes pro ID do frentista
         const sessionMap = new Map();
         foundSessions.forEach(s => sessionMap.set(s.frentista_id, s));

         // 4. Construir lista final: Frentistas Ativos + Frentistas Inativos que tenham sessão (caso histórico)
         // A prioridade são os ativos para preencher a tabela
         const frentistasToShow = activeFrentistas;

         // Adiciona também frentistas inativos que porventura tenham sessão (ex: demitido mas trabalhou no dia)
         foundSessions.forEach(s => {
            if (!frentistasToShow.find(f => f.id === s.frentista_id)) {
               const frentistaObj = allFrentistas.find(f => f.id === s.frentista_id);
               if (frentistaObj) frentistasToShow.push(frentistaObj);
            }
         });

         const mergedSessions = await Promise.all(frentistasToShow.map(async (frentista) => {
            const s = sessionMap.get(frentista.id);

            if (s) {
               // Mapeia sessão existente (Lógica original)
               const produtos = await vendaProdutoService.getByFrentistaAndDate(s.frentista_id, selectedDate);
               const totalProdutos = produtos.reduce((acc, p) => acc + Number(p.valor_total), 0);

               const obs = s.observacoes || '';
               const isConferido = obs.includes('[CONFERIDO]');
               const cleanObs = obs.replace('[CONFERIDO]', '').trim();

               return {
                  tempId: s.id.toString(),
                  frentistaId: s.frentista_id,
                  valor_cartao: s.valor_cartao ? formatSimpleValue(s.valor_cartao.toString().replace('.', ',')) : '',
                  valor_cartao_debito: s.valor_cartao_debito ? formatSimpleValue(s.valor_cartao_debito.toString().replace('.', ',')) : '',
                  valor_cartao_credito: s.valor_cartao_credito ? formatSimpleValue(s.valor_cartao_credito.toString().replace('.', ',')) : '',
                  valor_nota: s.valor_nota ? formatSimpleValue(s.valor_nota.toString().replace('.', ',')) : '',
                  valor_pix: s.valor_pix ? formatSimpleValue(s.valor_pix.toString().replace('.', ',')) : '',
                  valor_dinheiro: s.valor_dinheiro ? formatSimpleValue(s.valor_dinheiro.toString().replace('.', ',')) : '',
                  valor_baratao: s.baratao ? formatSimpleValue(s.baratao.toString().replace('.', ',')) : '',
                  valor_encerrante: s.encerrante ? formatSimpleValue(s.encerrante.toString().replace('.', ',')) : '',
                  valor_conferido: s.valor_conferido ? formatSimpleValue(s.valor_conferido.toString().replace('.', ',')) : '',
                  observacoes: cleanObs,
                  status: (isConferido ? 'conferido' : 'pendente') as 'conferido' | 'pendente',
                  valor_produtos: totalProdutos > 0 ? formatToBR(totalProdutos, 2) : '0,00',
                  data_hora_envio: (s as any).data_hora_envio || null
               };
            } else {
               // Cria sessão vazia para frentista ativo sem dados ainda
               return {
                  tempId: `new-${frentista.id}`,
                  frentistaId: frentista.id,
                  valor_cartao: '',
                  valor_cartao_debito: '',
                  valor_cartao_credito: '',
                  valor_nota: '',
                  valor_pix: '',
                  valor_dinheiro: '',
                  valor_baratao: '',
                  valor_encerrante: '',
                  valor_conferido: '',
                  observacoes: '',
                  status: 'pendente',
                  valor_produtos: '0,00',
                  data_hora_envio: null
               } as FrentistaSession;
            }
         }));

         setFrentistaSessions(mergedSessions);

         // Atualiza pagamentos globais apenas com base no que realmente veio do banco para não zerar tudo incorretamente
         // Se foundSessions for vazio, updatePaymentsFromFrentistas não faz nada, mantendo o estado anterior se houver
         if (foundSessions.length > 0) {
            updatePaymentsFromFrentistas(foundSessions);
         }

      } catch (err) {
         console.error('Error loading frentista sessions:', err);
      }
   };
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
   const loadLeituras = async () => {
      // Só executa se tiver data, turno, bicos carregados E depois que o autosave foi processado
      if (!selectedDate || !selectedTurno || bicos.length === 0 || !restored) return;

      // Verifica se mudou a data ou o turno desde o último carregamento para evitar o bug de dados "grudados"
      const contextChanged = lastLoadedContext.current.date !== selectedDate ||
         lastLoadedContext.current.turno !== selectedTurno;

      if (!contextChanged) {
         // Se estamos na mesma data/turno, preservamos o que o usuário já digitou
         const hasLocalData = Object.values(leituras).some(l => l.fechamento && l.fechamento.length > 0);
         if (hasLocalData) {
            console.log('📝 Preservando dados locais digitados');
            return;
         }
      }

      // Atualiza o contexto carregado
      lastLoadedContext.current = { date: selectedDate, turno: selectedTurno };

      try {
         // 1. Verifica se temos leituras salvas para este turno específico (Modo Edição)
         const dayReadings = await leituraService.getByDate(selectedDate, postoAtivoId);
         const shiftReadings = dayReadings.filter(l => l.turno_id === selectedTurno);

         if (shiftReadings.length > 0) {
            const leiturasMap: Record<number, { inicial: string; fechamento: string }> = {};
            shiftReadings.forEach(reading => {
               leiturasMap[reading.bico_id] = {
                  inicial: reading.leitura_inicial.toFixed(3).replace('.', ','),
                  fechamento: reading.leitura_final.toFixed(3).replace('.', ',')
               };
            });
            setLeituras(leiturasMap);
         } else {
            // 2. MODO CRIAÇÃO: Busca a última leitura de cada bico para usar como inicial
            const leiturasMap: Record<number, { inicial: string; fechamento: string }> = {};

            await Promise.all(bicos.map(async (bico) => {
               try {
                  const lastReading = await leituraService.getLastReadingByBico(bico.id);
                  let inicialValue = 0;

                  if (lastReading) {
                     // Recupera o último valor de fechamento conhecido no sistema
                     inicialValue = lastReading.leitura_final;
                  }

                  leiturasMap[bico.id] = {
                     inicial: formatToBR(inicialValue, 3),
                     fechamento: ''
                  };
               } catch (err) {
                  console.error(`Erro ao buscar última leitura bico ${bico.id}:`, err);
                  leiturasMap[bico.id] = { inicial: '0,000', fechamento: '' };
               }
            }));

            setLeituras(leiturasMap);

            // Se mudou de data, limpa o autosave para não confundir rascunhos de dias diferentes
            if (contextChanged) {
               localStorage.removeItem(AUTOSAVE_KEY);
            }
         }
      } catch (err) {
         console.error('Error loading leituras:', err);
      }
   };

   // Effect para recarregar leituras quando data ou turno mudam
   useEffect(() => {
      loadLeituras();
   }, [selectedDate, selectedTurno, bicos, restored]);

   // Handle inicial input change
   const handleInicialChange = (bicoId: number, value: string) => {
      const formatted = formatEncerranteInput(value);
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], inicial: formatted }
      }));
   };

   // Handle fechamento input change
   const handleFechamentoChange = (bicoId: number, value: string) => {
      const formatted = formatEncerranteInput(value);
      setLeituras(prev => ({
         ...prev,
         [bicoId]: { ...prev[bicoId], fechamento: formatted }
      }));
   };

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
   const handleInicialBlur = (bicoId: number) => {
      const currentValue = leituras[bicoId]?.inicial || '';
      const formatted = formatOnBlur(currentValue);
      if (formatted !== currentValue) {
         setLeituras(prev => ({
            ...prev,
            [bicoId]: { ...prev[bicoId], inicial: formatted }
         }));
      }
   };

   // Handler para quando o campo FECHAMENTO perde o foco
   const handleFechamentoBlur = (bicoId: number) => {
      const currentValue = leituras[bicoId]?.fechamento || '';
      const formatted = formatOnBlur(currentValue);
      if (formatted !== currentValue) {
         setLeituras(prev => ({
            ...prev,
            [bicoId]: { ...prev[bicoId], fechamento: formatted }
         }));
      }
   };

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

         // Atualiza estado local dos bicos
         setBicos(prev => prev.map(bico => {
            if (bico.combustivel.id === combustivelId) {
               return {
                  ...bico,
                  combustivel: { ...bico.combustivel, preco_venda: newPrice }
               };
            }
            return bico;
         }));

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

   // Handle payment change
   const handlePaymentChange = (index: number, value: string) => {
      const formatted = formatSimpleValue(value);
      setPayments(prev => {
         const updated = [...prev];
         updated[index] = { ...updated[index], valor: formatted };
         return updated;
      });
   };


   // Calculate litros for a bico (EXATO como planilha)
   const calcLitros = (bicoId: number): { value: number; display: string } => {
      const inicial = parseValue(leituras[bicoId]?.inicial || '');
      const fechamento = parseValue(leituras[bicoId]?.fechamento || '');

      // REGRA DA PLANILHA: Se fechamento ≤ inicial → mostra "-"
      if (fechamento <= inicial || fechamento === 0) {
         return { value: 0, display: '-' };
      }

      const litros = fechamento - inicial;
      return { value: litros, display: formatToBR(litros, 3) };
   };

   // Calculate venda for a bico (EXATO como planilha)
   const calcVenda = (bicoId: number): { value: number; display: string } => {
      const bico = bicos.find(b => b.id === bicoId);
      if (!bico) return { value: 0, display: '-' };

      const litros = calcLitros(bicoId);

      // REGRA DA PLANILHA: Se litros = "-" → venda = "-"
      if (litros.display === '-') {
         return { value: 0, display: '-' };
      }

      const venda = litros.value * bico.combustivel.preco_venda;
      return {
         value: venda,
         display: venda.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
         })
      };
   };

   // Check if reading is valid for calculation
   const isReadingValid = (bicoId: number): boolean => {
      const fechamento = parseValue(leituras[bicoId]?.fechamento || '');
      const inicial = parseValue(leituras[bicoId]?.inicial || '');
      return fechamento > inicial;
   };

   // Group data by combustivel for summary
   const getSummaryByCombustivel = () => {
      const summary: Record<string, { nome: string; codigo: string; litros: number; valor: number; preco: number }> = {};

      bicos.forEach(bico => {
         const codigo = bico.combustivel.codigo;
         if (!summary[codigo]) {
            summary[codigo] = {
               nome: bico.combustivel.nome,
               codigo: codigo,
               litros: 0,
               valor: 0,
               preco: bico.combustivel.preco_venda
            };
         }

         const litrosData = calcLitros(bico.id);
         const vendaData = calcVenda(bico.id);

         if (litrosData.display !== '-') {
            summary[codigo].litros += litrosData.value;
            summary[codigo].valor += vendaData.value;
         }
      });

      return Object.values(summary);
   };

   // Calculate totals (usando useMemo para performance)
   const totals = useMemo(() => {
      let totalLitros = 0;
      let totalValor = 0;

      bicos.forEach(bico => {
         const litrosData = calcLitros(bico.id);
         const vendaData = calcVenda(bico.id);

         if (litrosData.display !== '-') {
            totalLitros += litrosData.value;
            totalValor += vendaData.value;
         }
      });

      return {
         litros: totalLitros,
         valor: totalValor,
         litrosDisplay: formatToBR(totalLitros, 3),
         valorDisplay: totalValor.toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL'
         })
      };
   }, [bicos, leituras]);

   // Calculate total products
   const totalProdutos = useMemo(() => {
      return frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_produtos || '0'), 0);
   }, [frentistaSessions]);

   // Calculate total payments
   const totalPayments = useMemo(() => {
      return payments.reduce((acc, p) => acc + parseValue(p.valor), 0);
   }, [payments]);

   // Calculate difference
   const diferenca = useMemo(() => {
      // Diferença = (Total Pago) - (Venda Combustível + Venda Produtos)
      const expectedTotal = totals.valor + totalProdutos;
      return totalPayments - expectedTotal;
   }, [totalPayments, totals.valor, totalProdutos]);

   // Calculate percentage
   const calcPercentage = (litros: number): number => {
      if (totals.litros === 0) return 0;
      return (litros / totals.litros) * 100;
   };

   // Check if difference is significant (> R$ 100)
   const isDifferenceSignificant = Math.abs(diferenca) > 100;
   const isDifferenceNegative = diferenca < 0;

   // Add a new frentista row
   const handleAddFrentista = () => {
      const newSession: FrentistaSession = {
         tempId: Math.random().toString(36).substr(2, 9),
         frentistaId: null,
         valor_cartao: '',
         valor_cartao_debito: '',
         valor_cartao_credito: '',
         valor_nota: '',
         valor_pix: '',
         valor_dinheiro: '',
         valor_baratao: '',
         valor_encerrante: '',
         valor_conferido: '',
         observacoes: '',
         valor_produtos: ''
      };
      setFrentistaSessions(prev => [...prev, newSession]);
   };

   // Update a frentista session field
   const updateFrentistaSession = async (tempId: string, updates: Partial<FrentistaSession>) => {
      setFrentistaSessions(prev => prev.map(fs =>
         fs.tempId === tempId ? { ...fs, ...updates } : fs
      ));

      // Persist status change explicitly
      if (updates.status === 'conferido') {
         try {
            const session = frentistaSessions.find(s => s.tempId === tempId);
            if (session) {
               if (tempId.includes('temp-')) {
                  console.warn('Registro temporário. Salvando no rascunho local.');
                  return;
               }

               const currentObs = session.observacoes || '';
               const newObs = currentObs.includes('[CONFERIDO]')
                  ? currentObs
                  : `[CONFERIDO] ${currentObs}`.trim();

               // Persist via observations tag since column might not exist
               await fechamentoFrentistaService.update(Number(tempId), {
                  observacoes: newObs
               } as any);
            }
         } catch (err) {
            console.error('Error persisting status:', err);
         }
      }
   };

   // Remove a frentista row
   const handleRemoveFrentista = (tempId: string) => {
      setFrentistaSessions(prev => prev.filter(fs => fs.tempId !== tempId));
   };

   // Handle cancel
   const handleCancel = () => {
      setLeituras({});
      setPayments(prev => prev.map(p => ({ ...p, valor: '' })));
      setFrentistaSessions([]);
      setSelectedTurno(null);
      setSuccess(null);
      setError(null);
      loadData();
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
            .filter(bico => isReadingValid(bico.id))
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
         if (frentistaSessions.length > 0) {
            const frentistasToCreate = frentistaSessions
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
                  // Atualiza os IDs temporários para IDs reais do banco
                  setFrentistaSessions(prev => prev.map(fs => {
                     const match = createdFechamentos.find(cf => cf.frentista_id === fs.frentistaId);
                     return match ? { ...fs, tempId: match.id.toString() } : fs;
                  }));
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
         setLeituras(updatedLeituras);

         // Reset payments
         setPayments(prev => prev.map(p => ({ ...p, valor: '' })));
         setObservacoes('');
         setFrentistaSessions([]);
         localStorage.removeItem('daily_closing_draft_v1'); // Limpa rascunho após salvar

         // Reload data
         await loadData();
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

   const summaryData = getSummaryByCombustivel();

   return (
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-32 print:pb-0 print:max-w-none">

         {/* Header */}
         <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 print:hidden">
            <div>
               <div className="flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider mb-2 bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full w-fit">
                  <Fuel size={14} />
                  Venda Concentrador
               </div>
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
                        loadData();
                        if (selectedDate) loadDayClosures();
                        if (selectedDate && selectedTurno) loadFrentistaSessions();
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
               {frentistaSessions.length > 0 && (
                  <p>Frentistas: {frentistaSessions.map(fs => frentistas.find(f => f.id === fs.frentistaId)?.nome).filter(Boolean).join(', ')}</p>
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
                           const litrosData = calcLitros(bico.id);
                           const vendaData = calcVenda(bico.id);
                           const isValid = isReadingValid(bico.id);

                           return (
                              <tr key={bico.id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 ${colors.bg} dark:bg-opacity-20`}>
                                 {/* Produtos - Combustivel + Bico */}
                                 <td className={`px-4 py-3 font-bold ${colors.text}`}>
                                    {bico.combustivel.codigo}, Bico {bico.numero.toString().padStart(2, '0')}
                                 </td>

                                 {/* Inicial (INPUT) */}
                                 <td className="px-4 py-3">
                                    <input
                                       type="text"
                                       value={inicial}
                                       onChange={(e) => handleInicialChange(bico.id, e.target.value)}
                                       onBlur={() => handleInicialBlur(bico.id)}
                                       className="w-full text-right font-mono py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-100 outline-none"
                                       placeholder="0,000"
                                    />
                                 </td>

                                 {/* Fechamento (INPUT) */}
                                 <td className="px-4 py-3 bg-yellow-50/50 dark:bg-yellow-900/10">
                                    <input
                                       type="text"
                                       value={fechamento}
                                       onChange={(e) => handleFechamentoChange(bico.id, e.target.value)}
                                       onBlur={() => handleFechamentoBlur(bico.id)}
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
                                    <span className={`inline-block px-3 py-1 rounded border font-bold text-sm shadow-sm bg-white dark:bg-gray-800 ${colors.border} ${colors.text}`}>
                                       {item.nome}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-blue-900 text-white px-2 py-1 rounded font-mono font-bold text-sm shadow-sm">
                                       {formatToBR(item.litros, 3)} L
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-blue-600 text-white px-2 py-1 rounded font-mono font-bold text-sm shadow-sm">
                                       {item.valor.toLocaleString('pt-BR', {
                                          style: 'currency',
                                          currency: 'BRL'
                                       })}
                                    </span>
                                 </td>
                                 <td className="px-4 py-3 text-right">
                                    <span className="bg-blue-500 text-white px-2 py-1 rounded font-bold text-sm shadow-sm">
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
                     {frentistaSessions.length > 0 && (
                        <div className="flex flex-col">
                           <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                              <Smartphone size={10} />
                              Total Frentistas (App)
                           </span>
                           <span className="text-xl font-black text-blue-600 dark:text-blue-400">
                              {frentistasTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.length} Ativos
                     </span>
                  </div>
               </div>
               <div className="flex gap-2">
                  <button
                     onClick={() => {
                        loadData();
                        loadFrentistaSessions();
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
                        {frentistaSessions.map((session, idx) => {
                           const frentista = frentistas.find(f => f.id === session.frentistaId);
                           return (
                              <th key={session.tempId} scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[120px]">
                                 <div className="flex items-center justify-end gap-2 group">
                                    {frentista ? (
                                       <span>{frentista.nome.split(' ')[0]}</span>
                                    ) : (
                                       <select
                                          value={session.frentistaId || ''}
                                          onChange={(e) => updateFrentistaSession(session.tempId, { frentistaId: Number(e.target.value) })}
                                          className="text-xs p-1 border rounded bg-white dark:bg-gray-700 dark:text-white"
                                       >
                                          <option value="">Selecione...</option>
                                          {frentistas.map(f => (
                                             <option key={f.id} value={f.id}>{f.nome.split(' ')[0]}</option>
                                          ))}
                                       </select>
                                    )}
                                    <button
                                       onClick={() => handleRemoveFrentista(session.tempId)}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_pix}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_pix: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_pix), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_cartao_debito}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_cartao_debito: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_cartao_debito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_cartao_credito}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_cartao_credito: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_cartao_credito), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_nota}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_nota: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_nota), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_dinheiro}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_dinheiro: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_dinheiro), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                        {frentistaSessions.map(session => (
                           <td key={session.tempId} className="px-4 py-3 whitespace-nowrap text-sm text-right">
                              <input
                                 type="text"
                                 value={session.valor_baratao}
                                 onChange={(e) => updateFrentistaSession(session.tempId, { valor_baratao: formatSimpleValue(e.target.value) })}
                                 className="w-full text-right bg-transparent border-0 border-b border-transparent hover:border-gray-200 focus:border-blue-500 focus:ring-0 text-gray-600 dark:text-gray-300 outline-none transition-colors px-0 py-1"
                                 placeholder="R$ 0,00"
                              />
                           </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-900 border-l border-gray-200 dark:border-gray-700">
                           {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_baratao), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Total Venda Frentista (Sum Row) */}
                     <tr className="bg-blue-50 dark:bg-blue-900/20 font-semibold">
                        <td className="sticky left-0 z-10 bg-blue-50 dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-blue-100 border-r border-blue-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Total Venda Frentista
                        </td>
                        {frentistaSessions.map(session => {
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
                           {frentistasTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                     </tr>

                     {/* Venda Concentrador (Input Row) */}
                     <tr className="bg-white dark:bg-gray-800 border-t-2 border-primary">
                        <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-bold text-blue-600 dark:text-blue-400 border-r border-gray-200 dark:border-gray-700 flex flex-col justify-center min-h-[80px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           <span className="block mb-2">Venda Concentrador</span>
                           <div className="mt-1">
                              <label htmlFor="encerrante-total" className="block text-xs font-normal text-gray-500 dark:text-gray-400 mb-1">Encerrante Final</label>
                              <div className="text-xs text-gray-400 italic">Soma Automática</div>
                           </div>
                        </td>
                        {frentistaSessions.map(session => {
                           const totalVendido = parseValue(session.valor_encerrante);
                           return (
                              <td key={session.tempId} className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-gray-700 dark:text-gray-200 align-top">
                                 <div className="flex flex-col items-end gap-2">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                       {totalVendido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                    </span>
                                    <div className="w-28">
                                       <input
                                          type="text"
                                          value={session.valor_encerrante}
                                          onChange={(e) => updateFrentistaSession(session.tempId, { valor_encerrante: formatSimpleValue(e.target.value) })}
                                          className="block w-full px-2 py-1 text-xs border border-gray-200 dark:border-gray-600 dark:bg-gray-800 rounded focus:ring-blue-500 focus:border-blue-500 text-right"
                                          placeholder="Encerrante (R$)"
                                       />
                                    </div>
                                 </div>
                              </td>
                           );
                        })}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-blue-600 dark:text-blue-400 border-l border-gray-200 dark:border-gray-700 bg-blue-50/50 dark:bg-blue-900/10 align-top">
                           <div className="mt-2 text-lg">
                              {frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_encerrante), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                           </div>
                           {Math.abs(frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_encerrante), 0) - totals.valor) > 0.01 ? (
                              <div className="flex flex-col items-end mt-1">
                                 <div className="flex items-center gap-1 text-xs text-amber-600 font-bold" title="Divergência com Total de Leituras">
                                    <AlertTriangle size={12} />
                                    <span>Dif: {(frentistaSessions.reduce((acc, s) => acc + parseValue(s.valor_encerrante), 0) - totals.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                 </div>
                                 <span className="text-[10px] text-gray-400">Total Leituras: {totals.valorDisplay}</span>
                              </div>
                           ) : (
                              <div className="flex items-center justify-end gap-1 mt-1 text-green-600 text-xs font-bold">
                                 <CheckCircle2 size={12} />
                                 <span>Confere</span>
                              </div>
                           )}
                        </td>
                     </tr>

                     {/* Falta/Diferença */}
                     <tr className="bg-red-50 dark:bg-red-900/10">
                        <td className="sticky left-0 z-10 bg-red-50 dark:bg-gray-800 px-6 py-3 whitespace-nowrap text-sm font-medium text-red-600 dark:text-red-400 border-r border-red-100 dark:border-gray-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                           Diferença (Falta)
                        </td>
                        {frentistaSessions.map(session => {
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
                              const totalFalta = frentistaSessions.reduce((acc, s) => {
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
                        {frentistaSessions.map(session => {
                           const totalInf = parseValue(session.valor_cartao_debito) +
                              parseValue(session.valor_cartao_credito) +
                              parseValue(session.valor_pix) +
                              parseValue(session.valor_nota) +
                              parseValue(session.valor_dinheiro) +
                              parseValue(session.valor_baratao);
                           const globalTotal = frentistasTotals.total || 1;
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
                  {frentistaSessions.length > 0 && (
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
         {false && (frentistasTotals.total > 0 || totalPayments > 0) && totals.valor > 0 && (
            <div className="space-y-4">
               <DifferenceAlert
                  difference={totalPayments - totals.valor}
                  threshold={100}
                  requireJustification={false}
                  className="animate-fade-in-up"
               />

               {/* New: Discrepancy between Sum of Frentistas and Global Total */}
               {frentistaSessions.length > 0 && Math.abs(frentistasTotals.total - totalPayments) > 50 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-4 animate-fade-in-up shadow-sm">
                     <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <AlertTriangle size={24} />
                     </div>
                     <div className="flex-1">
                        <h4 className="font-bold text-amber-900 text-sm">Divergência entre Frentistas e Caixa Geral</h4>
                        <p className="text-xs text-amber-800 mt-1">
                           A soma dos envelopes dos frentistas (<strong>{frentistasTotals.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>)
                           não confere com o total contado pelo gerente (<strong>{totalPayments.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>).
                        </p>
                        <p className="text-[10px] font-bold text-amber-600 uppercase mt-2">Diferença: {(frentistasTotals.total - totalPayments).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
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
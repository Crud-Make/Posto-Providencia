import React, { useState, useEffect } from 'react';
import {
  Droplet,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Ruler,
  History,
  Info
} from 'lucide-react';
import { usePosto } from '../contexts/PostoContext';
import { tanqueService, Tanque } from '../services/tanqueService';
import { InventoryHistoryChart } from './InventoryHistoryChart';

// Componente Visual do Tanque (Copo)
const FuelTank = ({
  name,
  productName,
  productColor,
  capacity,
  currentVolume,
  status = 'ok'
}: {
  name: string;
  productName: string;
  productColor?: string;
  capacity: number;
  currentVolume: number;
  status?: 'ok' | 'warning' | 'critical';
}) => {
  const percentage = capacity > 0 ? Math.min(Math.max((currentVolume / capacity) * 100, 0), 100) : 0;

  // Cores baseadas no produto ou status
  const getColor = () => {
    // Mapeamento simples de cores se vierem nomes
    if (productColor) return productColor;
    const lowerName = productName.toLowerCase();
    if (lowerName.includes('gasolina') && lowerName.includes('aditivada')) return '#EF4444'; // Red (Aditivada)
    if (lowerName.includes('gasolina')) return '#F87171'; // Lighter Red (Comum)
    if (lowerName.includes('etanol')) return '#10B981'; // Green
    if (lowerName.includes('diesel') && lowerName.includes('s-10')) return '#F59E0B'; // Amber (S10)
    if (lowerName.includes('diesel')) return '#D97706'; // Darker Amber (S500)
    return '#3B82F6'; // Blue default
  };

  const color = getColor();

  // Define status colors for borders/text based on fill level
  const isLow = percentage < 15;
  const statusColor = isLow ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 flex flex-col items-center relative overflow-hidden transition-all hover:shadow-lg">
      <div className="w-full flex justify-between items-start mb-4">
        <div className="text-left">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate max-w-[180px]" title={name}>{name}</h3>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
            {productName}
          </span>
        </div>
        {isLow && (
          <div className="animate-pulse text-red-500" title="Nível Crítico">
            <AlertTriangle size={20} />
          </div>
        )}
      </div>

      {/* Visualização do Tanque */}
      <div className="relative w-32 h-44 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-gray-200 dark:border-gray-600 overflow-hidden mb-4 shadow-inner">
        {/* Líquido */}
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-1000 ease-out flex items-end justify-center backdrop-blur-sm"
          style={{
            height: `${percentage}%`,
            backgroundColor: color,
            opacity: 0.85
          }}
        >
          <div className="w-full h-1 bg-white/30 absolute top-0" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>

        {/* Marcações de Régua */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-1 pointer-events-none">
          {[100, 75, 50, 25, 0].map(mark => (
            <div key={mark} className="flex items-center w-full opacity-50">
              <span className="text-[9px] text-gray-400 w-6 text-right pr-1 font-mono">{mark}%</span>
              <div className="h-[1px] bg-gray-400 w-2"></div>
            </div>
          ))}
        </div>

        {/* Overlay Texto */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className={`text-xl font-bold font-mono drop-shadow-md ${percentage > 50 ? 'text-white' : 'text-gray-500'}`}>
            {percentage.toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="text-center w-full">
        <div className={`text-2xl font-bold font-mono ${statusColor}`}>
          {currentVolume.toLocaleString('pt-BR')} L
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 pb-4 border-b border-gray-100 dark:border-gray-700">
          Capacidade: {capacity.toLocaleString('pt-BR')} L
        </div>
      </div>

      {/* Indicador de Espaço Vazio */}
      <div className="mt-4 w-full flex justify-between text-xs">
        <span className="text-gray-500 flex items-center gap-1">
          <TrendingUp size={12} className="text-green-500" />
          Espaço Livre:
        </span>
        <span className="font-bold text-green-600 dark:text-green-400 font-mono">
          {(capacity - currentVolume).toLocaleString('pt-BR')} L
        </span>
      </div>
    </div>
  );
};

const InventoryDashboardScreen: React.FC = () => {
  const { postoAtivoId } = usePosto();
  const [tanques, setTanques] = useState<Tanque[]>([]);
  const [histories, setHistories] = useState<Record<number, any[]>>({});
  const [loading, setLoading] = useState(true);

  // Estado para o modal de medição
  const [showMedicaoModal, setShowMedicaoModal] = useState(false);
  const [selectedTanque, setSelectedTanque] = useState<Tanque | null>(null);
  const [medicaoValue, setMedicaoValue] = useState('');
  const [medicaoObservacao, setMedicaoObservacao] = useState('');
  const [savingMedicao, setSavingMedicao] = useState(false);

  useEffect(() => {
    if (postoAtivoId) {
      loadData();
    }
  }, [postoAtivoId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await tanqueService.getAll(postoAtivoId);
      setTanques(data);

      // Fetch histories
      const histMap: Record<number, any[]> = {};
      await Promise.all(data.map(async (t) => {
        try {
          const hist = await tanqueService.getHistory(t.id, 30);
          histMap[t.id] = hist || [];
        } catch (e) {
          console.error(`Erro ao buscar histórico tanque ${t.id}`, e);
          histMap[t.id] = [];
        }
      }));
      setHistories(histMap);

    } catch (error) {
      console.error("Erro ao carregar tanques", error);
    } finally {
      setLoading(false);
    }
  };

  // Handler para salvar nova medição
  const handleSaveMedicao = async () => {
    if (!selectedTanque || !medicaoValue) return;

    try {
      setSavingMedicao(true);
      const novoValor = parseFloat(medicaoValue.replace(',', '.'));

      if (isNaN(novoValor) || novoValor < 0) {
        alert('Valor de medição inválido');
        return;
      }

      if (novoValor > selectedTanque.capacidade) {
        alert(`O valor não pode exceder a capacidade do tanque (${selectedTanque.capacidade.toLocaleString()} L)`);
        return;
      }

      // Atualiza o estoque do tanque
      await tanqueService.update(selectedTanque.id, {
        estoque_atual: novoValor
      });

      // Registra no histórico (se o serviço suportar)
      try {
        await tanqueService.saveHistory({
          tanque_id: selectedTanque.id,
          data: new Date().toISOString().split('T')[0],
          volume_fisico: novoValor
        });
      } catch (e) {
        console.log('Histórico não registrado (funcionalidade opcional)');
      }

      // Limpa os campos e fecha o modal
      setMedicaoValue('');
      setMedicaoObservacao('');
      setSelectedTanque(null);
      setShowMedicaoModal(false);

      // Recarrega os dados
      await loadData();

    } catch (error) {
      console.error('Erro ao salvar medição:', error);
      alert('Erro ao salvar medição. Tente novamente.');
    } finally {
      setSavingMedicao(false);
    }
  };

  // Handler para abrir o modal de medição
  const openMedicaoModal = (tanque?: Tanque) => {
    if (tanque) {
      setSelectedTanque(tanque);
      setMedicaoValue(tanque.estoque_atual.toString().replace('.', ','));
    } else {
      setSelectedTanque(null);
      setMedicaoValue('');
    }
    setMedicaoObservacao('');
    setShowMedicaoModal(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
        <p className="text-gray-500">Carregando tanques...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Droplet className="text-blue-600" />
            Tanques de Combustível
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Monitoramento em tempo real dos estoques físicos e conciliação.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <History size={16} /> Atualizar
          </button>
          <button
            onClick={() => openMedicaoModal()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Ruler size={16} /> Nova Medição (Régua)
          </button>
        </div>
      </div>

      {tanques.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700 shadow-sm">
          <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Nenhum tanque configurado</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6">
            Para começar a controlar o estoque corretamente, você precisa cadastrar os tanques físicos do seu posto e suas capacidades.
          </p>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg inline-block text-sm">
            Vá em <strong>Configurações &gt; Gestão de Tanques</strong> para cadastrar.
          </div>
        </div>
      ) : (
        <>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Valor Bruto em Estoque</p>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                  {tanques.reduce((acc, t) => acc + (t.estoque_atual * (t.combustivel?.preco_custo || 0)), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400">
                <TrendingUp size={24} />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lucro Previsto Estimado</p>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {tanques.reduce((acc, t) => acc + (t.estoque_atual * ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0))), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400">
                <TrendingUp size={24} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
            {tanques.map(tanque => (
              <FuelTank
                key={tanque.id}
                name={tanque.nome}
                productName={tanque.combustivel?.nome || 'Produto Indefinido'}
                capacity={tanque.capacidade}
                currentVolume={tanque.estoque_atual}
              />
            ))}
          </div>

          {/* Resumo Consolidado (opcional, só para manter paridade com o que ele vê no financeiro) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 flex items-center justify-between">
              <h3 className="font-bold text-gray-900 dark:text-white">Resumo Detalhado</h3>
              <button className="text-blue-600 text-sm hover:underline">Ver Relatório Completo</button>
            </div>
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-500 font-medium">
                <tr>
                  <th className="px-6 py-3">Tanque</th>
                  <th className="px-6 py-3">Produto</th>
                  <th className="px-6 py-3 text-right">Capacidade</th>
                  <th className="px-6 py-3 text-right">Estoque Atual</th>
                  <th className="px-6 py-3 text-right">Valor Estoque</th>
                  <th className="px-6 py-3 text-right">Lucro Previsto</th>
                  <th className="px-6 py-3 text-right">Disponível (%)</th>
                  <th className="px-6 py-3 text-right">Para Encher</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {tanques.map(t => {
                  const percent = t.capacidade > 0 ? (t.estoque_atual / t.capacidade) * 100 : 0;
                  return (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-3 font-medium text-gray-900 dark:text-white">{t.nome}</td>
                      <td className="px-6 py-3">{t.combustivel?.nome}</td>
                      <td className="px-6 py-3 text-right font-mono">{t.capacidade.toLocaleString()} L</td>
                      <td className="px-6 py-3 text-right font-mono font-bold">{t.estoque_atual.toLocaleString()} L</td>
                      <td className="px-6 py-3 text-right font-mono text-gray-600 dark:text-gray-300">
                        {(t.estoque_atual * (t.combustivel?.preco_custo || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-green-600 font-bold">
                        {(t.estoque_atual * ((t.combustivel?.preco_venda || 0) - (t.combustivel?.preco_custo || 0))).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="px-6 py-3 text-right">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${percent < 15 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-mono text-gray-500">
                        {(t.capacidade - t.estoque_atual).toLocaleString()} L
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Evolução do Estoque (30 dias)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tanques.map(t => (
                <InventoryHistoryChart key={t.id} tankName={t.nome} data={histories[t.id]} />
              ))}
            </div>
          </div>
        </>
      )}

      {/* Modal de Nova Medição */}
      {showMedicaoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Ruler className="text-blue-600" size={24} />
                Nova Medição (Régua)
              </h2>
              <button
                onClick={() => setShowMedicaoModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Seleção do Tanque */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Selecione o Tanque
              </label>
              <select
                value={selectedTanque?.id || ''}
                onChange={(e) => {
                  const tanque = tanques.find(t => t.id === Number(e.target.value));
                  if (tanque) {
                    setSelectedTanque(tanque);
                    setMedicaoValue(tanque.estoque_atual.toString().replace('.', ','));
                  }
                }}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Escolha um tanque...</option>
                {tanques.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} - {t.combustivel?.nome} (Atual: {t.estoque_atual.toLocaleString()} L)
                  </option>
                ))}
              </select>
            </div>

            {/* Valor da Medição */}
            {selectedTanque && (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Volume Medido (Litros)
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={medicaoValue}
                      onChange={(e) => setMedicaoValue(e.target.value)}
                      placeholder="Ex: 15000"
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-lg font-mono"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">L</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Capacidade: {selectedTanque.capacidade.toLocaleString()} L |
                    Estoque atual: {selectedTanque.estoque_atual.toLocaleString()} L
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Observação (opcional)
                  </label>
                  <input
                    type="text"
                    value={medicaoObservacao}
                    onChange={(e) => setMedicaoObservacao(e.target.value)}
                    placeholder="Ex: Medição após recebimento"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </>
            )}

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowMedicaoModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveMedicao}
                disabled={!selectedTanque || !medicaoValue || savingMedicao}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {savingMedicao ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Salvando...
                  </>
                ) : (
                  <>
                    <Ruler size={16} />
                    Salvar Medição
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDashboardScreen;

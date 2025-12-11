
import React, { useState, useEffect } from 'react';
import { 
  Fuel, 
  Plus, 
  Edit2, 
  Trash2, 
  Sun, 
  Sunset, 
  Moon, 
  History, 
  Save, 
  Sliders,
  Loader2 
} from 'lucide-react';
import { fetchSettingsData } from '../services/api';
import { ProductConfig, NozzleConfig, ShiftConfig } from '../types';

const SettingsScreen: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductConfig[]>([]);
  const [nozzles, setNozzles] = useState<NozzleConfig[]>([]);
  const [shifts, setShifts] = useState<ShiftConfig[]>([]);
  const [tolerance, setTolerance] = useState('0,00');

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchSettingsData();
        setProducts(data.products);
        setNozzles(data.nozzles);
        setShifts(data.shifts);
      } catch (error) {
        console.error("Failed to fetch settings", error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const getProductTypeStyle = (type: string) => {
    switch(type) {
      case 'Combustível': return 'bg-yellow-100 text-yellow-700';
      case 'Biocombustível': return 'bg-green-100 text-green-700';
      case 'Diesel': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getShiftIcon = (type: string) => {
    switch(type) {
      case 'sun': return <Sun size={18} className="text-yellow-500" />;
      case 'sunset': return <Sunset size={18} className="text-orange-500" />;
      case 'moon': return <Moon size={18} className="text-blue-500" />;
      default: return <Sun size={18} />;
    }
  };

  if (loading) {
    return (
       <div className="flex flex-col items-center justify-center min-h-[500px] w-full text-blue-600">
          <Loader2 size={48} className="animate-spin mb-4" />
          <p className="text-gray-500 font-medium">Carregando configurações...</p>
       </div>
    );
 }

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 font-sans pb-24 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
           <h1 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Configurações do Posto</h1>
           <p className="text-gray-500 mt-2">Defina produtos, bicos, turnos e parâmetros operacionais.</p>
        </div>
        <div className="flex gap-3">
           <button className="flex items-center gap-2 px-4 h-10 rounded-lg border border-gray-200 bg-white text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors shadow-sm">
              <History size={18} />
              <span>Log de Alterações</span>
           </button>
           <button className="flex items-center gap-2 px-4 h-10 rounded-lg bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/20">
              <Save size={18} />
              <span>Salvar Todas Alterações</span>
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Column (Products & Nozzles) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Products Management */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Fuel className="text-blue-600" size={24} />
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Gestão de Produtos</h3>
                            <p className="text-xs text-gray-500">Cadastre combustíveis e produtos da pista.</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 transition-colors">
                        <Plus size={14} /> ADICIONAR
                    </button>
                </div>
                <div className="overflow-x-auto">
                    {products.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Nenhum produto cadastrado.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Nome do Produto</th>
                                    <th className="px-6 py-4">Tipo</th>
                                    <th className="px-6 py-4 text-right">Valor / Litro (R$)</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {products.map((product) => (
                                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{product.name}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${getProductTypeStyle(product.type)}`}>
                                                {product.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-mono text-gray-900 font-bold">
                                            {product.price.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3 text-gray-400">
                                                <button className="hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                <button className="hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Nozzles Management */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Fuel className="text-blue-600" size={24} />
                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                <div className="size-2 bg-green-500 rounded-full"></div>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Gestão de Bicos</h3>
                            <p className="text-xs text-gray-500">Associe bicos aos tanques e produtos.</p>
                        </div>
                    </div>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 text-xs font-bold rounded hover:bg-blue-100 transition-colors">
                        <Plus size={14} /> ADICIONAR
                    </button>
                </div>
                <div className="overflow-x-auto">
                    {nozzles.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">Nenhum bico configurado.</div>
                    ) : (
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Nº do Bico</th>
                                    <th className="px-6 py-4">Produto Vinculado</th>
                                    <th className="px-6 py-4">Tanque de Origem</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {nozzles.map((nozzle) => (
                                    <tr key={nozzle.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="size-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-sm text-gray-700">
                                                {nozzle.number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">{nozzle.productName}</td>
                                        <td className="px-6 py-4 text-gray-500">{nozzle.tankSource}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center justify-center gap-3 text-gray-400">
                                                <button className="hover:text-blue-600 transition-colors"><Edit2 size={16} /></button>
                                                <button className="hover:text-red-600 transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

        </div>

        {/* Right Column (Shifts & Params) */}
        <div className="lg:col-span-1 space-y-8">
            
            {/* Shifts Configuration */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <History size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Configuração de Turnos</h3>
                        <p className="text-xs text-gray-500 leading-tight mt-1">Defina os horários operacionais de cada equipe.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {shifts.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-4">Nenhum turno configurado.</p>
                    ) : (
                        shifts.map((shift) => (
                            <div key={shift.id} className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                                <div className="flex items-center gap-2 mb-3">
                                    {getShiftIcon(shift.iconType)}
                                    <span className="font-bold text-sm text-gray-900">{shift.name}</span>
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Início</label>
                                        <input 
                                            type="time" 
                                            defaultValue={shift.start}
                                            className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] text-gray-500 uppercase font-bold mb-1 block">Fim</label>
                                        <input 
                                            type="time" 
                                            defaultValue={shift.end}
                                            className="w-full px-3 py-1.5 rounded border border-gray-200 bg-white text-sm font-medium text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Closing Parameters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                        <Sliders size={20} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900">Parâmetros do Fechamento</h3>
                        <p className="text-xs text-gray-500 leading-tight mt-1">Regras para a validação do caixa.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-gray-700 block mb-1.5">Tolerância de Divergência (R$)</label>
                        <p className="text-xs text-gray-500 mb-2">Valor máximo aceito sem alerta crítico.</p>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">R$</span>
                            <input 
                                type="text" 
                                value={tolerance}
                                onChange={(e) => setTolerance(e.target.value)}
                                className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-mono font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                    </div>
                </div>
            </div>

        </div>

      </div>
    </div>
  );
};

export default SettingsScreen;

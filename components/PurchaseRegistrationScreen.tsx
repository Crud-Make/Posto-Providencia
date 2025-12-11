import React from 'react';
import {
   Save,
   FileText,
   Fuel,
   Leaf,
   Truck,
   Receipt,
   UploadCloud,
   AlignLeft,
   BarChart3,
   TrendingDown,
   Package,
   CheckCircle2,
   History,
   HelpCircle
} from 'lucide-react';

const PurchaseRegistrationScreen: React.FC = () => {
   return (
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 text-[#0d1b13]">
         {/* Breadcrumbs */}
         <div className="mb-8 space-y-4">
            <div className="flex items-center gap-2 text-sm">
               <a href="#" className="text-[#4c9a6c] hover:text-[#13ec6d] transition-colors font-medium">Início</a>
               <span className="text-[#4c9a6c]/50">/</span>
               <a href="#" className="text-[#4c9a6c] hover:text-[#13ec6d] transition-colors font-medium">Compras</a>
               <span className="text-[#4c9a6c]/50">/</span>
               <span className="text-[#0d1b13] font-semibold">Nova Compra</span>
            </div>

            <div className="flex flex-wrap items-end justify-between gap-4">
               <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-[#0d1b13]">Registro de Compra</h1>
                  <p className="text-[#4c9a6c] mt-1 text-lg">Entrada de combustível e atualização de estoque</p>
               </div>
               <div className="flex gap-3">
                  <button className="px-5 py-2.5 rounded-lg border border-[#e7f3ec] bg-white text-[#0d1b13] font-bold text-sm hover:bg-gray-50 transition-colors">
                     Cancelar
                  </button>
                  <button className="px-5 py-2.5 rounded-lg bg-[#13ec6d] text-[#0d1b13] font-bold text-sm shadow-lg shadow-[#13ec6d]/20 hover:bg-[#0eb553] hover:shadow-[#13ec6d]/30 transition-all flex items-center gap-2">
                     <Save size={18} />
                     Registrar Entrada
                  </button>
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-8 flex flex-col gap-6">

               {/* Dados da Compra */}
               <div className="bg-white rounded-xl shadow-sm border border-[#e7f3ec] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e7f3ec] flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                        <FileText size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-[#0d1b13]">Dados da Compra</h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Data da Compra</span>
                        <input type="date" className="w-full h-12 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] px-4 text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all" />
                     </label>

                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Fornecedor</span>
                        <select className="w-full h-12 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] px-4 text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all cursor-pointer appearance-none">
                           <option value="" disabled selected>Selecione o fornecedor</option>
                           <option value="petrobras">Petrobras Distribuidora S.A.</option>
                           <option value="ipiranga">Ipiranga Produtos de Petróleo</option>
                           <option value="shell">Raízen Combustíveis S.A.</option>
                        </select>
                     </label>

                     <div className="flex flex-col gap-2 md:col-span-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Tipo de Combustível</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                           {/* Radio Cards */}
                           <label className="cursor-pointer relative">
                              <input type="radio" name="fuel_type" className="peer sr-only" defaultChecked />
                              <div className="h-12 flex items-center justify-center gap-2 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] peer-checked:bg-[#13ec6d]/10 peer-checked:border-[#13ec6d] peer-checked:text-[#0eb553] transition-all font-medium text-sm">
                                 <Fuel size={20} />
                                 Gasolina Comum
                              </div>
                           </label>
                           <label className="cursor-pointer relative">
                              <input type="radio" name="fuel_type" className="peer sr-only" />
                              <div className="h-12 flex items-center justify-center gap-2 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] peer-checked:bg-[#13ec6d]/10 peer-checked:border-[#13ec6d] peer-checked:text-[#0eb553] transition-all font-medium text-sm">
                                 <Leaf size={20} />
                                 Etanol
                              </div>
                           </label>
                           <label className="cursor-pointer relative">
                              <input type="radio" name="fuel_type" className="peer sr-only" />
                              <div className="h-12 flex items-center justify-center gap-2 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] peer-checked:bg-[#13ec6d]/10 peer-checked:border-[#13ec6d] peer-checked:text-[#0eb553] transition-all font-medium text-sm">
                                 <Truck size={20} />
                                 Diesel S-10
                              </div>
                           </label>
                        </div>
                     </div>

                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Quantidade (Litros)</span>
                        <div className="relative">
                           <input type="number" placeholder="0" className="w-full h-12 pl-4 pr-12 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all font-bold" />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c9a6c] font-medium">L</span>
                        </div>
                     </label>

                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Valor Total (R$)</span>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4c9a6c] font-medium">R$</span>
                           <input type="number" placeholder="0,00" className="w-full h-12 pl-12 pr-4 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all font-bold" />
                        </div>
                     </label>

                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Despesas do Mês (%)</span>
                        <div className="relative">
                           <input
                              type="number"
                              placeholder="0,00"
                              step="0.01"
                              className="w-full h-12 pl-4 pr-12 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all font-bold"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c9a6c] font-medium">%</span>
                        </div>
                        <p className="text-xs text-[#4c9a6c]">Despesas adicionais (frete, impostos, etc.)</p>
                     </label>

                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Valor p/a Venda (R$/L)</span>
                        <div className="relative">
                           <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#4c9a6c] font-medium">R$</span>
                           <input
                              type="number"
                              placeholder="0,00"
                              step="0.01"
                              className="w-full h-12 pl-12 pr-16 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all font-bold"
                           />
                           <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#4c9a6c] font-medium">/ L</span>
                        </div>
                        <p className="text-xs text-[#4c9a6c]">Preço de venda ao público por litro</p>
                     </label>

                  </div>
               </div>

               {/* Nota Fiscal */}
               <div className="bg-white rounded-xl shadow-sm border border-[#e7f3ec] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e7f3ec] flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                        <Receipt size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-[#0d1b13]">Nota Fiscal <span className="text-xs font-normal text-[#4c9a6c] ml-1">(Opcional)</span></h3>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                     <label className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Número da NF</span>
                        <input type="text" placeholder="Ex: 000.123.456" className="w-full h-12 rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] px-4 text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all" />
                     </label>
                     <div className="flex flex-col gap-2">
                        <span className="text-sm font-semibold text-[#0d1b13]">Anexo (XML ou PDF)</span>
                        <div className="relative group cursor-pointer h-12">
                           <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                           <div className="w-full h-full rounded-lg border border-dashed border-[#e7f3ec] bg-[#f8fcfa] flex items-center justify-center gap-2 text-[#4c9a6c] group-hover:border-[#13ec6d] group-hover:text-[#13ec6d] transition-all">
                              <UploadCloud size={20} />
                              <span className="text-sm font-medium">Clique ou arraste o arquivo</span>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Observações */}
               <div className="bg-white rounded-xl shadow-sm border border-[#e7f3ec] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e7f3ec] flex items-center gap-3">
                     <div className="p-2 rounded-lg bg-gray-50 text-gray-600">
                        <AlignLeft size={20} />
                     </div>
                     <h3 className="text-lg font-bold text-[#0d1b13]">Observações</h3>
                  </div>
                  <div className="p-6">
                     <textarea rows={3} className="w-full rounded-lg border border-[#e7f3ec] bg-[#f8fcfa] px-4 py-3 text-base text-[#0d1b13] focus:border-[#13ec6d] focus:ring-1 focus:ring-[#13ec6d] outline-none transition-all resize-none" placeholder="Insira detalhes adicionais sobre o recebimento, motorista, placa do caminhão..."></textarea>
                  </div>
               </div>

            </div>

            {/* Right Column */}
            <div className="lg:col-span-4 flex flex-col gap-6">

               {/* Análise de Custo */}
               <div className="bg-white rounded-xl shadow-sm border border-[#e7f3ec] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e7f3ec]">
                     <h3 className="text-base font-bold text-[#0d1b13] flex items-center gap-2">
                        <BarChart3 size={20} className="text-[#13ec6d]" />
                        Análise de Custo
                     </h3>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                     <div>
                        <p className="text-sm font-medium text-[#4c9a6c] mb-1">Custo por Litro (Calculado)</p>
                        <div className="flex items-baseline gap-1">
                           <span className="text-2xl font-black text-[#0d1b13]">R$ 5,45</span>
                           <span className="text-sm text-[#4c9a6c]">/ L</span>
                        </div>
                     </div>
                     <hr className="border-[#e7f3ec] border-dashed" />
                     <div>
                        <p className="text-sm font-medium text-[#4c9a6c] mb-1">Novo Custo Médio</p>
                        <div className="flex items-center justify-between">
                           <div className="flex items-baseline gap-1">
                              <span className="text-3xl font-black text-[#0d1b13]">R$ 5,38</span>
                              <span className="text-sm text-[#4c9a6c]">/ L</span>
                           </div>
                           <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 text-xs font-bold">
                              <TrendingDown size={14} />
                              -1.2%
                           </div>
                        </div>
                        <p className="text-xs text-[#4c9a6c] mt-2">Comparado ao custo atual de R$ 5,44</p>
                     </div>
                  </div>
               </div>

               {/* Impacto no Estoque */}
               <div className="bg-white rounded-xl shadow-sm border border-[#e7f3ec] overflow-hidden">
                  <div className="px-6 py-4 border-b border-[#e7f3ec]">
                     <h3 className="text-base font-bold text-[#0d1b13] flex items-center gap-2">
                        <Package size={20} className="text-orange-500" />
                        Impacto no Estoque
                     </h3>
                  </div>
                  <div className="p-6 flex flex-col gap-6">
                     {/* Visual Bar */}
                     <div className="relative pt-6 pb-2">
                        <div className="flex justify-between text-xs font-semibold text-[#4c9a6c] mb-2 uppercase tracking-wide">
                           <span>Vazio</span>
                           <span>Capacidade (15k L)</span>
                        </div>
                        <div className="h-6 w-full bg-gray-100 rounded-full overflow-hidden relative shadow-inner">
                           <div className="absolute top-0 left-0 h-full bg-blue-500 rounded-l-full z-10" style={{ width: '45%' }}></div>
                           {/* Striped Green Pattern for new entry */}
                           <div className="absolute top-0 left-0 h-full bg-[#13ec6d]/60 z-20" style={{ width: '70%', backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                           <div className="absolute top-0 right-0 h-full w-0.5 bg-red-500 z-30"></div>
                        </div>
                        <div className="flex justify-between mt-3 text-xs">
                           <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              <span className="text-[#0d1b13]">Atual</span>
                           </div>
                           <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full bg-[#13ec6d]"></div>
                              <span className="text-[#0d1b13] font-bold">+ Compra</span>
                           </div>
                        </div>
                     </div>

                     {/* Stats */}
                     <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-[#f8fcfa] rounded-lg border border-[#e7f3ec]">
                           <p className="text-xs text-[#4c9a6c] uppercase">Estoque Atual</p>
                           <p className="text-lg font-bold text-[#0d1b13]">6.750 L</p>
                        </div>
                        <div className="p-3 bg-[#13ec6d]/10 rounded-lg border border-[#13ec6d]/20">
                           <p className="text-xs text-[#0eb553] uppercase font-bold">+ Entrada</p>
                           <p className="text-lg font-bold text-[#0d1b13]">+ 3.750 L</p>
                        </div>
                     </div>

                     {/* Result */}
                     <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-[#0d1b13]">Novo Estoque</span>
                        <span className="text-xl font-black text-[#0d1b13]">10.500 L</span>
                     </div>

                     {/* Status OK */}
                     <div className="flex gap-3 p-3 bg-green-50 border border-green-100 rounded-lg items-start">
                        <CheckCircle2 size={20} className="text-green-600 mt-0.5" />
                        <div>
                           <p className="text-sm font-bold text-green-700">Capacidade OK</p>
                           <p className="text-xs text-green-600 mt-1">O tanque comportará a nova entrada.</p>
                        </div>
                     </div>

                  </div>
               </div>

               {/* Actions */}
               <div className="grid grid-cols-2 gap-4">
                  <button className="flex items-center justify-center gap-2 p-4 rounded-xl border border-[#e7f3ec] bg-white hover:bg-gray-50 transition-colors text-[#0d1b13] text-sm font-medium">
                     <History size={20} className="text-[#13ec6d]" />
                     Histórico
                  </button>
                  <button className="flex items-center justify-center gap-2 p-4 rounded-xl border border-[#e7f3ec] bg-white hover:bg-gray-50 transition-colors text-[#0d1b13] text-sm font-medium">
                     <HelpCircle size={20} className="text-[#13ec6d]" />
                     Ajuda
                  </button>
               </div>

            </div>
         </div>
      </div>
   );
};

export default PurchaseRegistrationScreen;
🔍 RELATÓRIO COMPLETO: USO DE any NO PROJETO
📊 RESUMO EXECUTIVO
Total encontrado: 43 ocorrências de any em 8 arquivos

Categoria:

🔴 Crítico (precisa correção): 11 ocorrências
🟡 Médio (pode ser melhorado): 18 ocorrências
🟢 Baixo (casting justificado): 14 ocorrências
🗂️ ARQUIVOS AFETADOS (por prioridade)
🔴 PRIORIDADE CRÍTICA
1. src/services/api/aggregator.service.ts (11 ocorrências)
Linhas com problema:

Linha 215: const fechamentosMap = new Map<number, any>();

❌ Problema: Map sem tipo definido
✅ Solução: Map<number, FechamentoFrentista>
Linha 448: const frentistas = (frentistasData || []).map((f: any) => ({ ...f, email: null }));

❌ Problema: Parâmetro sem tipo
✅ Solução: (f: Frentista) => ...
Linha 476: caixasAbertos.forEach((c: any) => {

❌ Problema: Parâmetro sem tipo
✅ Solução: (c: CaixaAberto) => ... (criar interface)
Linhas 529, 560, 606, 675, 720, 734: Type casting de relacionamentos

❌ Problema: (h.fechamento as any)?.turno?.nome
✅ Solução: Criar tipos para relações do Supabase com .select()
Impacto: 🔴 ALTO - Service central usado em múltiplos componentes

2. src/services/api/reset.service.ts (12 ocorrências)
Todas as linhas: 33, 56, 60, 72, 76, 97, 101, 124, 128, 133, 154, 173

Padrão repetido:


// ❌ ERRADO
let query = (supabase as any).from(tableName).delete();

// ✅ CORRETO
let query = supabase.from(tableName).delete();
Causa raiz: Tentativa de usar tableName dinâmico, mas Supabase tem tipos literais

Solução: Usar type assertion adequado ou função auxiliar tipada

Impacto: 🟡 MÉDIO - Service usado apenas em contextos administrativos

3. src/services/api/cliente.service.ts (1 ocorrência)
Linha 16: notas?: any[];

❌ Problema: Comentário indica dependência circular
✅ Solução: Usar NotaFrentistaResponse[] (já existe em notaFrentista.service.ts)
Impacto: 🔴 MÉDIO - Afeta tipagem de clientes com notas

🟡 PRIORIDADE MÉDIA
4. src/components/financeiro/components/GestaoEmprestimos.tsx (4 ocorrências)
Linhas 109, 112, 170, 564: Casting de periodicidade


// ❌ ERRADO
await api.emprestimo.update(Number(editingLoanId), formData as any);

// ✅ CORRETO - Criar tipo específico
type FormDataEmprestimo = Omit<InsertTables<'Emprestimo'>, 'periodicidade'> & {
  periodicidade: PeriodicidadeEmprestimo;
};
Impacto: 🟡 BAIXO - Funcionalidade específica, mas pode causar bugs

5. src/components/financeiro/hooks/useFinanceiro.ts (1 ocorrência)
Linha 137: data: (r as any).fechamento?.data || dataInicio

❌ Problema: Casting de relacionamento Supabase
✅ Solução: Criar tipo para resposta com .select('*, fechamento(data)')
Impacto: 🟢 BAIXO - Apenas fallback

🟢 PRIORIDADE BAIXA (casting justificado)
6. src/components/estoque/gestao/hooks/useGestaoEstoque.ts (1 ocorrência)
Linha 99: } as any);

ℹ️ Contexto: Transformação de dados complexa
⚠️ Recomendação: Revisar se pode criar tipo intermediário
7. src/services/api/notaFrentista.service.ts ✅ SEM any
Este arquivo está PERFEITO! Pode ser usado como modelo para refatorar os 
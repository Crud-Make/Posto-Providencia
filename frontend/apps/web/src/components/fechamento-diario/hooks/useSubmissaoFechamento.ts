import { useState } from 'react';
import { usePosto } from '../../../contexts/usePosto';
import { descreverErroDaApi, urlDaApi } from '../../../services/api/base';
import { gravarFechamentoDoDiaNaApi } from '../../../services/api/fechamento.api';
import { gravarPeloSupabase, type ParametrosDaGravacao } from './gravacaoLegadaSupabase';
import { montarDiaDeclarado } from './montarDiaDeclarado';

export interface SubmissaoParams extends ParametrosDaGravacao {
   readonly limparAutoSave: () => void;
   readonly onSuccess?: () => void;
}

export interface SubmissaoFechamento {
   readonly saving: boolean;
   readonly error: string | null;
   readonly success: string | null;
   readonly handleSave: (params: SubmissaoParams) => Promise<void>;
   readonly setError: (erro: string | null) => void;
   readonly setSuccess: (mensagem: string | null) => void;
}

/**
 * Grava o dia pelo transporte que a instalação tem (#103 P11).
 *
 * @returns A mensagem de erro para a tela, ou `null` quando gravou.
 *
 * @remarks
 * Mesma troca de transporte de P4–P7, no call site e nunca dentro do service: com `VITE_API_URL`
 * o dia vai inteiro num `PUT /api/postos/{posto}/fechamento` (uma transação no servidor, corpo
 * montado por `montarDiaDeclarado`); sem ela, o caminho legado do Supabase — que é o da
 * produção até o cutover (#105) e lança na primeira falha, como sempre fez.
 */
async function gravarDia(params: SubmissaoParams, postoAtivoId: number): Promise<string | null> {
   if (urlDaApi() === null) {
      await gravarPeloSupabase(params, postoAtivoId);
      return null;
   }

   return gravarFechamentoDoDiaNaApi(postoAtivoId, params.selectedDate, montarDiaDeclarado(params))
      .match(() => null, (erro) => descreverErroDaApi(erro));
}

/**
 * Hook para gerenciar a lógica de submissão do fechamento diário.
 *
 * @returns { saving, error, success, handleSave }
 */
export function useSubmissaoFechamento(): SubmissaoFechamento {
   const { postoAtivoId } = usePosto();
   const [saving, setSaving] = useState(false);
   const [error, setError] = useState<string | null>(null);
   const [success, setSuccess] = useState<string | null>(null);

   /**
    * Executa a persistência de todos os dados do fechamento.
    */
   const handleSave = async (params: SubmissaoParams): Promise<void> => {
      if (postoAtivoId === 0) {
         setError('Posto não selecionado.');
         return;
      }

      if (!params.podeFechar) {
         setError('Verifique os dados antes de salvar (Leituras inválidas ou Frentistas vazios).');
         return;
      }

      try {
         setSaving(true);
         setError(null);
         setSuccess(null);

         const falha = await gravarDia(params, postoAtivoId);
         if (falha !== null) {
            setError(falha);
            return;
         }

         setSuccess('Fechamento realizado com sucesso!');

         // Aguarda 500ms para garantir persistência no banco antes de limpar
         await new Promise(resolve => setTimeout(resolve, 500));

         params.limparAutoSave();

         // Em vez de recarregar a página, chama callback para atualizar dados em tela
         setTimeout(() => {
            params.onSuccess?.();
         }, 1500);
      } catch (err: unknown) {
         console.error('❌ Erro na submissão:', err);
         setError(err instanceof Error ? err.message : 'Erro desconhecido ao salvar fechamento');
      } finally {
         setSaving(false);
      }
   };

   return {
      saving,
      error,
      success,
      handleSave,
      setError,
      setSuccess
   };
}

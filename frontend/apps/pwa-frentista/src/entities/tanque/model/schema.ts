import { z } from 'zod';

/**
 * Tanque do posto com o combustível — a lista da tela de régua (#74).
 * `select('id, combustivel:Combustivel(nome, codigo)')`; o join é many-to-one.
 *
 * @remarks `codigo` é NOT NULL no banco, mas o tipo que a tela já usava aceita `null`; o
 *          schema mantém esse formato para não apertar o contrato numa mudança estrutural.
 */
export const tanqueSchema = z.object({
  id: z.number(),
  combustivel: z.object({ nome: z.string(), codigo: z.string().nullable() }).nullable(),
});

export type Tanque = z.infer<typeof tanqueSchema>;

export const listaDeTanquesSchema = z.array(tanqueSchema).nullable();

/**
 * Medição de régua já gravada no dia (`HistoricoTanque`: as duas colunas são nuláveis).
 *
 * @remarks `volume_fisico` continua `.nullable()` — apertar a nulidade mudaria o
 *          comportamento sobre linha legada sem prova de que ela não existe — mas ganha
 *          `.nonnegative()`: o `CHECK` da tabela proíbe negativo (`volume_fisico >= 0`, em
 *          `banco/init/01-esquema-base.sql:1789` e `:1794`), então negativo aqui é resposta
 *          corrompida, e o certo é falhar na validação em vez de virar litro no estoque.
 */
export const medicaoDoDiaSchema = z.object({
  tanque_id: z.number().nullable(),
  volume_fisico: z.number().nonnegative().nullable(),
});

export type MedicaoDoDia = z.infer<typeof medicaoDoDiaSchema>;

export const medicoesDoDiaSchema = z.array(medicaoDoDiaSchema).nullable();

/**
 * Teto de `numeric(10,2)` — maior valor que a coluna `volume_fisico` representa.
 *
 * @remarks As **casas decimais não entram** no schema: `multipleOf(0.01)` é armadilha de
 *          ponto flutuante (`1.15 % 0.01 !== 0` em binário) e reprovaria medição legítima.
 *          O arredondamento é do banco, na própria coluna.
 */
export const TETO_VOLUME_FISICO = 99_999_999.99;

/**
 * O que a tela pode gravar em `HistoricoTanque` (upsert por tanque+dia, #74).
 *
 * @remarks Espelha o `CHECK` do **INSERT** (`banco/init/01-esquema-base.sql:1789`), que exige
 *          `tanque_id IS NOT NULL AND volume_fisico IS NOT NULL AND volume_fisico >= 0`.
 *          Por isso `volume_fisico` aqui é **não nulo**: é a escrita, não a leitura.
 *
 *          Os dois `CHECK` da tabela **não são iguais** — o do UPDATE (`:1794`) não repete o
 *          `IS NOT NULL`, porque em SQL um `CHECK` só reprova quando o predicado é `FALSE` e
 *          `NULL >= 0` é `NULL`. Nada disso muda este schema: quem grava é o INSERT do upsert.
 *
 *          O `dentro_da_janela_de_escrita(data)` do mesmo `CHECK` **não** é representado:
 *          dependeria de "hoje", o que tira a pureza do schema. Fica na policy do banco, onde
 *          já está — e quem a confere hoje é a releitura anti-RLS de `salvarMedicao`.
 */
export const medicaoParaGravarSchema = z.object({
  tanque_id: z.number().int().positive(),
  data: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  volume_fisico: z.number().nonnegative().max(TETO_VOLUME_FISICO),
});

export type MedicaoParaGravar = z.infer<typeof medicaoParaGravarSchema>;

/**
 * Releitura da medição logo depois do upsert (conferência anti-RLS silenciosa).
 *
 * @remarks `volume_fisico` aceita número OU texto, sem coerção: a conferência de sempre faz
 *          `Number(gravado.volume_fisico) !== volumeFisico`, e esse `Number()` é o que decide.
 *          Apertar para só número aqui mudaria o resultado da conferência.
 */
export const medicaoRelidaSchema = z
  .object({ volume_fisico: z.union([z.number(), z.string()]).nullable() })
  .nullable();

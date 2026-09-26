export const meta = {
  name: 'refatora-modulo',
  description: 'Refatora UM módulo seguindo a skill refactor-module: mapeia, verifica, planeja e (modo executar) edita e roda os gates',
  whenToUse: 'Refatorar um módulo do Posto Providência. Rode primeiro com modo "plano", leia o plano, e só depois rode com modo "executar" passando o plano aprovado.',
  phases: [
    { title: 'Mapear', detail: 'grafo, historico, conformidade e os 5 níveis de zoom, em paralelo (somente leitura)', model: 'opus' },
    { title: 'Verificar', detail: 'um cético por relatório tenta derrubar cada afirmação', model: 'opus' },
    { title: 'Planejar', detail: 'agente principal consolida o plano', model: 'opus' },
    { title: 'Executar', detail: 'agente principal edita, um passo por vez, na árvore atual', model: 'opus' },
    { title: 'Gates', detail: 'agente independente roda e lê os quality gates da Fase 4', model: 'opus' },
    { title: 'Revisar', detail: 'revisão adversarial do diff e patch de documentação', model: 'opus' },
  ],
}

// ---------------------------------------------------------------------------
// Uso:
//   modo plano    → args: { modulo: 'Fechamento', escopo?: 'caminhos ou descrição' }
//   modo executar → args: { modulo, escopo?, modo: 'executar', plano: '<texto do plano aprovado>' }
//   curto: true   → modo curto (aprovado pelo dono em 19/09, prazo de domingo): 1 mapeador sem cético no
//                   plano; 1 revisor adversarial (que também aponta doc desatualizada) no executar.
//                   Gates, canário, hooks e regras são IDÊNTICOS ao modo completo. Proibido quando o
//                   trabalho toca dinheiro/fórmula, cria arquitetura nova ou grava no banco: aí é o completo.
// Todos os agentes rodam em Opus 5.5 (22/09: o dono trocou o Fable pelo Opus 5.5 também no principal).
// Nada aqui faz commit, push ou merge: isso fica com o dono, depois de ler o resultado.
// ---------------------------------------------------------------------------

const PRINCIPAL = 'opus'
const DEMAIS = 'opus'
const MAX_TENTATIVAS_GATES = 2

if (!args || typeof args.modulo !== 'string' || args.modulo.trim() === '') {
  throw new Error('Passe args.modulo (ex.: { modulo: "Fechamento" }).')
}
const modulo = args.modulo.trim()
const escopo = typeof args.escopo === 'string' && args.escopo.trim() !== '' ? args.escopo.trim() : '(o agente delimita pelo nome do módulo)'
const modo = args.modo === 'executar' ? 'executar' : 'plano'
const curto = args.curto === true

// Regras que todo agente recebe. O CLAUDE.md já chega injetado; aqui só o que o
// workflow acrescenta sobre os hooks.
const REGRAS = `
Regras deste workflow (valem acima de qualquer conveniência):
- Siga o CLAUDE.md do projeto à risca. Carregue a skill refactor-module antes de começar; se o módulo encosta em fórmula de dinheiro, carregue também fechamento-posto-providencia.
- Os hooks de .claude/settings.json disparam dentro de você. Se um hook NEGAR ou AVISAR, pare aquela ação, não tente outro caminho que chegue ao mesmo efeito, e registre o hook e a mensagem no seu retorno.
- O mesmo vale para o sistema de permissões e o classificador do modo automático: se uma chamada for NEGADA, não repita o mesmo comando com outra descrição, outro wrapper ou outra forma de escrever. Registre a negação no retorno e siga sem aquela ação (em 18/09 um executor reescreveu a descrição para passar — isso é contornar).
- Proibido: --no-verify, desligar hook, editar .claude/hooks ou .claude/settings.json, escrever em docs/data, git commit, git push, git merge, git reset, git checkout de arquivo, git stash, rebase.
- Proibido ajustar teste golden para passar. Proibido desligar trava do Eloquent.
- Não afirme nada que você não conferiu lendo o arquivo ou a saída do comando. Cite arquivo:linha.
`

const MAPEAMENTO = {
  type: 'object',
  properties: {
    resumo: { type: 'string' },
    afirmacoes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          afirmacao: { type: 'string' },
          evidencia: { type: 'string', description: 'arquivo:linha ou comando + trecho da saída' },
        },
        required: ['afirmacao', 'evidencia'],
      },
    },
    hooksQueBarraram: { type: 'array', items: { type: 'string' } },
  },
  required: ['resumo', 'afirmacoes', 'hooksQueBarraram'],
}

const VEREDITO = {
  type: 'object',
  properties: {
    confirmadas: { type: 'array', items: { type: 'string' } },
    derrubadas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { afirmacao: { type: 'string' }, motivo: { type: 'string' } },
        required: ['afirmacao', 'motivo'],
      },
    },
  },
  required: ['confirmadas', 'derrubadas'],
}

const PLANO = {
  type: 'object',
  properties: {
    podeSeguir: { type: 'boolean', description: 'false se a refatoração mistura estrutura com mudança de fórmula, ou se falta dado para decidir' },
    motivoSeNaoPuder: { type: 'string' },
    tocaDinheiro: { type: 'boolean' },
    zoom: {
      type: 'object',
      properties: {
        contexto: { type: 'string' },
        arquitetura: { type: 'string' },
        componentes: { type: 'string' },
        comportamento: { type: 'string', description: 'o que NÃO pode mudar' },
        contratos: { type: 'string' },
      },
      required: ['contexto', 'arquitetura', 'componentes', 'comportamento', 'contratos'],
    },
    passos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          titulo: { type: 'string' },
          arquivos: { type: 'array', items: { type: 'string' } },
          oQueFaz: { type: 'string' },
          comoProva: { type: 'string', description: 'teste ou gate que prende o comportamento deste passo' },
        },
        required: ['titulo', 'arquivos', 'oQueFaz', 'comoProva'],
      },
    },
    gates: { type: 'array', items: { type: 'string' }, description: 'comandos da Fase 4 que este módulo exige' },
    riscos: { type: 'array', items: { type: 'string' } },
  },
  required: ['podeSeguir', 'motivoSeNaoPuder', 'tocaDinheiro', 'zoom', 'passos', 'gates', 'riscos'],
}

const EXECUCAO = {
  type: 'object',
  properties: {
    passosFeitos: { type: 'array', items: { type: 'string' } },
    passosNaoFeitos: { type: 'array', items: { type: 'string' } },
    arquivosAlterados: { type: 'array', items: { type: 'string' } },
    hooksQueBarraram: { type: 'array', items: { type: 'string' } },
    parouPorque: { type: 'string', description: 'vazio se terminou todos os passos' },
  },
  required: ['passosFeitos', 'passosNaoFeitos', 'arquivosAlterados', 'hooksQueBarraram', 'parouPorque'],
}

const GATES = {
  type: 'object',
  properties: {
    verde: { type: 'boolean' },
    resultados: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          comando: { type: 'string' },
          passou: { type: 'boolean' },
          leitura: { type: 'string', description: 'números lidos da saída (erros, testes, cobertura), não impressão' },
        },
        required: ['comando', 'passou', 'leitura'],
      },
    },
    falhas: { type: 'array', items: { type: 'string' }, description: 'cada falha com arquivo:linha e mensagem' },
  },
  required: ['verde', 'resultados', 'falhas'],
}

const REVISAO = {
  type: 'object',
  properties: {
    soEstruturaMudou: { type: 'boolean' },
    problemas: {
      type: 'array',
      items: {
        type: 'object',
        properties: { local: { type: 'string' }, problema: { type: 'string' }, gravidade: { type: 'string', enum: ['bloqueia', 'corrigir', 'sugestao'] } },
        required: ['local', 'problema', 'gravidade'],
      },
    },
  },
  required: ['soEstruturaMudou', 'problemas'],
}

const cabecalho = `Módulo alvo: ${modulo}\nEscopo: ${escopo}\n${REGRAS}`

// ---------------------------------------------------------------------------
// Modo executar: pula mapeamento e parte do plano que o dono aprovou.
// ---------------------------------------------------------------------------
if (modo === 'executar') {
  if (typeof args.plano !== 'string' || args.plano.trim() === '') {
    throw new Error('Modo executar exige args.plano com o plano aprovado (saída do modo plano).')
  }
  const plano = args.plano
  if (curto && /"?tocaDinheiro"?\s*[:=]\s*true/.test(plano)) {
    throw new Error('Modo curto é proibido em plano que toca dinheiro: rode sem curto.')
  }

  phase('Executar')
  let execucao = await agent(
    `${cabecalho}
Você é o agente principal. Execute o plano aprovado abaixo, na árvore de trabalho atual.

Antes de editar:
1. Rode \`git branch --show-current\`. Se for main, PARE e devolva parouPorque="está na main".
2. Rode \`git status --porcelain\` e guarde como linha de base: arquivos já modificados antes de você não são seus e não podem ser tocados.
3. Se o plano marca tocaDinheiro, rode o golden do módulo ANTES de editar e anote o resultado.

Execute um passo por vez, na ordem. Depois de cada edição, leia o que os hooks trava-ts.py / trava-php.py / portao-golden.py responderam e corrija antes do próximo passo. Não saia do plano: se um passo se mostrar errado, pare e explique em parouPorque, não improvise outro.

PLANO APROVADO:
${plano}`,
    { label: 'executar', phase: 'Executar', model: PRINCIPAL, schema: EXECUCAO },
  )
  if (!execucao) throw new Error('O agente de execução não devolveu resultado.')

  let gates = null
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS_GATES + 1; tentativa++) {
    phase('Gates')
    gates = await agent(
      `${cabecalho}
Você é o verificador independente. Não edite código. Rode os quality gates da Fase 4 da skill refactor-module que este módulo exige (o plano abaixo lista os comandos; acrescente os que ele esqueceu) e LEIA a saída.

Regras de leitura, cada uma já deu verde falso aqui:
- PHPStan sai em JSON dentro de agente: conte pelo campo errors, nunca com grep.
- Pest Arch só vale na forma encadeada com um namespace por regra.
- Catraca (tsc/ESLint): erro novo reprova; confira que o número não subiu.
- Golden master: qualquer vermelho reprova, sem discussão.
- Se a execução criou trava nova, plante a violação, confirme vermelho, remova (canário).
- Confira antes que backend/vendor, node_modules, docs/data e .env existem; se faltar, verde=false.

Arquivos alterados pela execução: ${JSON.stringify(execucao.arquivosAlterados)}

PLANO:
${plano}`,
      { label: `gates #${tentativa}`, phase: 'Gates', model: DEMAIS, schema: GATES },
    )
    if (!gates) throw new Error('O agente de gates não devolveu resultado.')
    log(`Gates tentativa ${tentativa}: ${gates.verde ? 'verde' : `vermelho (${gates.falhas.length} falhas)`}`)
    if (gates.verde || tentativa > MAX_TENTATIVAS_GATES) break

    phase('Executar')
    const correcao = await agent(
      `${cabecalho}
Você é o agente principal. Os gates reprovaram a refatoração que você fez. Corrija SÓ o que as falhas abaixo apontam, dentro do escopo do plano. Não mexa em teste golden, não afrouxe regra, não use --aceitar-divida, não suba a catraca. Se a correção exigir sair do plano, pare e diga em parouPorque.

FALHAS:
${gates.falhas.join('\n')}

PLANO:
${plano}`,
      { label: `corrigir #${tentativa}`, phase: 'Executar', model: PRINCIPAL, schema: EXECUCAO },
    )
    if (!correcao) break
    execucao = {
      ...correcao,
      passosFeitos: [...execucao.passosFeitos, ...correcao.passosFeitos],
      arquivosAlterados: [...new Set([...execucao.arquivosAlterados, ...correcao.arquivosAlterados])],
      hooksQueBarraram: [...execucao.hooksQueBarraram, ...correcao.hooksQueBarraram],
    }
    if (correcao.parouPorque) break
  }

  phase('Revisar')
  if (curto) {
    const revisao = await agent(
      `${cabecalho}
Revise de forma adversarial o diff (\`git diff\` nos arquivos: ${JSON.stringify(execucao.arquivosAlterados)}). Não edite nada. Procure: mudança de comportamento disfarçada, fórmula de dinheiro alterada, trava afrouxada ou catraca subida, canário ausente para trava nova, desvio de hook, throw de regra de negócio, Result não consumido, any, import profundo, camada invertida, float em dinheiro. soEstruturaMudou=false se qualquer comportamento mudou. Em sugestoes, diga também se docs/arquitetura/regras.md, CHANGELOG.md ou o Design Doc do módulo ficaram desatualizados por este diff.`,
      { label: 'revisar diff', phase: 'Revisar', model: DEMAIS, schema: REVISAO },
    )
    return { modo, curto, modulo, execucao, gates, revisao }
  }
  const [revisao, docs] = await parallel([
    () => agent(
      `${cabecalho}
Revise de forma adversarial o diff da refatoração (\`git diff\` nos arquivos: ${JSON.stringify(execucao.arquivosAlterados)}). Não edite nada. Procure: mudança de comportamento disfarçada de refatoração, fórmula de dinheiro alterada, throw de regra de negócio que sobrou, Result não consumido, any, import profundo, camada invertida (Deptrac/FSD), controller com mais de 5 linhas por método, validação fora de FormRequest, float em dinheiro, N+1 sem teste. soEstruturaMudou=false se qualquer comportamento mudou.`,
      { label: 'revisar diff', phase: 'Revisar', model: DEMAIS, schema: REVISAO },
    ),
    () => agent(
      `Refatoração do módulo ${modulo} acabou de ser aplicada (não commitada). Arquivos: ${JSON.stringify(execucao.arquivosAlterados)}. Devolva o patch proposto para docs/architecture.md e para o Design Doc do módulo, se a estrutura mudou. Somente leitura.`,
      { label: 'doc-cycle', phase: 'Revisar', model: DEMAIS, agentType: 'doc-cycle-onboard' },
    ),
  ])

  return { modo, modulo, execucao, gates, revisao, patchDeDocumentacao: docs }
}

// ---------------------------------------------------------------------------
// Modo plano: mapeia em paralelo, cada relatório é verificado assim que chega,
// e o agente principal consolida. Nada é editado.
// ---------------------------------------------------------------------------
const SOMENTE_LEITURA = 'Somente leitura: não edite, não crie arquivo no repositório, não rode comando que escreva.'

const MAPEADORES = [
  {
    chave: 'impacto',
    agentType: 'grafo',
    prompt: `${cabecalho}\n${SOMENTE_LEITURA}\nLevante o raio de impacto do módulo: quem importa/chama cada arquivo dele (backend e frontend), o que quebra se ele mudar de lugar, e de onde vêm os valores que ele calcula.`,
  },
  {
    chave: 'historico',
    agentType: 'historico',
    prompt: `${cabecalho}\n${SOMENTE_LEITURA}\nVerifique se alguma branch aberta ou PR já mexe nos arquivos deste módulo, quando as decisões estruturais dele entraram e por quê, e se há duplicação histórica (CLAUDE.md §9).`,
  },
  {
    chave: 'conformidade',
    agentType: 'conformidade',
    prompt: `${cabecalho}\n${SOMENTE_LEITURA}\nListe as violações das convenções invioláveis DENTRO deste módulo (any, enum, import profundo, FSD invertido, dinheiro fora do lugar ou em float, throw de regra de negócio, controller gordo, validação fora de FormRequest), rankeadas, com arquivo:linha.`,
  },
  {
    chave: 'zoom',
    agentType: undefined,
    prompt: `${cabecalho}\n${SOMENTE_LEITURA}\nFaça a Fase 1 da skill refactor-module: descreva o módulo nos 5 níveis de zoom (contexto, arquitetura, componentes, comportamento, contratos). No nível comportamento, liste as invariantes que NÃO podem mudar e qual teste existente as prende (ou que não há teste). Diga explicitamente se o módulo calcula valor_conferido, diferenca, custo, lucro ou taxa.`,
  },
]

// Modo curto: um mapeador só, sem cético; o planejador confere a evidência que usar.
const MAPEADOR_CURTO = {
  chave: 'curto',
  agentType: undefined,
  prompt: `${cabecalho}\n${SOMENTE_LEITURA}\nMapeie o escopo de uma vez: (1) arquivos e quem os chama (raio de impacto); (2) se alguma branch/PR aberta mexe neles; (3) violações das convenções invioláveis dentro do escopo, com arquivo:linha; (4) invariantes que não podem mudar e o teste que as prende; (5) diga explicitamente se o trabalho toca valor_conferido, diferenca, custo, lucro, taxa, fórmula, golden, grava no banco ou cria arquitetura nova. Toda afirmação com arquivo:linha.`,
}

phase('Mapear')
const verificados = curto
  ? [await agent(MAPEADOR_CURTO.prompt, { label: 'mapear:curto', phase: 'Mapear', model: DEMAIS, schema: MAPEAMENTO })]
      .map(r => (r ? { chave: 'curto', relatorio: r, veredito: null } : null))
  : await pipeline(
  MAPEADORES,
  m => agent(m.prompt, {
    label: `mapear:${m.chave}`,
    phase: 'Mapear',
    model: DEMAIS,
    schema: MAPEAMENTO,
    ...(m.agentType ? { agentType: m.agentType } : {}),
  }),
  (relatorio, m) => {
    if (!relatorio) return null
    return agent(
      `${cabecalho}\n${SOMENTE_LEITURA}
Você é cético. Abaixo está o relatório "${m.chave}" sobre o módulo. Para CADA afirmação, abra a evidência citada e tente derrubá-la. Na dúvida, derrube. Afirmação sem arquivo:linha conferível é derrubada.

RELATÓRIO:
${JSON.stringify(relatorio, null, 2)}`,
      { label: `verificar:${m.chave}`, phase: 'Verificar', model: DEMAIS, schema: VEREDITO },
    ).then(v => ({ chave: m.chave, relatorio, veredito: v }))
  },
)

const validos = verificados.filter(Boolean)
const faltaram = (curto ? [MAPEADOR_CURTO] : MAPEADORES).map(m => m.chave).filter(c => !validos.some(v => v.chave === c))
if (faltaram.length > 0) log(`Relatórios que não voltaram: ${faltaram.join(', ')} — o plano vai sem eles`)

const consolidado = validos.map(v => ({
  chave: v.chave,
  resumo: v.relatorio.resumo,
  confirmadas: v.veredito ? v.veredito.confirmadas : v.relatorio.afirmacoes.map(a => `${a.afirmacao} [NÃO VERIFICADA] (${a.evidencia})`),
  derrubadas: v.veredito ? v.veredito.derrubadas : [],
  hooksQueBarraram: v.relatorio.hooksQueBarraram,
}))

phase('Planejar')
const plano = await agent(
  `${cabecalho}
${SOMENTE_LEITURA}
Você é o agente principal. Monte o plano de refatoração do módulo a partir dos relatórios verificados abaixo. Use SÓ as afirmações confirmadas; as derrubadas não entram. Relatório que faltou: ${faltaram.length > 0 ? faltaram.join(', ') : 'nenhum'}.

- Siga as Fases 2 e 3 da skill refactor-module (layout App\\${modulo}\\{Http,Application,Domain}, FSD, neverthrow, Zod).
- podeSeguir=false se o trabalho exige mudar fórmula de dinheiro junto com estrutura (isso é outra tarefa, com golden) ou se outra branch já mexe nos mesmos arquivos.
${curto ? '- MODO CURTO: as afirmações vieram sem cético — abra a evidência de cada uma que usar. Se o trabalho toca dinheiro/fórmula/golden, grava no banco ou cria arquitetura nova, podeSeguir=false e diga em riscos "exige modo completo".\n' : ''}- Cada passo tem de ser pequeno, ter arquivos nomeados e dizer qual teste ou gate prova que o comportamento não mudou.
- Em gates, liste os comandos exatos da Fase 4 que este módulo exige; inclua test:golden se tocaDinheiro.

RELATÓRIOS VERIFICADOS:
${JSON.stringify(consolidado, null, 2)}`,
  { label: 'planejar', phase: 'Planejar', model: PRINCIPAL, schema: PLANO },
)

if (curto && plano && plano.tocaDinheiro) log('Plano toca dinheiro: modo curto não vale, rode o plano completo.')
return { modo, curto, modulo, plano, relatorios: consolidado, relatoriosFaltando: faltaram }

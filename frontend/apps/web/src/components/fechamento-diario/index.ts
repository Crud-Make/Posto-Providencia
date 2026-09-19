/**
 * Public API do módulo `fechamento-diario`.
 *
 * @remarks
 * De fora, só por aqui (`docs/design/fechamento-diario-api.md` §2, fatia P2). Antes,
 * `leituras-diarias` importava o arquivo interno `hooks/useLeituras` — o único acoplamento de
 * runtime entre módulos do painel (`painel-pela-api.md` §1). O módulo continua legado do
 * strangler (fora das camadas do FSD); este arquivo só fecha a porta lateral.
 *
 * O `default` é reexportado porque `App.tsx` faz `import('./components/fechamento-diario')` e o
 * Vite (e o `moduleResolution: bundler`) resolvem `index.ts` ANTES de `index.tsx`: sem esta linha
 * o lazy da tela deixaria de achar o componente, sem erro de tipo.
 */
export { useLeituras, type Leitura } from './hooks/useLeituras';
export { default } from './index.tsx';

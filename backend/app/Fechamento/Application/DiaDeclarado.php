<?php

declare(strict_types=1);

namespace App\Fechamento\Application;

use App\Fechamento\Domain\TotaisDeclarados;
use Carbon\CarbonImmutable;

/**
 * O dia COMO O PAINEL O DECLAROU — a entrada de {@see GravaFechamentoDoDia}.
 *
 * É o corpo do `PUT /api/postos/{posto}/fechamento` (Design Doc §5.2) já com forma conferida
 * pelo FormRequest: aqui nada é `mixed`. Dinheiro e litros chegam como **string decimal com
 * ponto** (`'123.45'`, `'1234.567'`), nunca número — float no PHP perderia casa, e string BR
 * (`'1.718,35'`) é ambiguidade que o cliente resolve uma vez, antes de enviar (memória
 * `salvar-o-dia-apaga-leitura-base`, "O que isso impõe à P10").
 *
 * Os números já vêm calculados pelos canônicos de `@posto/utils` no cliente (`litrosVendidos`,
 * `valorDaLeitura`, `conferido`, `diferenca`, `totaisDoDia`): o servidor NÃO recalcula
 * `valor_conferido`, `total_vendas`, `total_recebido` nem `valor_cartao` (o lump legado é gravado
 * como veio). Só a coerência de `totais` é revalidada, em {@see TotaisDeclarados}.
 *
 * `frentistasConhecidos` é a lista dos `frentista_id` cujas sessões a tela VIU ao carregar
 * (decisão (c) do §7): quem está nela e não voltou em `sessoes` foi removido pelo gerente e é
 * apagado; quem não está nela nunca foi visto pela tela e não é dela para apagar — é o envio
 * tardio do PWA, que hoje o painel destrói.
 *
 * @phpstan-type LeituraDeclarada array{
 *     bico_id: int,
 *     combustivel_id: int,
 *     leitura_inicial: numeric-string,
 *     leitura_final: numeric-string,
 *     litros_vendidos: numeric-string,
 *     preco_litro: numeric-string,
 *     valor_total: numeric-string
 * }
 * @phpstan-type SessaoDeclarada array{
 *     frentista_id: int,
 *     valor_cartao: numeric-string,
 *     valor_cartao_debito: numeric-string,
 *     valor_cartao_credito: numeric-string,
 *     valor_dinheiro: numeric-string,
 *     valor_moedas: numeric-string,
 *     valor_pix: numeric-string,
 *     valor_nota: numeric-string,
 *     baratao: numeric-string,
 *     encerrante: numeric-string,
 *     valor_conferido: numeric-string,
 *     diferenca_calculada: numeric-string,
 *     observacoes: string
 * }
 * @phpstan-type RecebimentoDeclarado array{forma_pagamento_id: int, valor: numeric-string}
 */
final readonly class DiaDeclarado
{
    /**
     * @param  CarbonImmutable  $dia  o dia, em UTC (invariante I9)
     * @param  list<LeituraDeclarada>  $leituras  só os bicos com fechamento preenchido na tela
     * @param  list<SessaoDeclarada>  $sessoes  só as sessões com movimento (I3)
     * @param  list<int>  $frentistasConhecidos  `frentista_id` das sessões que a tela carregou do banco
     * @param  list<RecebimentoDeclarado>  $recebimentos  só os de valor > 0
     * @param  ?string  $totalVendas  `null` quando o dia não está apurado (I8) — anda junto com `$diferenca`
     * @param  ?string  $diferenca  `total_vendas − total_recebido`, FALTA positiva (I1)
     */
    public function __construct(
        public CarbonImmutable $dia,
        public array $leituras,
        public array $sessoes,
        public array $frentistasConhecidos,
        public array $recebimentos,
        public ?string $totalVendas,
        public string $totalRecebido,
        public ?string $diferenca,
        public ?string $observacoes,
    ) {}
}

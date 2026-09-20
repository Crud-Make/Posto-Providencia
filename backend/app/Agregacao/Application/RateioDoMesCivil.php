<?php

declare(strict_types=1);

namespace App\Agregacao\Application;

/**
 * Os dois insumos do rateio de despesa operacional, colados à janela em que foram somados.
 *
 * O cliente faz `despesaOperacionalPorLitro(Number(despesasTotal), Number(litrosVendidos))`
 * (`packages/utils/src/lucro.ts:36-41`); aqui não há divisão nem float (DECISÃO 1). A janela é o
 * MÊS CIVIL do período ({@see Periodo::mesCivil()}), não o período exato — decisões 1 e 2 do dono,
 * 18/09/2026: despesa do mês ÷ litros do mês, como a planilha (`H22 = H19/F11`) e como o
 * `aggregator.service.ts:43-61` de hoje. Despesa e litros andam juntos porque dividir despesa de
 * uma janela por litros de outra é o erro que um `despesas_total` solto na raiz convidava.
 */
final readonly class RateioDoMesCivil
{
    public function __construct(
        public Periodo $mesCivil,
        /** Σ `Despesa.valor` com `Despesa.data` (competência) no mês civil, escala 2. */
        public string $despesasTotal,
        /** Σ `Leitura.litros_vendidos` de TODOS os combustíveis do posto no mês civil, escala 3. */
        public string $litrosVendidos,
    ) {}
}

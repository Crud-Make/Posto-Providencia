<?php

declare(strict_types=1);

use App\Fechamento\Domain\RecusaDaGravacao;
use App\Fechamento\Domain\TotaisDeclarados;

it('aceita o par coerente: 100.00 − 90.00 = 10.00', function (): void {
    $totais = TotaisDeclarados::de('100.00', '90.00', '10.00');

    expect($totais)->toBeInstanceOf(TotaisDeclarados::class);
    assert($totais instanceof TotaisDeclarados);
    expect($totais->totalVendas)->toBe('100.00')
        ->and($totais->totalRecebido)->toBe('90.00')
        ->and($totais->diferenca)->toBe('10.00')
        ->and($totais->apurado())->toBeTrue();
});

it('recusa diferença que erra por um centavo', function (): void {
    $recusa = TotaisDeclarados::de('100.00', '90.00', '10.01');

    expect($recusa)->toBeInstanceOf(RecusaDaGravacao::class);
    assert($recusa instanceof RecusaDaGravacao);
    expect($recusa->codigo)->toBe('totais_inconsistentes');
});

it('aceita o dia não apurado: total_vendas e diferenca ambos null (I8)', function (): void {
    $totais = TotaisDeclarados::de(null, '90.00', null);

    expect($totais)->toBeInstanceOf(TotaisDeclarados::class);
    assert($totais instanceof TotaisDeclarados);
    expect($totais->totalVendas)->toBeNull()
        ->and($totais->diferenca)->toBeNull()
        ->and($totais->totalRecebido)->toBe('90.00')
        ->and($totais->apurado())->toBeFalse();
});

it('recusa o par quebrado: total_vendas presente e diferenca null', function (): void {
    expect(TotaisDeclarados::de('100.00', '90.00', null))->toBeInstanceOf(RecusaDaGravacao::class);
});

it('recusa o par quebrado ao contrário: total_vendas null e diferenca presente', function (): void {
    expect(TotaisDeclarados::de(null, '90.00', '10.00'))->toBeInstanceOf(RecusaDaGravacao::class);
});

it('recusa float sujo: 8697.390000000001 não é dinheiro, mesmo que bccomp em escala 2 aceitasse', function (): void {
    $recusa = TotaisDeclarados::de('8697.39', '0.00', '8697.390000000001');

    expect($recusa)->toBeInstanceOf(RecusaDaGravacao::class);
    assert($recusa instanceof RecusaDaGravacao);
    expect($recusa->codigo)->toBe('totais_inconsistentes')
        ->and($recusa->campos)->toHaveKey('diferenca');
});

it('recusa string BR e número sem casas — a conversão é do cliente, nunca daqui', function (): void {
    expect(TotaisDeclarados::de('1.718,35', '0.00', '1.718,35'))->toBeInstanceOf(RecusaDaGravacao::class)
        ->and(TotaisDeclarados::de('100', '90.00', '10.00'))->toBeInstanceOf(RecusaDaGravacao::class)
        ->and(TotaisDeclarados::de('100.00', '90', '10.00'))->toBeInstanceOf(RecusaDaGravacao::class);
});

it('a diferença é FALTA positiva e SOBRA negativa, como no canônico', function (): void {
    expect(TotaisDeclarados::de('100.00', '110.00', '-10.00'))->toBeInstanceOf(TotaisDeclarados::class)
        ->and(TotaisDeclarados::de('100.00', '110.00', '10.00'))->toBeInstanceOf(RecusaDaGravacao::class);
});

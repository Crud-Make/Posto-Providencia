<?php

declare(strict_types=1);

use App\Cadastro\Domain\Cnpj;

it('confere os DV e formata o CNPJ numérico e o ALFANUMÉRICO (exemplo oficial da Receita)', function (string $digitado, string $esperado): void {
    expect(Cnpj::de($digitado)?->formatado)->toBe($esperado);
})->with([
    'numérico com máscara' => ['11.222.333/0001-81', '11.222.333/0001-81'],
    'numérico sem máscara' => ['11222333000181', '11.222.333/0001-81'],
    'alfanumérico' => ['12.ABC.345/01DE-35', '12.ABC.345/01DE-35'],
    'alfanumérico minúsculo' => ['12abc34501de35', '12.ABC.345/01DE-35'],
]);

it('recusa DV errado, tamanho errado, todos iguais e letra no DV', function (string $digitado): void {
    expect(Cnpj::de($digitado))->toBeNull();
})->with([
    'DV1 errado' => ['11222333000191'],
    'DV2 errado' => ['11222333000182'],
    'alfanumérico DV errado' => ['12ABC34501DE36'],
    'curto' => ['1122233300018'],
    'longo' => ['112223330001811'],
    'todo zero' => ['00000000000000'],
    'letra no DV' => ['12ABC34501DEA5'],
    'vazio' => [''],
]);

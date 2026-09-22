<?php

declare(strict_types=1);

use App\Fechamento\Domain\JanelaDeEscrita;
use Carbon\CarbonImmutable;

function diaUtc(string $dia): CarbonImmutable
{
    return new CarbonImmutable($dia.' 00:00:00', 'UTC');
}

// "Hoje" fixo: é o que a função do banco tem em CURRENT_DATE e que aqui entra por parâmetro.
const HOJE_JANELA = '2026-09-20';

it('recusa o dia anterior a 31/12/2025', function (): void {
    expect(JanelaDeEscrita::aceita(diaUtc('2025-12-30'), diaUtc(HOJE_JANELA)))->toBeFalse();
});

it('aceita 31/12/2025 — a leitura de abertura', function (): void {
    expect(JanelaDeEscrita::aceita(diaUtc('2025-12-31'), diaUtc(HOJE_JANELA)))->toBeTrue();
});

it('aceita 05/01/2026 com hoje = 20/09/2026: é o que a RLS aceita, medido TRUE no compose', function (): void {
    expect(JanelaDeEscrita::aceita(diaUtc('2026-01-05'), diaUtc(HOJE_JANELA)))->toBeTrue();
});

it('aceita hoje e amanhã (hoje + 1)', function (): void {
    expect(JanelaDeEscrita::aceita(diaUtc('2026-09-20'), diaUtc(HOJE_JANELA)))->toBeTrue()
        ->and(JanelaDeEscrita::aceita(diaUtc('2026-09-21'), diaUtc(HOJE_JANELA)))->toBeTrue();
});

it('recusa hoje + 2: o limite do banco é exclusivo', function (): void {
    expect(JanelaDeEscrita::aceita(diaUtc('2026-09-22'), diaUtc(HOJE_JANELA)))->toBeFalse();
});

it('compara em UTC, não no fuso do dia recebido', function (): void {
    // 22/09 às 01:00 em Brasília ainda é 22/09 04:00Z: fora. 21/09 23:00 em Brasília é 22/09
    // 02:00Z: também fora — o dia é o dia UTC (I9), e aqui isso decide aceitar ou não.
    $hoje = diaUtc(HOJE_JANELA);
    $brasilia = new CarbonImmutable('2026-09-21 23:00:00', 'America/Sao_Paulo');

    expect(JanelaDeEscrita::aceita($brasilia, $hoje))->toBeFalse();
});

it('a recusa é um valor com código fora_da_janela e o dia na mensagem', function (): void {
    $recusa = JanelaDeEscrita::recusa(diaUtc('2025-12-30'));

    expect($recusa->codigo)->toBe('fora_da_janela')
        ->and($recusa->mensagem)->toContain('30/12/2025')
        ->and($recusa->campos)->toBeNull();
});

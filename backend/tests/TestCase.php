<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        // Teste nunca fala com serviço de verdade (WhatsApp, OCR, Supabase): toda chamada
        // HTTP tem de estar em Http::fake(). A que escapar lança exceção em vez de sair
        // para a rede — e de, no caso do WhatsApp, cobrar R$ 0,035 por mensagem.
        Http::preventStrayRequests();
    }
}

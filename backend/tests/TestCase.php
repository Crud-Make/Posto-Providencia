<?php

declare(strict_types=1);

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Support\Facades\DB;
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

        $this->garanteOPostoPadrao();
    }

    /**
     * O esquema de produção nasce single-tenant: `posto_id` tem `DEFAULT 1` em 31 tabelas, e o
     * trigger `handle_new_user` (01-esquema-base.sql) grava um `Frentista` sem informar o posto a
     * cada linha nova em `auth.users`. Sem a linha 1 de `Posto`, toda fábrica de usuário morre na FK
     * `Frentista_posto_id_fkey` — foi assim que 37 testes reprovaram no CI em 23/09/2026 (PR #128),
     * onde só o esquema é carregado; localmente `banco/dados/cadastros.sql` (não versionado) a traz.
     *
     * Roda DEPOIS do `parent::setUp()`, ou seja, dentro da transação do `DatabaseTransactions`:
     * a linha some no rollback e o banco de quem já tem o seed não muda. Quando a linha nasce aqui,
     * a sequência é alinhada, senão a primeira `Posto::factory()` do CI pediria o id 1 de novo.
     */
    private function garanteOPostoPadrao(): void
    {
        $inseriu = DB::table('Posto')->insertOrIgnore([
            'id' => 1,
            'nome' => 'Posto padrão do esquema (posto_id DEFAULT 1)',
            'ativo' => true,
        ]);

        if ($inseriu > 0) {
            DB::statement('SELECT setval(pg_get_serial_sequence(\'public."Posto"\', \'id\'), (SELECT MAX(id) FROM public."Posto"))');
        }
    }
}

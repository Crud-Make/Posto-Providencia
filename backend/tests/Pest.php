<?php

use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| Pest — configuração dos testes
|--------------------------------------------------------------------------
| Feature: sobe a aplicação (Tests\TestCase). Unit: PHP puro, sem framework.
| Cobertura mínima de 85 % é cobrada por `composer test:cobertura` (CLAUDE.md §6).
*/

pest()->extend(TestCase::class)->in('Feature');

---
name: estrategia-freelas-locais-barbearia
description: "07/09/2026 — o dono (Thygo Carvalho) decidiu: freelas locais em TS/React/Node/Postgres para ganhar experiência rumo às vagas; quer 'vender ecossistema'; 1º freela novo: app mobile de barbearia (estilo AppBarber) pedido por um colega barbeiro em Tucano"
metadata:
  type: project
---

Em 07/09/2026 (noite) o dono, **Thiago**, fechou a estratégia: **freelas locais** com a stack
TypeScript/React/Node/Postgres para acumular experiência e portfólio, e depois as vagas
remotas. Quer ser "o Thiago que vende ecossistema". Primeiro freela novo: **um colega barbeiro
pediu um app mobile de barbearia**, estilo AppBarber (agenda, serviços, clientes, lembrete).

**Why:** coerente com Tucano (vantagem é a presença), com a stack escolhida e com o Posto como
primeiro cliente. Freela pago conta como experiência no currículo.
**How to apply:** tratar o app da barbearia como projeto pago (setup + mensal), MVP pequeno:
Expo/React Native para o barbeiro + PWA para o cliente marcar, Supabase igual ao posto. Não
construir "plataforma" antes do 2º cliente. Ver [[mora-em-tucano-ba]],
[[direcao-carreira-2026]], [[situacao-entregador-quer-sair]].

## 07/09 (noite) — terceira ideia: sistema para pizzaria
O dono quer criar um sistema para o dono de uma pizzaria: fechamento de caixa, comanda, retirada
de pedido. Não ficou claro se é cliente real pedindo ou ideia. Regra combinada: **um freela por
vez**, o que paga primeiro entra primeiro; pizzaria (comanda/cozinha, tempo real, impressão) é
maior que barbearia. O núcleo de fechamento de caixa do posto é reaproveitável — é o
"ecossistema", mas só se extrai depois do 2º cliente rodando.

## 07/09 (noite) — pizzaria do sogro = projeto de aprendizado em NestJS + Postgres em Docker
Decisão do dono: a pizzaria (sogro, cobrança simbólica) é feita **à mão, sem Supabase**, em
**NestJS + PostgreSQL em Docker Compose**, para aprender a stack que as vagas pedem. O barbeiro
(pago) fica em Supabase, copiando o posto. Regra do drill vale aqui: ele digita, eu explico o
porquê e faço pergunta; não gerar o projeto inteiro por ele. Repo separado, fora do
Posto-Providencia (sugerido `~/Projetos/trabalho/pizzaria`).

## 07/09 (noite) — 4º lead: clínica de estética corporal e íntima
Uma cliente com clínica de estética (corporal e íntima) quer **agendamento + pagamentos "dentre
outras coisas"**. Mesmo produto do barbeiro (agenda, serviços, clientes, pagamento) → construir
UMA vez, vender duas. Clínica tende a pagar mais que barbearia. Atenção: dado de saúde/estética
íntima é **dado sensível (LGPD)** — ficha/foto de cliente exige cuidado extra; pagamento online
(Pix via Mercado Pago/Asaas) é fase 2 e tem taxa. Fila combinada: Elias (já paga) → agenda
(barbeiro ou clínica, quem fechar valor primeiro) → pizzaria (aprendizado Nest).

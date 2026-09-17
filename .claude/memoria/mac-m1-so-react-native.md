---
name: mac-m1-so-react-native
description: "07/09/2026 — comprou um Mac M1 de 8 GB; serve SÓ para React Native (build iOS). O Arch continua a máquina principal: TypeScript/Node e o backend (NestJS ou FastAPI, ainda não decidido)"
metadata:
  type: user
---

Em 07/09/2026 o dono comprou um **Mac M1 de 8 GB**. Depois de duas rodadas de "torna ele meu
principal" / "quero a interseção", a decisão final foi: **o Mac é só para React Native**, porque
o build de iOS exige Xcode. **O Arch segue como máquina principal**, onde fica TypeScript/Node,
o Posto e o backend. Entre os dois, a interseção é **só o git** — sem Syncthing, sem
`docs/data`, sem `~/.claude` espelhado, sem `.env` do posto no Mac.

Backend: **NestJS ou FastAPI, ainda não decidido** em 07/09. Isso reabre a recomendação de
FastAPI registrada em [[python-paixao-quant-pula-de-galho]]; o par Node/NestJS + RN é
exatamente o da vaga da Maxxidata em [[direcao-carreira-2026]].

**Why:** evita que eu proponha de novo espelhar o ambiente inteiro no Mac (Syncthing, manifesto
de ativos, symlink de memória) — tudo isso foi descartado por ele.
**How to apply:** setup do Mac é mínimo: Xcode completo, Homebrew (`git gh fnm watchman
cocoapods`), Node 24 via fnm, Bun, `gh auth login`. Projeto de RN nasce com **Expo**; Metro pode
rodar no Arch com Expo Go no celular, o Mac entra só em `expo run:ios` e build de loja. Em 8 GB,
fechar o Chrome durante build do Xcode. Decisão em aberto: app de RN em repo separado ou
`apps/mobile` no monorepo do posto (repo separado é o caminho sem atrito). Nenhum projeto de RN
existe ainda em `~/Projetos` (conferido 07/09).

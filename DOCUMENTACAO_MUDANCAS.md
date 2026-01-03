# Documentação de Mudanças - Posto Providência

## Web Dashboard - Acesso Simplificado (Sem Necessidade de Login)
Para agilizar o uso interno, o sistema Web foi configurado para iniciar automaticamente com um perfil de Administrador Mockado.

**Alterações:**
1.  **AuthContext.tsx**: 
    - Adicionado `MOCK_ADMIN_USER` com permissões de ADMIN.
    - O estado inicial de `user` agora é o usuário mockado.
    - `loading` inicia como `false` para evitar telas de espera.
    - O sistema ainda permite login real se desejado, mas volta ao mock ao sair.
2.  **App.tsx**:
    - Removido o bloqueio da tela de login - agora o dashboard é exibido por padrão.

---

## Mobile App - Login Inteligente e Auto-Criação
O aplicativo mobile foi otimizado para que o frentista não precise realizar ações repetitivas de seleção.

**Alterações:**
1.  **Self-Healing Auth**: Se um usuário logar no mobile e seu registro de 'Frentista' não existir no banco, o app cria automaticamente usando os metadados do login.
2.  **Auto-Abertura de Caixa**: Ao entrar, o app verifica se existe um caixa aberto para o frentista. Se não houver, ele tenta abrir automaticamente o caixa para o turno atual.
3.  **Registro Simplificado**: Na tela de registro, o modal de seleção de frentista é desabilitado para frentistas comuns (já que eles são os únicos que podem registrar para si mesmos), exibindo apenas para administradores.

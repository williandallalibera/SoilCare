# README Supabase - Soil Care

Este guia explica, em português e passo a passo, como configurar o Supabase para o Soil Care no modelo SaaS que definimos:

- o `admin` gerencia parâmetros globais e usuários
- o `admin` vê e manipula apenas os dados operacionais criados por ele
- o `operador` vê e manipula apenas os próprios dados
- `admin` e `operador` compartilham os parâmetros globais do mesmo tenant

## 1. O que você precisa antes de começar

Você precisa ter:

- um projeto criado no Supabase
- pelo menos um usuário criado em `Authentication > Users`
- a confirmação de e-mail desativada, se quiser liberar login direto por senha
- o repositório do projeto já baixado na máquina
- Node.js instalado
- Supabase CLI instalado

## 2. Instalar o Supabase CLI

Se ainda não tiver o CLI:

```bash
brew install supabase/tap/supabase
```

Depois faça login:

```bash
supabase login
```

O navegador vai abrir para autenticar sua conta.

## 3. Arquivos do projeto que você vai usar

Os arquivos principais deste setup são:

- migration principal: [20260316183000_solo_saas_multi_scope.sql](/Users/williandallalibera/primesoft-cbisa/supabase/migrations/20260316183000_solo_saas_multi_scope.sql)
- config do Supabase CLI: [config.toml](/Users/williandallalibera/primesoft-cbisa/supabase/config.toml)
- edge function do primeiro admin: [bootstrap-first-admin](/Users/williandallalibera/primesoft-cbisa/supabase/functions/bootstrap-first-admin/index.ts)
- edge function de criar/editar usuário: [admin-save-user](/Users/williandallalibera/primesoft-cbisa/supabase/functions/admin-save-user/index.ts)
- edge function de reset de senha: [admin-reset-user-password](/Users/williandallalibera/primesoft-cbisa/supabase/functions/admin-reset-user-password/index.ts)
- variáveis locais: [`.env.example`](/Users/williandallalibera/primesoft-cbisa/.env.example)

## 4. Linkar o projeto local ao Supabase remoto

No painel do Supabase:

1. abra o projeto
2. copie o `Project Reference`

Na raiz do projeto, rode:

```bash
supabase link --project-ref SEU_PROJECT_REF
```

Exemplo:

```bash
supabase link --project-ref abcd1234efgh5678
```

Se o CLI pedir a senha do banco, use a senha definida quando o projeto Supabase foi criado.

## 5. Aplicar a migration no banco

Na raiz do projeto:

```bash
supabase db push
```

Esse comando vai aplicar a migration nova e criar:

- `solo_tenants`
- `usuarios`
- `solo_clientes`
- `solo_areas`
- `solo_parametros_globais`
- `solo_analises`
- `solo_analise_resultados_snapshot`
- funções SQL auxiliares
- políticas RLS
- função SQL `bootstrap_solo_admin`

Se você preferir aplicar manualmente:

1. abra `SQL Editor` no Supabase
2. copie o conteúdo de [20260316183000_solo_saas_multi_scope.sql](/Users/williandallalibera/primesoft-cbisa/supabase/migrations/20260316183000_solo_saas_multi_scope.sql)
3. execute

## 6. Subir as Edge Functions

Na raiz do projeto, rode:

```bash
supabase functions deploy bootstrap-first-admin
supabase functions deploy admin-save-user
supabase functions deploy admin-reset-user-password
```

Essas functions são:

- `bootstrap-first-admin`
  - faz o vínculo do primeiro usuário autenticado com a tabela `usuarios`
  - cria o tenant
  - marca o perfil como `admin`
  - cria a primeira versão ativa dos parâmetros globais
- `admin-save-user`
  - cria e edita usuários pelo fluxo administrativo
  - grava no Auth e na tabela `usuarios`
- `admin-reset-user-password`
  - redefine a senha de um usuário do mesmo tenant do admin

## 7. Variáveis que o frontend precisa

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Preencha:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_ANON_KEY
```

Esses valores ficam em:

- `Project Settings > API`

## 8. Como vincular o primeiro usuário admin

Agora vem a parte principal.

Você disse que já criou um usuário em `Authentication > Users`. Ótimo. Existem 2 formas de vincular esse usuário à tabela `usuarios`.

### Forma recomendada: automática

Depois de:

- aplicar a migration
- subir a function `bootstrap-first-admin`
- preencher o `.env`

basta fazer login na aplicação com esse primeiro usuário.

Se ainda não existir nenhum tenant no banco, o sistema vai:

- criar o tenant
- criar o registro em `public.usuarios`
- marcar o perfil como `admin`
- vincular esse usuário ao tenant
- criar a primeira versão ativa dos parâmetros globais

Ou seja: para o primeiro admin, você não precisa preencher a tabela `usuarios` manualmente se a function já estiver publicada.

### Forma manual: SQL

Se quiser forçar manualmente, use o SQL Editor do Supabase:

1. abra `Authentication > Users`
2. copie o `UUID` do usuário
3. rode:

```sql
select public.bootstrap_solo_admin(
  'UUID_DO_USUARIO_AUTH',
  'Nome da sua operação',
  'Nome do Admin'
);
```

Exemplo:

```sql
select public.bootstrap_solo_admin(
  '11111111-2222-3333-4444-555555555555',
  'Soil Care Paraguay',
  'William'
);
```

## 9. Como verificar se o primeiro admin foi vinculado corretamente

No SQL Editor, rode:

```sql
select id, tenant_id, nombre, email, perfil_acceso, estado
from public.usuarios
order by created_at desc;
```

Você deve ver o usuário com:

- `perfil_acceso = 'admin'`
- `tenant_id` preenchido
- `estado = 'activo'`

Depois rode:

```sql
select id, nombre, owner_user_id, created_at
from public.solo_tenants
order by created_at desc;
```

Você deve ver:

- um tenant criado
- `owner_user_id` igual ao UUID do usuário admin

E também:

```sql
select id, tenant_id, version_label, is_active
from public.solo_parametros_globais
order by created_at desc;
```

Você deve ver pelo menos uma versão ativa de parâmetros para esse tenant.

## 10. Como subir a aplicação localmente

Na raiz do projeto:

```bash
npm install
npm run dev
```

Abra a URL mostrada pelo Vite.

## 11. Fluxo esperado depois do primeiro login do admin

Depois que o primeiro admin estiver vinculado:

1. o admin entra no sistema
2. acessa `Parâmetros`
3. acessa `Usuários`
4. cria operadores
5. operadores passam a usar os parâmetros globais do tenant do admin

## 12. Como criar usuários operadores

Depois de entrar como admin:

1. abra a tela `Usuários`
2. preencha nome, e-mail, telefone, perfil e senha
3. salve

O sistema vai usar a edge function `admin-save-user` para:

- criar o usuário no `Auth`
- criar ou atualizar o usuário em `public.usuarios`
- vincular automaticamente o operador ao `tenant_id` do admin

## 13. Como resetar senha de um usuário

Ainda logado como admin:

1. abra a tela `Usuários`
2. selecione o usuário
3. preencha a nova senha
4. salve

O sistema usa a edge function `admin-save-user` no CRUD e a lógica administrativa do backend para manter o Auth sincronizado.

Se você precisar resetar especificamente por backend, a function [admin-reset-user-password](/Users/williandallalibera/primesoft-cbisa/supabase/functions/admin-reset-user-password/index.ts) já está pronta.

## 14. O que o operador pode ver

O operador:

- não acessa `Parâmetros`
- não acessa `Usuários`
- usa os parâmetros globais do tenant do admin
- vê apenas os próprios:
  - clientes
  - áreas
  - análises

## 15. O que o admin pode ver

O admin:

- gerencia parâmetros globais do tenant
- gerencia usuários do tenant
- vê e manipula apenas os próprios:
  - clientes
  - áreas
  - análises

Importante:

- dados criados pelo operador não aparecem para o admin
- dados criados pelo admin não aparecem para o operador

O que ambos compartilham é apenas o parâmetro global do tenant.

## 16. Checklist final de validação

Faça estes testes:

1. login do primeiro admin
2. abrir tela de parâmetros
3. abrir tela de usuários
4. criar um operador
5. login com operador
6. confirmar que operador não vê usuários
7. confirmar que operador não vê parâmetros
8. criar um cliente com admin
9. criar outro cliente com operador
10. confirmar que um não vê o do outro

## 17. Problemas comuns

### O login funciona, mas o usuário não entra na aplicação

Provavelmente o usuário autenticado ainda não foi vinculado na tabela `usuarios`.

Confirme se:

- a migration foi aplicada
- a function `bootstrap-first-admin` foi publicada
- esse usuário é realmente o primeiro admin do sistema

### A tela de usuários não salva

Verifique se a function `admin-save-user` foi publicada:

```bash
supabase functions deploy admin-save-user
```

### O reset de senha não funciona

Verifique se a function `admin-reset-user-password` foi publicada:

```bash
supabase functions deploy admin-reset-user-password
```

### O usuário autenticou no Supabase, mas não tem tenant

Use a forma manual pelo SQL:

```sql
select public.bootstrap_solo_admin(
  'UUID_DO_USUARIO_AUTH',
  'Nome da sua operação',
  'Nome do Admin'
);
```

## 18. Sequência curta para colar no terminal

Se você quiser o fluxo direto:

```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push
supabase functions deploy bootstrap-first-admin
supabase functions deploy admin-save-user
supabase functions deploy admin-reset-user-password
cp .env.example .env
npm install
npm run dev
```

Depois disso:

- faça login com o primeiro usuário criado em `Authentication > Users`
- se for o primeiro admin do sistema, o vínculo será criado automaticamente

## 19. Resumo final

Para você configurar tudo corretamente, a ordem ideal é:

1. criar o projeto no Supabase
2. criar o primeiro usuário em `Authentication > Users`
3. linkar o projeto com `supabase link`
4. aplicar `supabase db push`
5. publicar as 3 edge functions
6. preencher `.env`
7. abrir o app
8. fazer login com o primeiro admin
9. entrar em `Usuários` e criar os operadores

Se quiser, no próximo passo eu posso te entregar também um checklist de verificação no próprio SQL Editor, com queries prontas para confirmar tenant, usuário, parâmetros e RLS. 

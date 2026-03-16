# Soil Care

SaaS de análise de solo com:

- autenticação via Supabase
- parâmetros globais por admin
- usuários operadores vinculados ao admin
- isolamento de dados operacionais por dono do registro

## Stack

- Frontend: React + Vite + TypeScript
- Backend: Supabase Auth + Database + Edge Functions

## Rodando localmente

```bash
npm install
cp .env.example .env
npm run dev
```

Preencha no `.env`:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Deploy

### 1. Subir para o GitHub

Este repositório ainda não tem `remote` configurado. Depois de criar um repositório vazio no GitHub, rode:

```bash
git init
git checkout -b main
git add .
git commit -m "feat: prepare soil care saas"
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Se o repositório local já estiver inicializado, basta pular `git init`.

### 2. Subir para a Vercel

Este projeto já está pronto para Vercel com suporte a SPA em [vercel.json](/Users/williandallalibera/primesoft-cbisa/vercel.json).

Passos:

1. importar o repositório na Vercel
2. framework preset: `Vite`
3. build command: `npm run build`
4. output directory: `dist`
5. configurar as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. fazer o primeiro deploy

### 3. Ajustar o Supabase para produção

Depois que a Vercel gerar a URL do projeto:

1. abra `Supabase > Authentication > URL Configuration`
2. em `Site URL`, informe a URL da Vercel
3. em `Redirect URLs`, adicione:
   - a URL principal da Vercel
   - a URL customizada, se você usar domínio próprio

Exemplo:

```text
https://seu-projeto.vercel.app
https://www.seudominio.com
```

### 4. Redeploy das Edge Functions

Sempre que alterar alguma edge function localmente, publique de novo:

```bash
supabase functions deploy bootstrap-first-admin
supabase functions deploy admin-save-user
supabase functions deploy admin-reset-user-password
```

## Supabase

A configuração completa do banco, RLS, migrations, bootstrap do primeiro admin e deploy das Edge Functions está em:

[docs/SUPABASE.md](/Users/williandallalibera/primesoft-cbisa/docs/SUPABASE.md)

## Estrutura Supabase no repositório

- Migration principal: [20260316183000_solo_saas_multi_scope.sql](/Users/williandallalibera/primesoft-cbisa/supabase/migrations/20260316183000_solo_saas_multi_scope.sql)
- Config CLI: [config.toml](/Users/williandallalibera/primesoft-cbisa/supabase/config.toml)
- Function de bootstrap do primeiro admin: [bootstrap-first-admin](/Users/williandallalibera/primesoft-cbisa/supabase/functions/bootstrap-first-admin/index.ts)
- Function de gestão de usuários: [admin-save-user](/Users/williandallalibera/primesoft-cbisa/supabase/functions/admin-save-user/index.ts)
- Function de reset de senha: [admin-reset-user-password](/Users/williandallalibera/primesoft-cbisa/supabase/functions/admin-reset-user-password/index.ts)

## Regras de acesso

- `admin`
  - vê e manipula somente os dados operacionais criados por ele
  - define parâmetros globais do próprio tenant
  - cria, altera e redefine senha de usuários do próprio tenant
- `operador`
  - vê e manipula somente os próprios dados
  - usa os parâmetros globais definidos pelo admin

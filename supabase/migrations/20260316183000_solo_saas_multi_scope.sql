create extension if not exists "uuid-ossp";

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.default_solo_parametros()
returns jsonb
language sql
immutable
as $$
  select '{
    "k": {
      "mg_dm3_para_kg_ha": 390,
      "fator_k_para_k2o": 1.31,
      "fator_k_para_k2o_alvo": 1.2046,
      "alvo_mg_dm3": 0.85,
      "participacao_ctc_ideal": 0.03,
      "participacao_ctc_maxima": 0.05,
      "correcao_k2o_kg_ha": 100,
      "aproveitamento_correcao": 0.6,
      "limite_tecnico_sulco_kg_ha": 120
    },
    "calcio": {
      "alvo_cmol_dm3": 7.5,
      "garantia_ca_calcario": 0.3,
      "garantia_mg_calcario": 0.2,
      "prnt": 1,
      "fator_cmol_para_kg_ha": 500,
      "relacao_ca_mg_limite_calcitico": 1.5,
      "relacao_ca_mg_limite_dolomitico": 3
    },
    "fosforo": {
      "alvo_mg_dm3": 4.5,
      "fator_objetivo": 4.5,
      "fator_disponibilidade_solo": 0,
      "coeficiente_prem_a": 0.324731,
      "coeficiente_prem_b": 0.00160568,
      "coeficiente_prem_c": 4.62,
      "teor_argila_alto": 60,
      "teor_argila_medio": 35,
      "teor_argila_baixo": 15,
      "retencao_argila_alta": 12,
      "retencao_argila_media": 25,
      "retencao_argila_baixa": 30,
      "retencao_argila_muito_baixa": 25,
      "constante_equilibrio_kg_ha": 36,
      "concentracao_produto": 0.3
    },
    "magnesio": {
      "alvo_cmol_dm3": 2.5
    },
    "materia_organica": {
      "ideal_min_percent": 3,
      "ideal_max_percent": 5
    },
    "enxofre": {
      "alvo_mg_dm3": 10,
      "fator_mg_dm3_para_kg_ha": 15,
      "fator_disponibilidade_solo": 0,
      "concentracao_enxofre_elementar": 0.9
    },
    "producao": {
      "cultura_padrao": "Soja",
      "produtividade_padrao_bolsas_ha": 60,
      "produtividade_alta_bolsas_ha": 75,
      "k2o_por_bolsa": 1.3,
      "fator_kcl": 1.6667,
      "p2o5_por_bolsa": 1.2,
      "so4_por_bolsa": 0.93
    },
    "micros": {
      "concentracao_produto": 0.1,
      "boro": { "minimo_mg_dm3": 0.75, "maximo_mg_dm3": 1, "fator_mg_dm3_para_kg_ha": 2 },
      "cobre": { "minimo_mg_dm3": 1.5, "maximo_mg_dm3": 6.5, "fator_mg_dm3_para_kg_ha": 2 },
      "ferro": { "minimo_mg_dm3": 15, "maximo_mg_dm3": 40, "fator_mg_dm3_para_kg_ha": 2 },
      "zinco": { "minimo_mg_dm3": 4, "maximo_mg_dm3": 12, "fator_mg_dm3_para_kg_ha": 2.5 },
      "manganes": { "minimo_mg_dm3": 10, "maximo_mg_dm3": 40, "fator_mg_dm3_para_kg_ha": 2 }
    },
    "fertilizante": {
      "formula_nome": "30-10-6",
      "dose_kg_ha": 200,
      "percentual_p2o5": 30,
      "percentual_k2o": 10,
      "percentual_so4": 6,
      "formulas_opcoes": [
        { "id": "f-30-10-6", "nome": "30-10-6", "percentual_p2o5": 30, "percentual_k2o": 10, "percentual_so4": 6 },
        { "id": "f-00-20-20", "nome": "00-20-20", "percentual_p2o5": 20, "percentual_k2o": 20, "percentual_so4": 0 },
        { "id": "f-00-20-00", "nome": "00-20-00", "percentual_p2o5": 20, "percentual_k2o": 0, "percentual_so4": 0 },
        { "id": "f-00-00-20", "nome": "00-00-20", "percentual_p2o5": 0, "percentual_k2o": 20, "percentual_so4": 0 },
        { "id": "f-18-00-18", "nome": "18-00-18", "percentual_p2o5": 0, "percentual_k2o": 18, "percentual_so4": 18 }
      ]
    }
  }'::jsonb;
$$;

create table if not exists public.solo_tenants (
  id uuid primary key default uuid_generate_v4(),
  nombre text not null,
  owner_user_id uuid unique references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_solo_tenants_updated_at on public.solo_tenants;
create trigger set_solo_tenants_updated_at
before update on public.solo_tenants
for each row execute procedure public.handle_updated_at();

create table if not exists public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid references public.solo_tenants(id) on delete set null,
  nombre text not null,
  email text unique not null,
  telefono text,
  perfil_acceso text not null default 'operador'
    check (perfil_acceso in ('admin', 'operador')),
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.usuarios
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete set null;

drop trigger if exists set_usuarios_updated_at on public.usuarios;
create trigger set_usuarios_updated_at
before update on public.usuarios
for each row execute procedure public.handle_updated_at();

create or replace function public.current_tenant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select tenant_id
  from public.usuarios
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select perfil_acceso
  from public.usuarios
  where id = auth.uid()
  limit 1;
$$;

create or replace function public.is_current_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'admin', false);
$$;

grant execute on function public.current_tenant_id() to authenticated;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_current_admin() to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
  v_tenant_id uuid;
begin
  v_role := coalesce(new.raw_user_meta_data->>'perfil_acesso', 'operador');
  if v_role not in ('admin', 'operador') then
    v_role := 'operador';
  end if;

  begin
    v_tenant_id := nullif(new.raw_user_meta_data->>'tenant_id', '')::uuid;
  exception
    when others then
      v_tenant_id := null;
  end;

  insert into public.usuarios (id, tenant_id, nombre, email, perfil_acceso, estado)
  values (
    new.id,
    v_tenant_id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(coalesce(new.email, 'usuario'), '@', 1)),
    new.email,
    v_role,
    'activo'
  )
  on conflict (id) do update set
    tenant_id = coalesce(excluded.tenant_id, public.usuarios.tenant_id),
    nombre = excluded.nombre,
    email = excluded.email,
    perfil_acceso = excluded.perfil_acceso,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create table if not exists public.solo_clientes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.solo_tenants(id) on delete cascade,
  owner_user_id uuid not null references public.usuarios(id) on delete cascade,
  nombre text not null,
  documento text,
  contacto text,
  telefono text,
  email text,
  ciudad text,
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solo_clientes
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete cascade;
alter table public.solo_clientes
  add column if not exists owner_user_id uuid references public.usuarios(id) on delete cascade;
alter table public.solo_clientes
  alter column tenant_id set default public.current_tenant_id();
alter table public.solo_clientes
  alter column owner_user_id set default auth.uid();

drop trigger if exists set_solo_clientes_updated_at on public.solo_clientes;
create trigger set_solo_clientes_updated_at
before update on public.solo_clientes
for each row execute procedure public.handle_updated_at();

create index if not exists solo_clientes_scope_idx
  on public.solo_clientes (tenant_id, owner_user_id, created_at desc);

create table if not exists public.solo_areas (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.solo_tenants(id) on delete cascade,
  owner_user_id uuid not null references public.usuarios(id) on delete cascade,
  cliente_id uuid not null references public.solo_clientes(id) on delete cascade,
  nombre text not null,
  codigo text,
  municipio text,
  departamento text,
  tamanho_ha numeric(12, 2),
  estado text not null default 'activo'
    check (estado in ('activo', 'inactivo')),
  observaciones text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solo_areas
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete cascade;
alter table public.solo_areas
  add column if not exists owner_user_id uuid references public.usuarios(id) on delete cascade;
alter table public.solo_areas
  alter column tenant_id set default public.current_tenant_id();
alter table public.solo_areas
  alter column owner_user_id set default auth.uid();

drop trigger if exists set_solo_areas_updated_at on public.solo_areas;
create trigger set_solo_areas_updated_at
before update on public.solo_areas
for each row execute procedure public.handle_updated_at();

create index if not exists solo_areas_scope_idx
  on public.solo_areas (tenant_id, owner_user_id, created_at desc);

create table if not exists public.solo_parametros_globais (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.solo_tenants(id) on delete cascade,
  version_label text not null,
  is_active boolean not null default false,
  parametros jsonb not null default public.default_solo_parametros(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solo_parametros_globais
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete cascade;
alter table public.solo_parametros_globais
  alter column tenant_id set default public.current_tenant_id();
alter table public.solo_parametros_globais
  alter column parametros set default public.default_solo_parametros();

drop trigger if exists set_solo_parametros_updated_at on public.solo_parametros_globais;
create trigger set_solo_parametros_updated_at
before update on public.solo_parametros_globais
for each row execute procedure public.handle_updated_at();

drop index if exists solo_parametros_one_active_idx;
create unique index if not exists solo_parametros_one_active_per_tenant_idx
  on public.solo_parametros_globais (tenant_id)
  where is_active = true;

create index if not exists solo_parametros_tenant_idx
  on public.solo_parametros_globais (tenant_id, created_at desc);

create table if not exists public.solo_analises (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.solo_tenants(id) on delete cascade,
  cliente_id uuid not null references public.solo_clientes(id) on delete restrict,
  area_id uuid not null references public.solo_areas(id) on delete restrict,
  parametro_version_id uuid not null references public.solo_parametros_globais(id) on delete restrict,
  created_by uuid not null default auth.uid() references public.usuarios(id) on delete cascade,
  input_json jsonb not null default '{}'::jsonb,
  resultado_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solo_analises
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete cascade;
alter table public.solo_analises
  alter column tenant_id set default public.current_tenant_id();
alter table public.solo_analises
  alter column created_by set default auth.uid();

drop trigger if exists set_solo_analises_updated_at on public.solo_analises;
create trigger set_solo_analises_updated_at
before update on public.solo_analises
for each row execute procedure public.handle_updated_at();

create index if not exists solo_analises_scope_idx
  on public.solo_analises (tenant_id, created_by, created_at desc);

create table if not exists public.solo_analise_resultados_snapshot (
  id uuid primary key default uuid_generate_v4(),
  analise_id uuid not null unique references public.solo_analises(id) on delete cascade,
  tenant_id uuid not null references public.solo_tenants(id) on delete cascade,
  owner_user_id uuid not null references public.usuarios(id) on delete cascade,
  parametro_version_id uuid not null references public.solo_parametros_globais(id) on delete restrict,
  input_json jsonb not null default '{}'::jsonb,
  resultado_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.solo_analise_resultados_snapshot
  add column if not exists tenant_id uuid references public.solo_tenants(id) on delete cascade;
alter table public.solo_analise_resultados_snapshot
  add column if not exists owner_user_id uuid references public.usuarios(id) on delete cascade;
alter table public.solo_analise_resultados_snapshot
  alter column tenant_id set default public.current_tenant_id();
alter table public.solo_analise_resultados_snapshot
  alter column owner_user_id set default auth.uid();

drop trigger if exists set_solo_snapshots_updated_at on public.solo_analise_resultados_snapshot;
create trigger set_solo_snapshots_updated_at
before update on public.solo_analise_resultados_snapshot
for each row execute procedure public.handle_updated_at();

create index if not exists solo_snapshots_scope_idx
  on public.solo_analise_resultados_snapshot (tenant_id, owner_user_id, created_at desc);

create or replace function public.bootstrap_solo_admin(
  p_auth_user_id uuid,
  p_tenant_name text default null,
  p_admin_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_auth_user auth.users%rowtype;
  v_tenant_id uuid;
  v_admin_name text;
  v_email text;
begin
  select *
    into v_auth_user
  from auth.users
  where id = p_auth_user_id;

  if not found then
    raise exception 'Usuário auth % não encontrado.', p_auth_user_id;
  end if;

  v_email := v_auth_user.email;
  v_admin_name := coalesce(
    nullif(trim(p_admin_name), ''),
    nullif(trim(v_auth_user.raw_user_meta_data->>'nombre'), ''),
    split_part(coalesce(v_email, 'admin'), '@', 1)
  );

  select tenant_id
    into v_tenant_id
  from public.usuarios
  where id = p_auth_user_id;

  if v_tenant_id is null then
    insert into public.solo_tenants (nombre, owner_user_id)
    values (
      coalesce(nullif(trim(p_tenant_name), ''), v_admin_name || ' Workspace'),
      p_auth_user_id
    )
    returning id into v_tenant_id;
  else
    update public.solo_tenants
       set nombre = coalesce(nullif(trim(p_tenant_name), ''), nombre),
           owner_user_id = coalesce(owner_user_id, p_auth_user_id),
           updated_at = now()
     where id = v_tenant_id;
  end if;

  insert into public.usuarios (
    id,
    tenant_id,
    nombre,
    email,
    perfil_acceso,
    estado
  )
  values (
    p_auth_user_id,
    v_tenant_id,
    v_admin_name,
    v_email,
    'admin',
    'activo'
  )
  on conflict (id) do update set
    tenant_id = excluded.tenant_id,
    nombre = excluded.nombre,
    email = excluded.email,
    perfil_acceso = excluded.perfil_acceso,
    estado = excluded.estado,
    updated_at = now();

  insert into public.solo_parametros_globais (
    tenant_id,
    version_label,
    is_active,
    parametros
  )
  select
    v_tenant_id,
    'Base planilha v1',
    true,
    public.default_solo_parametros()
  where not exists (
    select 1
    from public.solo_parametros_globais
    where tenant_id = v_tenant_id
      and is_active = true
  );

  return v_tenant_id;
end;
$$;

alter table public.solo_tenants enable row level security;
alter table public.usuarios enable row level security;
alter table public.solo_clientes enable row level security;
alter table public.solo_areas enable row level security;
alter table public.solo_parametros_globais enable row level security;
alter table public.solo_analises enable row level security;
alter table public.solo_analise_resultados_snapshot enable row level security;

drop policy if exists "solo_tenants_read_current" on public.solo_tenants;
create policy "solo_tenants_read_current"
on public.solo_tenants for select
to authenticated
using (id = public.current_tenant_id());

drop policy if exists "solo_tenants_update_admin" on public.solo_tenants;
create policy "solo_tenants_update_admin"
on public.solo_tenants for update
to authenticated
using (public.is_current_admin() and id = public.current_tenant_id())
with check (public.is_current_admin() and id = public.current_tenant_id());

drop policy if exists "usuarios_select_scoped" on public.usuarios;
create policy "usuarios_select_scoped"
on public.usuarios for select
to authenticated
using (
  id = auth.uid()
  or (public.is_current_admin() and tenant_id = public.current_tenant_id())
);

drop policy if exists "usuarios_update_admin" on public.usuarios;
create policy "usuarios_update_admin"
on public.usuarios for update
to authenticated
using (
  public.is_current_admin()
  and tenant_id = public.current_tenant_id()
)
with check (
  public.is_current_admin()
  and tenant_id = public.current_tenant_id()
);

drop policy if exists "usuarios_insert_admin" on public.usuarios;
create policy "usuarios_insert_admin"
on public.usuarios for insert
to authenticated
with check (
  public.is_current_admin()
  and tenant_id = public.current_tenant_id()
);

drop policy if exists "solo_clientes_rw_owner" on public.solo_clientes;
create policy "solo_clientes_rw_owner"
on public.solo_clientes for all
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
);

drop policy if exists "solo_areas_rw_owner" on public.solo_areas;
create policy "solo_areas_rw_owner"
on public.solo_areas for all
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
);

drop policy if exists "solo_parametros_read_tenant" on public.solo_parametros_globais;
create policy "solo_parametros_read_tenant"
on public.solo_parametros_globais for select
to authenticated
using (tenant_id = public.current_tenant_id());

drop policy if exists "solo_parametros_write_admin" on public.solo_parametros_globais;
create policy "solo_parametros_write_admin"
on public.solo_parametros_globais for all
to authenticated
using (
  public.is_current_admin()
  and tenant_id = public.current_tenant_id()
)
with check (
  public.is_current_admin()
  and tenant_id = public.current_tenant_id()
);

drop policy if exists "solo_analises_rw_owner" on public.solo_analises;
create policy "solo_analises_rw_owner"
on public.solo_analises for all
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and created_by = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and created_by = auth.uid()
);

drop policy if exists "solo_snapshots_rw_owner" on public.solo_analise_resultados_snapshot;
create policy "solo_snapshots_rw_owner"
on public.solo_analise_resultados_snapshot for all
to authenticated
using (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
)
with check (
  tenant_id = public.current_tenant_id()
  and owner_user_id = auth.uid()
);

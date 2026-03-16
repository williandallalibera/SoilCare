import { isSupabaseConfigured, supabase } from "../../lib/supabaseClient";
import { isLocalPreviewModeEnabled } from "../auth/authMode";
import { DEFAULT_PARAMETROS_GLOBAIS } from "./defaults";
import { calcularAnaliseSolo } from "./engine";
import type {
  AnaliseSolo,
  AnaliseSoloInput,
  AppSnapshot,
  Area,
  Cliente,
  LocalAuthCredential,
  ParametroVersion,
  ResultadoAnaliseSolo,
  Usuario,
  UsuarioPerfil,
} from "./types";
import { buildAnalysisCode, createId } from "./utils";

const STORAGE_KEY = "soil-analysis-saas-v1";
const LOCAL_SNAPSHOT_SCHEMA_VERSION = 3;

function nowIso(): string {
  return new Date().toISOString();
}

function normalizeEmail(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

async function getFunctionErrorMessage(
  error: unknown,
  fallback: string
): Promise<string> {
  if (error && typeof error === "object") {
    const response = (error as { context?: unknown }).context;

    if (response instanceof Response) {
      try {
        const contentType = response.headers.get("Content-Type") ?? "";
        const cloned = response.clone();

        if (contentType.includes("application/json")) {
          const payload = (await cloned.json()) as { error?: string; message?: string };
          if (payload.error) return payload.error;
          if (payload.message) return payload.message;
        }

        const text = (await cloned.text()).trim();
        if (text) return text;
      } catch (_parseError) {
        return `Erro ${response.status} ao executar a função.`;
      }

      return `Erro ${response.status} ao executar a função.`;
    }

    const message = (error as { message?: string }).message;
    if (
      message &&
      message !== "Edge Function returned a non-2xx status code"
    ) {
      return message;
    }
  }

  return fallback;
}

function getDefaultLocalPassword(user: Pick<Usuario, "id" | "email">): string {
  const email = normalizeEmail(user.email);
  if (user.id === "preview-id" || email === "admin@soilcare.local") {
    return "teste";
  }
  return "Temp123456!";
}

function normalizeLocalAuthCredentials(
  usuarios: Usuario[],
  credentials: LocalAuthCredential[] | undefined
): LocalAuthCredential[] {
  const existingByUserId = new Map(
    (credentials ?? []).map((row) => [row.user_id, row])
  );

  return usuarios
    .map((user) => {
      const email = normalizeEmail(user.email);
      if (!email) return null;
      const existing = existingByUserId.get(user.id);
      return {
        user_id: user.id,
        email,
        password: existing?.password ?? getDefaultLocalPassword(user),
      } satisfies LocalAuthCredential;
    })
    .filter((row): row is LocalAuthCredential => row !== null);
}

function normalizeParametros(
  parametros: Partial<ParametroVersion["parametros"]> | undefined
): ParametroVersion["parametros"] {
  const normalizedCalcio = {
    ...DEFAULT_PARAMETROS_GLOBAIS.calcio,
    ...(parametros?.calcio ?? {}),
  };
  if (
    parametros?.calcio?.relacao_ca_mg_limite_dolomitico === undefined &&
    normalizedCalcio.relacao_ca_mg_limite_calcitico >=
      DEFAULT_PARAMETROS_GLOBAIS.calcio.relacao_ca_mg_limite_dolomitico
  ) {
    normalizedCalcio.relacao_ca_mg_limite_dolomitico =
      normalizedCalcio.relacao_ca_mg_limite_calcitico;
    normalizedCalcio.relacao_ca_mg_limite_calcitico =
      DEFAULT_PARAMETROS_GLOBAIS.calcio.relacao_ca_mg_limite_calcitico;
  }

  const normalizedFosforo = {
    ...DEFAULT_PARAMETROS_GLOBAIS.fosforo,
    ...(parametros?.fosforo ?? {}),
  };
  if (
    normalizedFosforo.teor_argila_baixo <= 1 &&
    normalizedFosforo.teor_argila_medio <= 1 &&
    normalizedFosforo.teor_argila_alto <= 1
  ) {
    normalizedFosforo.teor_argila_baixo *= 100;
    normalizedFosforo.teor_argila_medio *= 100;
    normalizedFosforo.teor_argila_alto *= 100;
  }

  return {
    ...DEFAULT_PARAMETROS_GLOBAIS,
    ...parametros,
    k: { ...DEFAULT_PARAMETROS_GLOBAIS.k, ...(parametros?.k ?? {}) },
    calcio: normalizedCalcio,
    fosforo: normalizedFosforo,
    magnesio: { ...DEFAULT_PARAMETROS_GLOBAIS.magnesio, ...(parametros?.magnesio ?? {}) },
    materia_organica: {
      ...DEFAULT_PARAMETROS_GLOBAIS.materia_organica,
      ...(parametros?.materia_organica ?? {}),
    },
    enxofre: { ...DEFAULT_PARAMETROS_GLOBAIS.enxofre, ...(parametros?.enxofre ?? {}) },
    producao: { ...DEFAULT_PARAMETROS_GLOBAIS.producao, ...(parametros?.producao ?? {}) },
    fertilizante: {
      ...DEFAULT_PARAMETROS_GLOBAIS.fertilizante,
      ...(parametros?.fertilizante ?? {}),
    },
    micros: {
      ...DEFAULT_PARAMETROS_GLOBAIS.micros,
      ...(parametros?.micros ?? {}),
      boro: { ...DEFAULT_PARAMETROS_GLOBAIS.micros.boro, ...(parametros?.micros?.boro ?? {}) },
      cobre: {
        ...DEFAULT_PARAMETROS_GLOBAIS.micros.cobre,
        ...(parametros?.micros?.cobre ?? {}),
      },
      ferro: { ...DEFAULT_PARAMETROS_GLOBAIS.micros.ferro, ...(parametros?.micros?.ferro ?? {}) },
      zinco: {
        ...DEFAULT_PARAMETROS_GLOBAIS.micros.zinco,
        ...(parametros?.micros?.zinco ?? {}),
      },
      manganes: {
        ...DEFAULT_PARAMETROS_GLOBAIS.micros.manganes,
        ...(parametros?.micros?.manganes ?? {}),
      },
    },
  };
}

function normalizeAnaliseInput(
  input: Partial<AnaliseSoloInput> | undefined,
  createdAt = nowIso()
): AnaliseSoloInput {
  const legacyKValue = input?.k_mg_dm3 ?? 0;
  const normalizedKValue =
    legacyKValue > 5
      ? legacyKValue / DEFAULT_PARAMETROS_GLOBAIS.k.mg_dm3_para_kg_ha
      : legacyKValue;

  return {
    codigo_analise: input?.codigo_analise ?? buildAnalysisCode(),
    laboratorio: input?.laboratorio ?? "",
    controle_laboratorio: input?.controle_laboratorio ?? "",
    amostra_identificacao: input?.amostra_identificacao ?? "",
    profundidade_quimica_cm: input?.profundidade_quimica_cm ?? "0-15",
    fecha_muestreo: input?.fecha_muestreo ?? createdAt.slice(0, 10),
    fecha_reporte: input?.fecha_reporte ?? createdAt.slice(0, 10),
    area_total_ha: input?.area_total_ha ?? 0,
    cultura: input?.cultura ?? DEFAULT_PARAMETROS_GLOBAIS.producao.cultura_padrao,
    productividad_objetivo_bolsas_ha:
      input?.productividad_objetivo_bolsas_ha ??
      DEFAULT_PARAMETROS_GLOBAIS.producao.produtividade_padrao_bolsas_ha,
    prnt_calcario_percent: input?.prnt_calcario_percent ?? 0,
    calcio_no_calcario_percent: input?.calcio_no_calcario_percent ?? 0,
    magnesio_no_calcario_percent: input?.magnesio_no_calcario_percent ?? 0,
    k_mg_dm3: normalizedKValue,
    ctc_cmol_dm3: input?.ctc_cmol_dm3 ?? 0,
    ctc_ph7_cmol_dm3: input?.ctc_ph7_cmol_dm3 ?? 0,
    ctc_efetiva_cmol_dm3: input?.ctc_efetiva_cmol_dm3 ?? input?.ctc_cmol_dm3 ?? 0,
    ca_cmol_dm3: input?.ca_cmol_dm3 ?? 0,
    aluminio_cmol_dm3: input?.aluminio_cmol_dm3 ?? 0,
    h_al_cmol_dm3: input?.h_al_cmol_dm3 ?? 0,
    soma_bases_cmol_dm3: input?.soma_bases_cmol_dm3 ?? 0,
    p_mg_dm3: input?.p_mg_dm3 ?? 0,
    ncp_mg_dm3: input?.ncp_mg_dm3 ?? 0,
    fosforo_relativo_percent: input?.fosforo_relativo_percent ?? 0,
    teor_argila_percent: input?.teor_argila_percent ?? 0,
    areia_percent: input?.areia_percent ?? 0,
    silte_percent: input?.silte_percent ?? 0,
    classificacao_solo_tipo: input?.classificacao_solo_tipo ?? "",
    agua_disponivel_mm_cm: input?.agua_disponivel_mm_cm ?? 0,
    prem: input?.prem ?? 0,
    mg_cmol_dm3: input?.mg_cmol_dm3 ?? 0,
    so4_mg_dm3: input?.so4_mg_dm3 ?? 0,
    b_mg_dm3: input?.b_mg_dm3 ?? 0,
    cu_mg_dm3: input?.cu_mg_dm3 ?? 0,
    fe_mg_dm3: input?.fe_mg_dm3 ?? 0,
    zn_mg_dm3: input?.zn_mg_dm3 ?? 0,
    mn_mg_dm3: input?.mn_mg_dm3 ?? 0,
    carbono_g_dm3: input?.carbono_g_dm3 ?? 0,
    materia_organica_percent: input?.materia_organica_percent ?? 0,
    materia_organica_g_dm3: input?.materia_organica_g_dm3 ?? 0,
    saturacao_aluminio_percent: input?.saturacao_aluminio_percent ?? 0,
    saturacao_bases_percent: input?.saturacao_bases_percent ?? 0,
    relacao_ca_mg: input?.relacao_ca_mg ?? 0,
    relacao_ca_k: input?.relacao_ca_k ?? 0,
    relacao_mg_k: input?.relacao_mg_k ?? 0,
    relacao_k_ca_mg: input?.relacao_k_ca_mg ?? 0,
    k_percent_ctc: input?.k_percent_ctc ?? 0,
    ca_percent_ctc: input?.ca_percent_ctc ?? 0,
    mg_percent_ctc: input?.mg_percent_ctc ?? 0,
    h_percent_ctc: input?.h_percent_ctc ?? 0,
    al_percent_ctc: input?.al_percent_ctc ?? 0,
    ph_agua: input?.ph_agua ?? 0,
    ph_smp: input?.ph_smp ?? 0,
    ph_cacl2: input?.ph_cacl2 ?? 0,
    observaciones: input?.observaciones ?? "",
  };
}

function inBrowser(): boolean {
  return typeof window !== "undefined";
}

export function isLocalMode(): boolean {
  if (!inBrowser()) return !isSupabaseConfigured;
  return isLocalPreviewModeEnabled();
}

function createSeedSnapshot(): AppSnapshot {
  const createdAt = nowIso();
  const parametroVersion: ParametroVersion = {
    id: createId("param"),
    version_label: "Base planilha v1",
    is_active: true,
    parametros: DEFAULT_PARAMETROS_GLOBAIS,
    created_at: createdAt,
    updated_at: createdAt,
  };

  const cliente: Cliente = {
    id: createId("cli"),
    nombre: "Fazenda Modelo",
    documento: "80012345-6",
    contacto: "William Dallalibera",
    telefono: "+595 981 555 444",
    email: "contato@fazendamodelo.com",
    ciudad: "Santa Rita",
    estado: "activo",
    observaciones: "Cliente de demonstração para revisão do fluxo.",
    created_at: createdAt,
    updated_at: createdAt,
  };

  const area: Area = {
    id: createId("area"),
    cliente_id: cliente.id,
    nombre: "Talhão 01",
    codigo: "A-01",
    municipio: "Santa Rita",
    departamento: "Alto Paraná",
    tamanho_ha: 42,
    estado: "activo",
    observaciones: "Área base para análise inicial.",
    created_at: createdAt,
    updated_at: createdAt,
  };

  const input: AnaliseSoloInput = {
    codigo_analise: buildAnalysisCode(),
    laboratorio: "Solanalise",
    controle_laboratorio: "51801/2026",
    amostra_identificacao: "2",
    profundidade_quimica_cm: "0-15",
    fecha_muestreo: "2026-02-07",
    fecha_reporte: "2026-02-07",
    area_total_ha: 42,
    cultura: DEFAULT_PARAMETROS_GLOBAIS.producao.cultura_padrao,
    productividad_objetivo_bolsas_ha: DEFAULT_PARAMETROS_GLOBAIS.producao.produtividade_padrao_bolsas_ha,
    prnt_calcario_percent: 100,
    calcio_no_calcario_percent: 30,
    magnesio_no_calcario_percent: 20,
    k_mg_dm3: 0.1,
    ctc_cmol_dm3: 6.71,
    ctc_ph7_cmol_dm3: 13.3,
    ctc_efetiva_cmol_dm3: 6.71,
    ca_cmol_dm3: 4.42,
    aluminio_cmol_dm3: 0.61,
    h_al_cmol_dm3: 7.2,
    soma_bases_cmol_dm3: 6.1,
    p_mg_dm3: 29.26,
    ncp_mg_dm3: 9.9,
    fosforo_relativo_percent: 295.53,
    teor_argila_percent: 72.5,
    areia_percent: 13.75,
    silte_percent: 13.75,
    classificacao_solo_tipo: "3",
    agua_disponivel_mm_cm: 0.9,
    prem: 15.13,
    mg_cmol_dm3: 1.58,
    so4_mg_dm3: 5.64,
    b_mg_dm3: 0.33,
    cu_mg_dm3: 3.9,
    fe_mg_dm3: 21.8,
    zn_mg_dm3: 1.8,
    mn_mg_dm3: 31.4,
    carbono_g_dm3: 17,
    materia_organica_percent: 2.92,
    materia_organica_g_dm3: 29.24,
    saturacao_aluminio_percent: 9.09,
    saturacao_bases_percent: 45.86,
    relacao_ca_mg: 2.8,
    relacao_ca_k: 44.2,
    relacao_mg_k: 15.8,
    relacao_k_ca_mg: 0.04,
    k_percent_ctc: 0.75,
    ca_percent_ctc: 33.23,
    mg_percent_ctc: 11.88,
    h_percent_ctc: 49.55,
    al_percent_ctc: 4.59,
    ph_agua: 0,
    ph_smp: 0,
    ph_cacl2: 4.5,
    observaciones: "Exemplo baseado no laudo padrão Solanalise enviado pelo usuário.",
  };

  const resultado = calcularAnaliseSolo(input, parametroVersion.parametros);
  const analise: AnaliseSolo = {
    id: createId("analise"),
    cliente_id: cliente.id,
    area_id: area.id,
    parametro_version_id: parametroVersion.id,
    input,
    resultado,
    created_by: "preview-id",
    created_at: createdAt,
    updated_at: createdAt,
  };

  const previewAdmin: Usuario = {
    id: "preview-id",
    nombre: "Admin Preview",
    email: "admin@soilcare.local",
    telefono: "+595 981 000 000",
    perfil_acceso: "admin",
    estado: "activo",
    created_at: createdAt,
  };

  const previewOperator: Usuario = {
    id: createId("user"),
    nombre: "Operador Demo",
    email: "operador@soilcare.local",
    telefono: "+595 981 111 111",
    perfil_acceso: "operador",
    estado: "activo",
    created_at: createdAt,
  };

  return {
    schema_version: LOCAL_SNAPSHOT_SCHEMA_VERSION,
    clientes: [cliente],
    areas: [area],
    analises: [analise],
    usuarios: [previewAdmin, previewOperator],
    local_auth_credentials: [
      {
        user_id: previewAdmin.id,
        email: normalizeEmail(previewAdmin.email),
        password: "teste",
      },
      {
        user_id: previewOperator.id,
        email: normalizeEmail(previewOperator.email),
        password: "Temp123456!",
      },
    ],
    parametros: [parametroVersion],
  };
}

function migrateLocalSnapshot(parsed: AppSnapshot): AppSnapshot {
  const normalizedParametros = parsed.parametros.map((row) => ({
    ...row,
    parametros:
      parsed.schema_version === LOCAL_SNAPSHOT_SCHEMA_VERSION
        ? normalizeParametros(row.parametros)
        : DEFAULT_PARAMETROS_GLOBAIS,
  }));
  const parametroMap = Object.fromEntries(
    normalizedParametros.map((row) => [row.id, row.parametros])
  );

  return {
    ...parsed,
    schema_version: LOCAL_SNAPSHOT_SCHEMA_VERSION,
    parametros: normalizedParametros,
    local_auth_credentials: normalizeLocalAuthCredentials(
      parsed.usuarios,
      parsed.local_auth_credentials
    ),
    analises: parsed.analises.map((row) => {
      const normalizedInput = normalizeAnaliseInput(row.input, row.created_at);
      const parametros = parametroMap[row.parametro_version_id] ?? DEFAULT_PARAMETROS_GLOBAIS;
      return {
        ...row,
        input: normalizedInput,
        resultado: row.resultado ?? calcularAnaliseSolo(normalizedInput, parametros),
      };
    }),
  };
}

function getLocalSnapshot(): AppSnapshot {
  if (!inBrowser()) return createSeedSnapshot();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seed = createSeedSnapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
  try {
    const parsed = JSON.parse(raw) as AppSnapshot;
    const migrated = migrateLocalSnapshot(parsed);
    if (parsed.schema_version !== LOCAL_SNAPSHOT_SCHEMA_VERSION) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    }
    return migrated;
  } catch (_error) {
    const seed = createSeedSnapshot();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
    return seed;
  }
}

function setLocalSnapshot(next: AppSnapshot): void {
  if (!inBrowser()) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export async function listClientes(): Promise<Cliente[]> {
  if (isLocalMode()) {
    return getLocalSnapshot().clientes.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("solo_clientes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Cliente[];
}

export async function saveCliente(
  payload: Omit<Cliente, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<Cliente> {
  if (isLocalMode()) {
    const snapshot = getLocalSnapshot();
    const created_at = payload.id
      ? snapshot.clientes.find((item) => item.id === payload.id)?.created_at ?? nowIso()
      : nowIso();
    const item: Cliente = {
      id: payload.id ?? createId("cli"),
      created_at,
      updated_at: nowIso(),
      ...payload,
    };
    const next = snapshot.clientes.some((row) => row.id === item.id)
      ? snapshot.clientes.map((row) => (row.id === item.id ? item : row))
      : [item, ...snapshot.clientes];
    setLocalSnapshot({ ...snapshot, clientes: next });
    return item;
  }

  const item = {
    ...payload,
    updated_at: nowIso(),
  };
  const { data, error } = payload.id
    ? await supabase
        .from("solo_clientes")
        .update(item)
        .eq("id", payload.id)
        .select("*")
        .single()
    : await supabase.from("solo_clientes").insert(item).select("*").single();
  if (error) throw error;
  return data as Cliente;
}

export async function listAreas(): Promise<Area[]> {
  if (isLocalMode()) {
    return getLocalSnapshot().areas.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("solo_areas")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Area[];
}

export async function saveArea(
  payload: Omit<Area, "id" | "created_at" | "updated_at"> & { id?: string }
): Promise<Area> {
  if (isLocalMode()) {
    const snapshot = getLocalSnapshot();
    const created_at = payload.id
      ? snapshot.areas.find((item) => item.id === payload.id)?.created_at ?? nowIso()
      : nowIso();
    const item: Area = {
      id: payload.id ?? createId("area"),
      created_at,
      updated_at: nowIso(),
      ...payload,
    };
    const next = snapshot.areas.some((row) => row.id === item.id)
      ? snapshot.areas.map((row) => (row.id === item.id ? item : row))
      : [item, ...snapshot.areas];
    setLocalSnapshot({ ...snapshot, areas: next });
    return item;
  }

  const item = {
    ...payload,
    updated_at: nowIso(),
  };
  const { data, error } = payload.id
    ? await supabase.from("solo_areas").update(item).eq("id", payload.id).select("*").single()
    : await supabase.from("solo_areas").insert(item).select("*").single();
  if (error) throw error;
  return data as Area;
}

async function getCurrentSupabaseProfile(): Promise<{
  id: string;
  tenant_id: string | null;
  perfil_acceso: UsuarioPerfil;
  estado: "activo" | "inactivo";
} | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return null;

  const { data, error } = await supabase
    .from("usuarios")
    .select("id, tenant_id, perfil_acceso, estado")
    .eq("id", user.id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    tenant_id: data.tenant_id,
    perfil_acceso: data.perfil_acceso,
    estado: data.estado,
  };
}

export async function getActiveParametros(): Promise<ParametroVersion> {
  if (isLocalMode()) {
    const active = getLocalSnapshot().parametros.find((item) => item.is_active);
    return active ?? createSeedSnapshot().parametros[0];
  }
  const { data, error } = await supabase
    .from("solo_parametros_globais")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    const currentProfile = await getCurrentSupabaseProfile();
    if (!currentProfile?.tenant_id) {
      throw new Error(
        "Usuário sem tenant configurado no Supabase. Execute o bootstrap do admin antes de usar a aplicação."
      );
    }
    if (currentProfile.perfil_acesso !== "admin") {
      throw new Error(
        "Nenhum parâmetro global ativo foi encontrado para este admin. Peça ao administrador para configurar a primeira versão."
      );
    }
    const created = await saveParametroVersion({
      version_label: "Base planilha v1",
      parametros: DEFAULT_PARAMETROS_GLOBAIS,
    });
    return created;
  }
  return {
    id: data.id,
    version_label: data.version_label,
    is_active: data.is_active,
    parametros: normalizeParametros(data.parametros as ParametroVersion["parametros"]),
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listParametroVersions(): Promise<ParametroVersion[]> {
  if (isLocalMode()) {
    return getLocalSnapshot().parametros.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("solo_parametros_globais")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    version_label: item.version_label,
    is_active: item.is_active,
    parametros: normalizeParametros(item.parametros as ParametroVersion["parametros"]),
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
}

export async function saveParametroVersion(payload: {
  version_label: string;
  parametros: ParametroVersion["parametros"];
}): Promise<ParametroVersion> {
  if (isLocalMode()) {
    const snapshot = getLocalSnapshot();
    const nextRows = snapshot.parametros.map((row) => ({ ...row, is_active: false }));
    const item: ParametroVersion = {
      id: createId("param"),
      version_label: payload.version_label,
      is_active: true,
      parametros: payload.parametros,
      created_at: nowIso(),
      updated_at: nowIso(),
    };
    setLocalSnapshot({ ...snapshot, parametros: [item, ...nextRows] });
    return item;
  }

  await supabase.from("solo_parametros_globais").update({ is_active: false }).eq("is_active", true);
  const { data, error } = await supabase
    .from("solo_parametros_globais")
    .insert({
      version_label: payload.version_label,
      is_active: true,
      parametros: payload.parametros,
      updated_at: nowIso(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return {
    id: data.id,
    version_label: data.version_label,
    is_active: data.is_active,
    parametros: data.parametros as ParametroVersion["parametros"],
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listAnalises(): Promise<AnaliseSolo[]> {
  if (isLocalMode()) {
    return getLocalSnapshot().analises.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("solo_analises")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((item) => ({
    id: item.id,
    cliente_id: item.cliente_id,
    area_id: item.area_id,
    parametro_version_id: item.parametro_version_id,
    input: normalizeAnaliseInput(item.input_json as AnaliseSoloInput, item.created_at),
    resultado: item.resultado_json as ResultadoAnaliseSolo,
    created_by: item.created_by,
    created_at: item.created_at,
    updated_at: item.updated_at,
  }));
}

export async function saveAnalise(payload: {
  id?: string;
  cliente_id: string;
  area_id: string;
  parametro_version_id: string;
  input: AnaliseSoloInput;
  resultado: ResultadoAnaliseSolo;
  created_by: string | null;
}): Promise<AnaliseSolo> {
  if (isLocalMode()) {
    const snapshot = getLocalSnapshot();
    const created_at = payload.id
      ? snapshot.analises.find((item) => item.id === payload.id)?.created_at ?? nowIso()
      : nowIso();
    const item: AnaliseSolo = {
      id: payload.id ?? createId("analise"),
      cliente_id: payload.cliente_id,
      area_id: payload.area_id,
      parametro_version_id: payload.parametro_version_id,
      input: payload.input,
      resultado: payload.resultado,
      created_by: payload.created_by,
      created_at,
      updated_at: nowIso(),
    };
    const next = snapshot.analises.some((row) => row.id === item.id)
      ? snapshot.analises.map((row) => (row.id === item.id ? item : row))
      : [item, ...snapshot.analises];
    setLocalSnapshot({ ...snapshot, analises: next });
    return item;
  }

  const record = {
    cliente_id: payload.cliente_id,
    area_id: payload.area_id,
    parametro_version_id: payload.parametro_version_id,
    input_json: payload.input,
    resultado_json: payload.resultado,
    created_by: payload.created_by,
    updated_at: nowIso(),
  };

  const { data, error } = payload.id
    ? await supabase
        .from("solo_analises")
        .update(record)
        .eq("id", payload.id)
        .select("*")
        .single()
    : await supabase.from("solo_analises").insert(record).select("*").single();
  if (error) throw error;

  const analysisId = data.id as string;
  const snapshotPayload = {
    analise_id: analysisId,
    parametro_version_id: payload.parametro_version_id,
    input_json: payload.input,
    resultado_json: payload.resultado,
    updated_at: nowIso(),
  };
  const { error: snapshotError } = await supabase
    .from("solo_analise_resultados_snapshot")
    .upsert(snapshotPayload, { onConflict: "analise_id" });
  if (snapshotError) throw snapshotError;

  return {
    id: analysisId,
    cliente_id: data.cliente_id,
    area_id: data.area_id,
    parametro_version_id: data.parametro_version_id,
    input: data.input_json as AnaliseSoloInput,
    resultado: data.resultado_json as ResultadoAnaliseSolo,
    created_by: data.created_by,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };
}

export async function listUsuarios(): Promise<Usuario[]> {
  if (isLocalMode()) {
    return getLocalSnapshot().usuarios.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const { data, error } = await supabase
    .from("usuarios")
    .select("id, nombre, email, telefono, perfil_acceso, estado, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Usuario[];
}

export function getLocalUsuarioById(userId: string): Usuario | null {
  if (!isLocalMode()) return null;
  return getLocalSnapshot().usuarios.find((row) => row.id === userId) ?? null;
}

export function authenticateLocalUsuario(email: string, password: string): Usuario | null {
  if (!isLocalMode()) return null;

  const snapshot = getLocalSnapshot();
  const normalizedEmail = normalizeEmail(email);
  const credential = snapshot.local_auth_credentials?.find(
    (row) => row.email === normalizedEmail && row.password === password
  );

  if (!credential) return null;

  const user = snapshot.usuarios.find((row) => row.id === credential.user_id) ?? null;
  if (!user || user.estado !== "activo") return null;
  return user;
}

export async function saveUsuario(payload: {
  id?: string;
  nombre: string;
  email: string;
  telefono: string;
  perfil_acesso: UsuarioPerfil;
  estado: "activo" | "inactivo";
  password?: string;
}): Promise<Usuario> {
  if (isLocalMode()) {
    const snapshot = getLocalSnapshot();
    const created_at = payload.id
      ? snapshot.usuarios.find((item) => item.id === payload.id)?.created_at ?? nowIso()
      : nowIso();
    const item: Usuario = {
      id: payload.id ?? createId("user"),
      nombre: payload.nombre,
      email: payload.email,
      telefono: payload.telefono || null,
      perfil_acceso: payload.perfil_acesso,
      estado: payload.estado,
      created_at,
    };
    const next = snapshot.usuarios.some((row) => row.id === item.id)
      ? snapshot.usuarios.map((row) => (row.id === item.id ? item : row))
      : [item, ...snapshot.usuarios];
    const existingCredential = snapshot.local_auth_credentials?.find(
      (row) => row.user_id === item.id
    );
    const nextCredential: LocalAuthCredential | null = item.email
      ? {
          user_id: item.id,
          email: normalizeEmail(item.email),
          password:
            payload.password || existingCredential?.password || getDefaultLocalPassword(item),
        }
      : null;
    const filteredCredentials = (snapshot.local_auth_credentials ?? []).filter(
      (row) => row.user_id !== item.id
    );

    setLocalSnapshot({
      ...snapshot,
      usuarios: next,
      local_auth_credentials: nextCredential
        ? [nextCredential, ...filteredCredentials]
        : filteredCredentials,
    });
    return item;
  }

  const { data, error } = await supabase.functions.invoke<{
    user?: Usuario;
    error?: string;
  }>("admin-save-user", {
    body: payload,
  });

  if (error) {
    throw new Error(
      await getFunctionErrorMessage(
        error,
        data?.error ||
          "A gestão administrativa de usuários requer a função Supabase `admin-save-user` implantada."
      )
    );
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  const user = data?.user as Usuario | undefined;
  if (!user) {
    throw new Error("A função `admin-save-user` não retornou um usuário válido.");
  }

  return user;
}

export async function getDashboardSnapshot(): Promise<AppSnapshot> {
  const [clientes, areas, analises, usuarios, parametros] = await Promise.all([
    listClientes(),
    listAreas(),
    listAnalises(),
    listUsuarios(),
    listParametroVersions(),
  ]);
  return { clientes, areas, analises, usuarios, parametros };
}

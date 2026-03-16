import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PARAMETROS_GLOBAIS } from "./defaults";
import { calcularAnaliseSolo } from "./engine";
import {
  authenticateLocalUsuario,
  getActiveParametros,
  listAnalises,
  saveUsuario,
} from "./repository";
import type { AnaliseSoloInput, AppSnapshot, ParametroVersion } from "./types";

const STORAGE_KEY = "soil-analysis-saas-v1";

class MemoryStorage {
  private data = new Map<string, string>();

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  get length(): number {
    return this.data.size;
  }
}

const baseScenario: AnaliseSoloInput = {
  codigo_analise: "ANALIS-LOCAL-LEGACY",
  laboratorio: "Planilha",
  controle_laboratorio: "4856/2025",
  amostra_identificacao: "1",
  profundidade_quimica_cm: "0-15",
  fecha_muestreo: "2026-03-13",
  fecha_reporte: "2026-03-13",
  area_total_ha: 1,
  cultura: "Soja",
  productividad_objetivo_bolsas_ha: 60,
  prnt_calcario_percent: 100,
  calcio_no_calcario_percent: 30,
  magnesio_no_calcario_percent: 20,
  k_mg_dm3: 234,
  ctc_cmol_dm3: 13.5,
  ctc_ph7_cmol_dm3: 13.5,
  ctc_efetiva_cmol_dm3: 13.5,
  ca_cmol_dm3: 7,
  aluminio_cmol_dm3: 0,
  h_al_cmol_dm3: 0,
  soma_bases_cmol_dm3: 0,
  p_mg_dm3: 25,
  ncp_mg_dm3: 0,
  fosforo_relativo_percent: 0,
  teor_argila_percent: 60,
  areia_percent: 0,
  silte_percent: 0,
  classificacao_solo_tipo: "",
  agua_disponivel_mm_cm: 0,
  prem: 22,
  mg_cmol_dm3: 2,
  so4_mg_dm3: 15,
  b_mg_dm3: 1,
  cu_mg_dm3: 6.6,
  fe_mg_dm3: 39,
  zn_mg_dm3: 12,
  mn_mg_dm3: 61,
  carbono_g_dm3: 0,
  materia_organica_percent: 3,
  materia_organica_g_dm3: 0,
  saturacao_aluminio_percent: 0,
  saturacao_bases_percent: 0,
  relacao_ca_mg: 0,
  relacao_ca_k: 0,
  relacao_mg_k: 0,
  relacao_k_ca_mg: 0,
  k_percent_ctc: 0,
  ca_percent_ctc: 0,
  mg_percent_ctc: 0,
  h_percent_ctc: 0,
  al_percent_ctc: 0,
  ph_agua: 0,
  ph_smp: 0,
  ph_cacl2: 0,
  observaciones: "",
};

function makeSnapshot(): AppSnapshot {
  const createdAt = "2026-03-16T12:00:00.000Z";
  const parametroVersion: ParametroVersion = {
    id: "param-1",
    version_label: "Base planilha v1",
    is_active: true,
    parametros: DEFAULT_PARAMETROS_GLOBAIS,
    created_at: createdAt,
    updated_at: createdAt,
  };
  const resultado = calcularAnaliseSolo(baseScenario, DEFAULT_PARAMETROS_GLOBAIS);
  resultado.resumo.calcario_kg_ha = 999;
  resultado.resumo.formula_recomendada = "LEGADO";

  return {
    clientes: [
      {
        id: "cli-1",
        nombre: "Cliente legado",
        documento: null,
        contacto: null,
        telefono: null,
        email: null,
        ciudad: null,
        estado: "activo",
        observaciones: null,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    areas: [
      {
        id: "area-1",
        cliente_id: "cli-1",
        nombre: "Área 1",
        codigo: null,
        municipio: null,
        departamento: null,
        tamanho_ha: 1,
        estado: "activo",
        observaciones: null,
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    analises: [
      {
        id: "analise-1",
        cliente_id: "cli-1",
        area_id: "area-1",
        parametro_version_id: parametroVersion.id,
        input: baseScenario,
        resultado,
        created_by: "user-1",
        created_at: createdAt,
        updated_at: createdAt,
      },
    ],
    usuarios: [
      {
        id: "user-1",
        nombre: "Admin",
        email: null,
        telefono: null,
        perfil_acceso: "admin",
        estado: "activo",
        created_at: createdAt,
      },
    ],
    parametros: [parametroVersion],
  };
}

describe("repository local snapshot", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", new MemoryStorage());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mantem o resultado salvo em snapshots locais antigos", async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(makeSnapshot()));

    const [analise] = await listAnalises();
    const parametros = await getActiveParametros();

    expect(analise.input.k_mg_dm3).toBeCloseTo(0.6, 6);
    expect(analise.resultado.resumo.calcario_kg_ha).toBe(999);
    expect(analise.resultado.resumo.formula_recomendada).toBe("LEGADO");
    expect(parametros.parametros).toEqual(DEFAULT_PARAMETROS_GLOBAIS);
  });

  it("usa as senhas do CRUD local para criar e redefinir acesso", async () => {
    const created = await saveUsuario({
      nombre: "Novo Operador",
      email: "operador.novo@soilcare.local",
      telefono: "",
      perfil_acesso: "operador",
      estado: "activo",
      password: "SenhaInicial123",
    });

    expect(
      authenticateLocalUsuario("operador.novo@soilcare.local", "SenhaInicial123")?.id
    ).toBe(created.id);

    await saveUsuario({
      id: created.id,
      nombre: "Novo Operador",
      email: "operador.novo@soilcare.local",
      telefono: "",
      perfil_acesso: "operador",
      estado: "activo",
      password: "SenhaReset456",
    });

    expect(
      authenticateLocalUsuario("operador.novo@soilcare.local", "SenhaInicial123")
    ).toBeNull();
    expect(
      authenticateLocalUsuario("operador.novo@soilcare.local", "SenhaReset456")?.id
    ).toBe(created.id);
  });
});

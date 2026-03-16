import type { AnaliseSoloInput } from "./types";
import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMETROS_GLOBAIS } from "./defaults";
import { calcularAnaliseSolo } from "./engine";

const baseScenario: AnaliseSoloInput = {
  codigo_analise: "ANALIS-AUDIT",
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
  k_mg_dm3: 0.6,
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

describe("calcularAnaliseSolo - motor Lovable no formato do app", () => {
  it("usa as necessidades principais do motor do Lovable", () => {
    const result = calcularAnaliseSolo(baseScenario, DEFAULT_PARAMETROS_GLOBAIS);

    expect(result.recomendacao_final.necessidade_fertilizante.k2o_kg_ha).toBeCloseTo(113.22, 2);
    expect(result.recomendacao_final.necessidade_fertilizante.p2o5_kg_ha).toBe(0);
    expect(result.recomendacao_final.necessidade_fertilizante.so4_kg_ha).toBe(0);

    expect(result.calcio.calcario_kg_ha).toBeCloseTo(833.33, 2);
    expect(result.magnesio.recomendacao_produto_kg_ha).toBeCloseTo(1250, 2);
    expect(result.calagem_resumo.total_calcario_kg_ha).toBeCloseTo(2083.33, 2);
    expect(result.fosforo.ncp_estimado).toBe(25);
    expect(result.potassio.k_kg_ha).toBe(234);
  });

  it("gera os cards e a formula sugerida coerentes com o motor do Lovable", () => {
    const result = calcularAnaliseSolo(baseScenario, DEFAULT_PARAMETROS_GLOBAIS);

    const potassio = result.equilibrio_nutricional.find((item) => item.id === "potassio");
    const fosforo = result.equilibrio_nutricional.find((item) => item.id === "fosforo");

    expect(potassio?.status).toBe("Deficiente");
    expect(potassio?.necessidade).toBeCloseTo(113.22, 2);
    expect(fosforo?.status).toBe("Adequado");
    expect(fosforo?.necessidade).toBe(0);

    expect(result.recomendacao_final.formula_sugerida?.nome).toBe("00-00-20");
    expect(result.recomendacao_final.formula_sugerida?.dose_kg_ha).toBeCloseTo(566.1, 2);
    expect(result.alertas.some((alerta) => alerta.id === "k-emergencial")).toBe(true);
    expect(result.alertas.some((alerta) => alerta.id === "k-salinidade")).toBe(false);
  });

  it("usa a cadeia de producao do Lovable para K, P e S", () => {
    const result = calcularAnaliseSolo(baseScenario, DEFAULT_PARAMETROS_GLOBAIS);

    expect(result.extracao_producao.linhas[0]).toMatchObject({
      nutriente: "K₂O",
      reserva_solo_kg: 0,
      total_necessario_kg: 78,
      saldo_kg_ha: -78,
      produto_kg_ha: 130,
    });
    expect(result.extracao_producao.linhas[1]).toMatchObject({
      nutriente: "P₂O₅",
      reserva_solo_kg: 76.5,
      total_necessario_kg: 72,
      saldo_kg_ha: 4.5,
      produto_kg_ha: 15,
    });
    expect(result.extracao_producao.linhas[2]).toMatchObject({
      nutriente: "SO₄²⁻",
      reserva_solo_kg: 225,
      total_necessario_kg: 55.8,
      saldo_kg_ha: 169.2,
      produto_kg_ha: 0,
    });
  });

  it("mantem micros e materia organica no contrato de saida", () => {
    const result = calcularAnaliseSolo(baseScenario, DEFAULT_PARAMETROS_GLOBAIS);

    expect(result.materia_organica.teor_atual_percent).toBe(3);
    expect(result.materia_organica.equilibrio_minimo_percent).toBe(100);
    expect(result.materia_organica.indice_acentuado_percent).toBe(60);

    expect(result.micros.boro.status).toBe("Adequado");
    expect(result.micros.cobre.status).toBe("Adequado");
    expect(result.micros.ferro.status).toBe("Adequado");
    expect(result.micros.zinco.status).toBe("Adequado");
    expect(result.micros.manganes.status).toBe("Excesso");
  });
});

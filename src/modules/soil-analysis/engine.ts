import type {
  AnaliseSoloInput,
  EquilibrioNutrienteCard,
  FormulaComercial,
  FormulaSugerida,
  ParametrosGlobais,
  RecomendacaoAlerta,
  ResultadoAnaliseSolo,
} from "./types";
import { calculateSoilRecommendations, type SoilInput } from "./lovableEngine";

function round(value: number, digits = 2): number {
  return Number(value.toFixed(digits));
}

function clampMin(value: number, min = 0): number {
  return value < min ? min : value;
}

function safeDivide(numerator: number, denominator: number): number {
  if (!denominator) return 0;
  return numerator / denominator;
}

function createCard(card: Omit<EquilibrioNutrienteCard, "percentual">): EquilibrioNutrienteCard {
  return {
    ...card,
    percentual: round(safeDivide(card.atual, card.ideal || 1) * 100, 2),
  };
}

function sugerirFormula(
  formulas: FormulaComercial[],
  necessidades: { p2o5: number; k2o: number; so4: number }
): FormulaSugerida | null {
  const hasNeed =
    necessidades.p2o5 > 0.0001 || necessidades.k2o > 0.0001 || necessidades.so4 > 0.0001;
  if (!hasNeed || formulas.length === 0) return null;

  let melhor: { score: number; formula: FormulaSugerida } | null = null;

  for (const formula of formulas) {
    const p = formula.percentual_p2o5 / 100;
    const k = formula.percentual_k2o / 100;
    const s = formula.percentual_so4 / 100;
    if (p <= 0 && k <= 0 && s <= 0) continue;

    const candidates: number[] = [];
    if (necessidades.p2o5 > 0 && p > 0) candidates.push(necessidades.p2o5 / p);
    if (necessidades.k2o > 0 && k > 0) candidates.push(necessidades.k2o / k);
    if (necessidades.so4 > 0 && s > 0) candidates.push(necessidades.so4 / s);
    if (candidates.length === 0) continue;

    const dose = Math.max(...candidates);
    const entrega = {
      p2o5: dose * p,
      k2o: dose * k,
      so4: dose * s,
    };

    const uncovered =
      clampMin(necessidades.p2o5 - entrega.p2o5) +
      clampMin(necessidades.k2o - entrega.k2o) +
      clampMin(necessidades.so4 - entrega.so4);
    const excesso =
      clampMin(entrega.p2o5 - necessidades.p2o5) +
      clampMin(entrega.k2o - necessidades.k2o) +
      clampMin(entrega.so4 - necessidades.so4);
    const score = uncovered * 15 + excesso + dose * 0.01;

    const suggestion: FormulaSugerida = {
      id: formula.id,
      nome: formula.nome,
      dose_kg_ha: round(dose, 2),
      percentual_p2o5: formula.percentual_p2o5,
      percentual_k2o: formula.percentual_k2o,
      percentual_so4: formula.percentual_so4,
      entrega_kg_ha: {
        p2o5: round(entrega.p2o5, 2),
        k2o: round(entrega.k2o, 2),
        so4: round(entrega.so4, 2),
      },
    };

    if (!melhor || score < melhor.score) {
      melhor = { score, formula: suggestion };
    }
  }

  return melhor?.formula ?? null;
}

function toSoilInput(input: AnaliseSoloInput, parametros: ParametrosGlobais): SoilInput {
  const kValue =
    input.k_mg_dm3 > 5 ? input.k_mg_dm3 / parametros.k.mg_dm3_para_kg_ha : input.k_mg_dm3;

  return {
    kCmol: kValue,
    caCmol: input.ca_cmol_dm3,
    mgCmol: input.mg_cmol_dm3,
    pMgDm3: input.p_mg_dm3,
    sMgDm3: input.so4_mg_dm3,
    bMgDm3: input.b_mg_dm3,
    cuMgDm3: input.cu_mg_dm3,
    feMgDm3: input.fe_mg_dm3,
    znMgDm3: input.zn_mg_dm3,
    mnMgDm3: input.mn_mg_dm3,
    ctc: input.ctc_efetiva_cmol_dm3 || input.ctc_cmol_dm3 || input.ctc_ph7_cmol_dm3,
    teorArgila: input.teor_argila_percent,
    pRem: input.prem,
    materiaOrganica: input.materia_organica_percent,
    prnt: input.prnt_calcario_percent || parametros.calcio.prnt * 100,
    calcioCalcario:
      input.calcio_no_calcario_percent || parametros.calcio.garantia_ca_calcario * 100,
    magnesioCalcario:
      input.magnesio_no_calcario_percent || parametros.calcio.garantia_mg_calcario * 100,
    producaoDesejada:
      input.productividad_objetivo_bolsas_ha || parametros.producao.produtividade_padrao_bolsas_ha,
  };
}

export function calcularAnaliseSolo(
  input: AnaliseSoloInput,
  parametros: ParametrosGlobais
): ResultadoAnaliseSolo {
  const soilInput = toSoilInput(input, parametros);
  const calculated = calculateSoilRecommendations(soilInput, parametros);
  const cultura = input.cultura || parametros.producao.cultura_padrao;

  const kNutrient = calculated.nutrients.find((item) => item.symbol === "K₂O")!;
  const caNutrient = calculated.nutrients.find((item) => item.symbol === "Ca")!;
  const mgNutrient = calculated.nutrients.find((item) => item.symbol === "Mg")!;
  const pNutrient = calculated.nutrients.find((item) => item.symbol === "P₂O₅")!;
  const sNutrient = calculated.nutrients.find((item) => item.symbol === "SO₄²⁻")!;

  const formulaNeeds = {
    k2o: round(kNutrient.needKgHa, 2),
    p2o5: round(pNutrient.needKgHa, 2),
    so4: round(sNutrient.needKgHa, 2),
  };
  const necessidadeFertilizante = {
    k2o_kg_ha: formulaNeeds.k2o,
    p2o5_kg_ha: formulaNeeds.p2o5,
    so4_kg_ha: formulaNeeds.so4,
  };
  const formulaSugerida = sugerirFormula(parametros.fertilizante.formulas_opcoes, formulaNeeds);
  const manutencaoApenas =
    necessidadeFertilizante.k2o_kg_ha <= 0 &&
    necessidadeFertilizante.p2o5_kg_ha <= 0 &&
    necessidadeFertilizante.so4_kg_ha <= 0;

  const alertas: RecomendacaoAlerta[] = [];
  if (necessidadeFertilizante.k2o_kg_ha > 0) {
    alertas.push({
      id: "k-emergencial",
      tipo: "warning",
      titulo: "Correção de potássio",
      mensagem: "O potássio está abaixo do ideal e precisa correção no manejo.",
    });
  }
  if (necessidadeFertilizante.k2o_kg_ha > parametros.k.limite_tecnico_sulco_kg_ha) {
    alertas.push({
      id: "k-salinidade",
      tipo: "warning",
      titulo: "Risco de salinidade",
      mensagem:
        "A recomendação de K₂O ultrapassa o limite técnico no sulco. Divida a aplicação ou aplique a lanço.",
    });
  }
  if (manutencaoApenas) {
    alertas.push({
      id: "manutencao",
      tipo: "info",
      titulo: "Apenas manutenção",
      mensagem: "Os nutrientes principais já estão acima do nível mínimo de correção.",
    });
  }

  const equilibrio_nutricional: EquilibrioNutrienteCard[] = calculated.nutrients.map((nutrient) =>
    createCard({
      id:
        nutrient.symbol === "K₂O"
          ? "potassio"
          : nutrient.symbol === "Ca"
            ? "calcio"
            : nutrient.symbol === "Mg"
              ? "magnesio"
              : nutrient.symbol === "P₂O₅"
                ? "fosforo"
                : nutrient.symbol === "SO₄²⁻"
                  ? "enxofre"
                  : nutrient.name.toLowerCase().normalize("NFD").replace(/[^\w]+/g, ""),
      titulo: nutrient.name,
      simbolo: nutrient.symbol,
      grupo: ["K₂O", "Ca", "Mg", "P₂O₅", "SO₄²⁻"].includes(nutrient.symbol) ? "macro" : "micro",
      atual: round(nutrient.currentLevel, 2),
      unidade_atual: nutrient.unit,
      ideal: round(nutrient.idealLevel, 2),
      unidade_ideal: nutrient.unit,
      necessidade: round(nutrient.needKgHa, 2),
      unidade_necessidade: "kg/ha",
      status: nutrient.statusLabel,
      nota: nutrient.details ?? "",
      origem_planilha: nutrient.symbol === "K₂O" || nutrient.symbol === "P₂O₅" || nutrient.symbol === "SO₄²⁻" ? "Planilha2" : "Planilha2 (2)",
    })
  );

  const productionByNutrient = new Map(
    calculated.production.map((row) => [row.nutrient, row] as const)
  );
  const productionK = productionByNutrient.get("K₂O")!;
  const productionP = productionByNutrient.get("P₂O₅")!;
  const productionS = productionByNutrient.get("SO₄²⁻")!;

  const formulaBaseDose = parametros.fertilizante.dose_kg_ha;
  const formulaBaseP = round((formulaBaseDose * parametros.fertilizante.percentual_p2o5) / 100, 2);
  const formulaBaseK = round((formulaBaseDose * parametros.fertilizante.percentual_k2o) / 100, 2);
  const formulaBaseS = round((formulaBaseDose * parametros.fertilizante.percentual_so4) / 100, 2);

  const altaProdTarget = parametros.producao.produtividade_alta_bolsas_ha;
  const altaProdRows = calculateSoilRecommendations(
    { ...soilInput, producaoDesejada: altaProdTarget },
    parametros
  ).production;
  const altaProdK = altaProdRows.find((item) => item.nutrient === "K₂O")!;
  const altaProdP = altaProdRows.find((item) => item.nutrient === "P₂O₅")!;
  const altaProdS = altaProdRows.find((item) => item.nutrient === "SO₄²⁻")!;

  return {
    resumo: {
      calcario_kg_ha: round(calculated.limestone.totalLimestoneKgHa, 2),
      tipo_calcario: calculated.limestone.type === "Calcítico" ? "calcitico" : "dolomitico",
      kcl_kg_ha: round(productionK.productKgHa, 2),
      fosfato_kg_ha: round(productionP.productKgHa, 2),
      enxofre_kg_ha: round(productionS.productKgHa, 2),
      formula_recomendada:
        formulaSugerida?.nome ?? (manutencaoApenas ? "Apenas manutenção" : "Separada"),
      formula_dose_kg_ha: formulaSugerida?.dose_kg_ha ?? 0,
    },
    potassio: {
      teor_atual_mg_dm3: round(soilInput.kCmol, 3),
      alvo_mg_dm3: round(kNutrient.idealLevel, 3),
      participacao_ctc: round(safeDivide(soilInput.kCmol, soilInput.ctc) * 100, 2),
      status_participacao: kNutrient.statusLabel,
      k_kg_ha: round(soilInput.kCmol * parametros.k.mg_dm3_para_kg_ha, 2),
      k2o_kg_ha: round(productionK.soilReserveKg, 2),
      reserva_produtiva_bolsas: round(
        safeDivide(productionK.soilReserveKg, productionK.needPerBag),
        2
      ),
      necessidade_k2o_kg_ha: round(kNutrient.needKgHa, 2),
      recomendacao_kcl_kg_ha: round(productionK.productKgHa, 2),
    },
    calcio: {
      teor_atual_cmol_dm3: round(soilInput.caCmol, 3),
      alvo_cmol_dm3: round(caNutrient.idealLevel, 3),
      necessidade_cmol_dm3: round(clampMin(caNutrient.idealLevel - soilInput.caCmol), 3),
      calcario_kg_ha: round(calculated.limestone.limestoneCaKgHa, 6),
      elevacao_pos_calagem_cmol_dm3: round(soilInput.caCmol + clampMin(caNutrient.idealLevel - soilInput.caCmol), 3),
      participacao_pos_calagem: round(calculated.limestone.caParticipation, 3),
    },
    fosforo: {
      teor_atual_mg_dm3: round(soilInput.pMgDm3, 3),
      equilibrio_relativo: round(pNutrient.equilibriumPct, 2),
      ncp_estimado: round(pNutrient.idealLevel, 6),
      p2o5_livre_kg_ha: round(soilInput.pMgDm3 * parametros.fosforo.fator_objetivo, 2),
      reserva_produtiva_bolsas: round(safeDivide(productionP.soilReserveKg, productionP.needPerBag), 2),
      necessidade_p2o5_kg_ha: round(pNutrient.needKgHa, 2),
      recomendacao_produto_kg_ha: round(productionP.productKgHa, 2),
    },
    magnesio: {
      teor_atual_cmol_dm3: round(soilInput.mgCmol, 3),
      alvo_cmol_dm3: round(mgNutrient.idealLevel, 3),
      relacao_ca_mg: round(calculated.limestone.caMgRelation, 2),
      recomendacao_produto_kg_ha: round(calculated.limestone.limestoneMgKgHa, 2),
      elevacao_pos_correcao_cmol_dm3: round(soilInput.mgCmol + clampMin(mgNutrient.idealLevel - soilInput.mgCmol), 3),
      participacao_pos_correcao: round(calculated.limestone.mgParticipation, 2),
    },
    enxofre: {
      teor_atual_mg_dm3: round(soilInput.sMgDm3, 3),
      alvo_mg_dm3: round(sNutrient.idealLevel, 3),
      total_so4_kg_ha: round(productionS.soilReserveKg, 2),
      deficiencia_so4_kg_ha: round(sNutrient.needKgHa, 2),
      recomendacao_enxofre_elementar_kg_ha: round(productionS.productKgHa, 2),
      reserva_produtiva_bolsas: round(safeDivide(productionS.soilReserveKg, productionS.needPerBag), 2),
      necessidade_so4_producao_kg_ha: round(clampMin(-productionS.resultKgHa), 2),
      recomendacao_final_kg_ha: round(productionS.productKgHa, 2),
    },
    fertilizante: {
      formula: parametros.fertilizante.formula_nome,
      dose_kg_ha: round(formulaBaseDose, 2),
      p2o5_aplicado_kg_ha: formulaBaseP,
      k2o_aplicado_kg_ha: formulaBaseK,
      so4_aplicado_kg_ha: formulaBaseS,
      p2o5_aproveitavel_kg_ha: 0,
      k2o_aproveitavel_kg_ha: 0,
      so4_aproveitavel_kg_ha: 0,
      capacidade_produtiva_bolsas: {
        p2o5: round(safeDivide(productionP.soilReserveKg, productionP.needPerBag), 2),
        k2o: round(safeDivide(productionK.soilReserveKg, productionK.needPerBag), 2),
        so4: round(safeDivide(productionS.soilReserveKg, productionS.needPerBag), 2),
      },
      saldo_pos_colheita_kg_ha: {
        p2o5: round(productionP.resultKgHa, 2),
        k2o: round(productionK.resultKgHa, 2),
        so4: round(productionS.resultKgHa, 2),
      },
    },
    micros: {
      boro: {
        teor_mg_dm3: calculated.microDetails.find((item) => item.symbol === "B")!.currentLevel,
        minimo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "B")!.minLevel,
        maximo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "B")!.maxLevel,
        total_kg_ha: calculated.microDetails.find((item) => item.symbol === "B")!.totalKgHa,
        status: calculated.microDetails.find((item) => item.symbol === "B")!.statusLabel,
        recomendacao_produto_kg_ha:
          calculated.microDetails.find((item) => item.symbol === "B")!.commercialProductKgHa,
      },
      cobre: {
        teor_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Cu")!.currentLevel,
        minimo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Cu")!.minLevel,
        maximo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Cu")!.maxLevel,
        total_kg_ha: calculated.microDetails.find((item) => item.symbol === "Cu")!.totalKgHa,
        status: calculated.microDetails.find((item) => item.symbol === "Cu")!.statusLabel,
        recomendacao_produto_kg_ha:
          calculated.microDetails.find((item) => item.symbol === "Cu")!.commercialProductKgHa,
      },
      ferro: {
        teor_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Fe")!.currentLevel,
        minimo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Fe")!.minLevel,
        maximo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Fe")!.maxLevel,
        total_kg_ha: calculated.microDetails.find((item) => item.symbol === "Fe")!.totalKgHa,
        status: calculated.microDetails.find((item) => item.symbol === "Fe")!.statusLabel,
        recomendacao_produto_kg_ha:
          calculated.microDetails.find((item) => item.symbol === "Fe")!.commercialProductKgHa,
      },
      zinco: {
        teor_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Zn")!.currentLevel,
        minimo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Zn")!.minLevel,
        maximo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Zn")!.maxLevel,
        total_kg_ha: calculated.microDetails.find((item) => item.symbol === "Zn")!.totalKgHa,
        status: calculated.microDetails.find((item) => item.symbol === "Zn")!.statusLabel,
        recomendacao_produto_kg_ha:
          calculated.microDetails.find((item) => item.symbol === "Zn")!.commercialProductKgHa,
      },
      manganes: {
        teor_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Mn")!.currentLevel,
        minimo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Mn")!.minLevel,
        maximo_mg_dm3: calculated.microDetails.find((item) => item.symbol === "Mn")!.maxLevel,
        total_kg_ha: calculated.microDetails.find((item) => item.symbol === "Mn")!.totalKgHa,
        status: calculated.microDetails.find((item) => item.symbol === "Mn")!.statusLabel,
        recomendacao_produto_kg_ha:
          calculated.microDetails.find((item) => item.symbol === "Mn")!.commercialProductKgHa,
      },
    },
    materia_organica: {
      teor_atual_percent: round(soilInput.materiaOrganica, 2),
      ideal_min_percent: round(parametros.materia_organica.ideal_min_percent, 2),
      ideal_max_percent: round(parametros.materia_organica.ideal_max_percent, 2),
      equilibrio_minimo_percent: round(
        safeDivide(soilInput.materiaOrganica, parametros.materia_organica.ideal_min_percent) * 100,
        2
      ),
      indice_acentuado_percent: round(
        safeDivide(soilInput.materiaOrganica, parametros.materia_organica.ideal_max_percent) * 100,
        2
      ),
    },
    recomendacao_final: {
      cultura,
      manutencao_apenas: manutencaoApenas,
      deficit_nominal: {
        k_mg_dm3: round(clampMin(kNutrient.idealLevel - soilInput.kCmol), 3),
        p2o5_kg_ha: round(pNutrient.needKgHa, 2),
        so4_kg_ha: round(sNutrient.needKgHa, 2),
      },
      necessidade_fertilizante: necessidadeFertilizante,
      formula_sugerida: formulaSugerida,
    },
    alta_produtividade: {
      alvo_bolsas_ha: round(altaProdTarget, 2),
      necessidade_k2o_kg_ha: round(clampMin(-altaProdK.resultKgHa), 2),
      necessidade_p2o5_kg_ha: round(clampMin(-altaProdP.resultKgHa), 2),
      necessidade_so4_kg_ha: round(clampMin(-altaProdS.resultKgHa), 2),
      disponibilidade_k2o_kg_ha: round(altaProdK.soilReserveKg, 2),
      disponibilidade_p2o5_kg_ha: round(altaProdP.soilReserveKg, 2),
      disponibilidade_so4_kg_ha: round(altaProdS.soilReserveKg, 2),
      saldo_k2o_kg_ha: round(altaProdK.resultKgHa, 2),
      saldo_p2o5_kg_ha: round(altaProdP.resultKgHa, 2),
      saldo_so4_kg_ha: round(altaProdS.resultKgHa, 2),
    },
    equilibrio_nutricional,
    calagem_resumo: {
      total_calcario_kg_ha: round(calculated.limestone.totalLimestoneKgHa, 2),
      tipo: calculated.limestone.type === "Calcítico" ? "calcitico" : "dolomitico",
      relacao_ca_mg: round(calculated.limestone.caMgRelation, 2),
      ca_necessario_cmol_dm3: round(clampMin(caNutrient.idealLevel - soilInput.caCmol), 2),
      mg_necessario_kg_ha: round(calculated.limestone.needMgKgHa, 2),
      participacao_ca_ctc_percent: round(calculated.limestone.caParticipation, 2),
      origem_planilha: "Planilha2 (2)",
    },
    extracao_producao: {
      cultura,
      linhas: calculated.production.map((row) => ({
        nutriente: row.nutrient,
        reserva_solo_kg: round(row.soilReserveKg, 2),
        necessidade_por_bolsa_kg: round(row.needPerBag, 2),
        total_necessario_kg: round(row.totalNeedKg, 2),
        saldo_kg_ha: round(row.resultKgHa, 2),
        produto_kg_ha: round(row.productKgHa, 2),
        origem_planilha: "Planilha2",
      })),
    },
    alertas,
    indicadores: [
      { label: "K necessário", value: round(kNutrient.needKgHa, 2), unit: "kg/ha" },
      { label: "P necessário", value: round(pNutrient.needKgHa, 2), unit: "kg/ha" },
      { label: "S necessário", value: round(sNutrient.needKgHa, 2), unit: "kg/ha" },
      { label: "Calcário total", value: round(calculated.limestone.totalLimestoneKgHa, 2), unit: "kg/ha" },
      { label: "Relação Ca/Mg", value: round(calculated.limestone.caMgRelation, 2), unit: "" },
      { label: "Produtividade alvo", value: round(soilInput.producaoDesejada, 0), unit: "bolsas/ha" },
      { label: "MO", value: round(soilInput.materiaOrganica, 2), unit: "%" },
    ],
  };
}

import { DEFAULT_PARAMETROS_GLOBAIS } from "./defaults";
import type { ParametrosGlobais } from "./types";

export interface SoilInput {
  kCmol: number;
  caCmol: number;
  mgCmol: number;
  pMgDm3: number;
  sMgDm3: number;
  bMgDm3: number;
  cuMgDm3: number;
  feMgDm3: number;
  znMgDm3: number;
  mnMgDm3: number;
  ctc: number;
  teorArgila: number;
  pRem: number;
  materiaOrganica: number;
  prnt: number;
  calcioCalcario: number;
  magnesioCalcario: number;
  producaoDesejada: number;
}

export interface NutrientResult {
  name: string;
  symbol: string;
  unit: string;
  idealLevel: number;
  currentLevel: number;
  equilibriumPct: number;
  needKgHa: number;
  status: "excess" | "adequate" | "deficient" | "critical";
  statusLabel: string;
  details?: string;
}

export interface LimestoneResult {
  needCaKgHa: number;
  needMgKgHa: number;
  limestoneCaKgHa: number;
  limestoneMgKgHa: number;
  totalLimestoneKgHa: number;
  caParticipation: number;
  mgParticipation: number;
  caMgRelation: number;
  type: string;
}

export interface ProductionResult {
  nutrient: string;
  soilReserveKg: number;
  needPerBag: number;
  totalNeedKg: number;
  resultKgHa: number;
  productKgHa: number;
  productName: string;
}

export interface MicroDetailResult {
  name: string;
  symbol: string;
  currentLevel: number;
  idealLevel: number;
  minLevel: number;
  maxLevel: number;
  totalKgHa: number;
  needKgHa: number;
  equilibriumPct: number;
  commercialProductKgHa: number;
  concentration: number;
  status: "excess" | "adequate" | "deficient" | "critical";
  statusLabel: string;
}

export interface SoilResults {
  nutrients: NutrientResult[];
  limestone: LimestoneResult;
  production: ProductionResult[];
  microDetails: MicroDetailResult[];
}

function getStatus(equilibriumPct: number): {
  status: NutrientResult["status"];
  label: string;
} {
  if (equilibriumPct >= 120) return { status: "excess", label: "Excesso" };
  if (equilibriumPct >= 80) return { status: "adequate", label: "Adequado" };
  if (equilibriumPct >= 50) return { status: "deficient", label: "Deficiente" };
  return { status: "critical", label: "Crítico" };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function getPIdeal(teorArgila: number, parametros: ParametrosGlobais): number {
  if (teorArgila <= parametros.fosforo.teor_argila_baixo) {
    return parametros.fosforo.retencao_argila_muito_baixa;
  }
  if (teorArgila <= parametros.fosforo.teor_argila_medio) {
    return parametros.fosforo.retencao_argila_baixa;
  }
  if (teorArgila <= parametros.fosforo.teor_argila_alto) {
    return parametros.fosforo.retencao_argila_media;
  }
  return parametros.fosforo.retencao_argila_alta;
}

export function calculateSoilRecommendations(
  input: SoilInput,
  parametros: ParametrosGlobais = DEFAULT_PARAMETROS_GLOBAIS
): SoilResults {
  const {
    kCmol,
    caCmol,
    mgCmol,
    pMgDm3,
    sMgDm3,
    bMgDm3,
    cuMgDm3,
    feMgDm3,
    znMgDm3,
    mnMgDm3,
    ctc,
    teorArgila,
    prnt,
    calcioCalcario,
    magnesioCalcario,
    producaoDesejada,
  } = input;

  const kIdeal = parametros.k.alvo_mg_dm3;
  const kParticipation = ctc > 0 ? (kCmol / ctc) * 100 : 0;
  const kIdealParticipation = parametros.k.participacao_ctc_ideal * 100;
  const kEquilibrium = kIdeal > 0 ? (kCmol / kIdeal) * 100 : 0;
  const caIdeal = parametros.calcio.alvo_cmol_dm3;
  const kTotalKgHa =
    kCmol * parametros.k.mg_dm3_para_kg_ha * parametros.k.fator_k_para_k2o;
  const kAproveitavel = caIdeal > 0 ? kTotalKgHa * (caCmol / caIdeal) : 0;
  const kIdealKgHa =
    kIdeal * parametros.k.mg_dm3_para_kg_ha * parametros.k.fator_k_para_k2o_alvo;
  const kNeedKgHa = Math.max(0, kIdealKgHa - kAproveitavel);

  const caEquilibrium = caIdeal > 0 ? (caCmol / caIdeal) * 100 : 0;
  const caNeedCmol = Math.max(0, caIdeal - caCmol);
  const caNeedKgHa = caNeedCmol * parametros.calcio.fator_cmol_para_kg_ha;
  const caParticipation = ctc > 0 ? (caCmol / ctc) * 100 : 0;

  const mgIdeal = parametros.magnesio.alvo_cmol_dm3;
  const mgEquilibrium = mgIdeal > 0 ? (mgCmol / mgIdeal) * 100 : 0;
  const mgNeedCmol = Math.max(0, mgIdeal - mgCmol);
  const mgNeedKgHa = mgNeedCmol * parametros.calcio.fator_cmol_para_kg_ha;
  const mgParticipation = ctc > 0 ? (mgCmol / ctc) * 100 : 0;

  const caMgRelation = mgCmol > 0 ? round2(caCmol / mgCmol) : 0;
  const limestoneType =
    caMgRelation > parametros.calcio.relacao_ca_mg_limite_dolomitico
      ? "Dolomítico"
      : caMgRelation < parametros.calcio.relacao_ca_mg_limite_calcitico
        ? "Calcítico"
        : "Dolomítico";

  const limestoneCa = calcioCalcario > 0 ? caNeedKgHa / (calcioCalcario / 100) : 0;
  const limestoneMg = magnesioCalcario > 0 ? mgNeedKgHa / (magnesioCalcario / 100) : 0;
  const totalLimestoneRaw = limestoneCa + limestoneMg;
  const totalLimestone = prnt > 0 ? totalLimestoneRaw / (prnt / 100) : totalLimestoneRaw;

  const pIdeal = getPIdeal(teorArgila, parametros);
  const pEquilibrium = pIdeal > 0 ? (pMgDm3 / pIdeal) * 100 : 0;
  const pFactor = parametros.fosforo.fator_objetivo;
  const pConstEquilibrium = parametros.fosforo.constante_equilibrio_kg_ha;
  const pTotalIdealKgHa = pIdeal * pFactor;
  const pAvailableKgHa = pMgDm3 * pFactor;
  const pNeedKgHa = Math.max(0, (pIdeal - pMgDm3) * pFactor);
  const pReserveKgHa = pTotalIdealKgHa - pConstEquilibrium;

  const sIdeal = parametros.enxofre.alvo_mg_dm3;
  const sEquilibrium = sIdeal > 0 ? (sMgDm3 / sIdeal) * 100 : 0;
  const sFactor = parametros.enxofre.fator_mg_dm3_para_kg_ha;
  const sTotalKgHa = sMgDm3 * sFactor;
  const sNeedKgHa = sMgDm3 >= sIdeal ? 0 : (sIdeal - sMgDm3) * sFactor;

  const microConfigs = [
    {
      name: "Boro",
      symbol: "B",
      current: bMgDm3,
      min: parametros.micros.boro.minimo_mg_dm3,
      max: parametros.micros.boro.maximo_mg_dm3,
      factor: parametros.micros.boro.fator_mg_dm3_para_kg_ha,
      concentration: parametros.micros.concentracao_produto,
    },
    {
      name: "Cobre",
      symbol: "Cu",
      current: cuMgDm3,
      min: parametros.micros.cobre.minimo_mg_dm3,
      max: parametros.micros.cobre.maximo_mg_dm3,
      factor: parametros.micros.cobre.fator_mg_dm3_para_kg_ha,
      concentration: parametros.micros.concentracao_produto,
    },
    {
      name: "Ferro",
      symbol: "Fe",
      current: feMgDm3,
      min: parametros.micros.ferro.minimo_mg_dm3,
      max: parametros.micros.ferro.maximo_mg_dm3,
      factor: parametros.micros.ferro.fator_mg_dm3_para_kg_ha,
      concentration: parametros.micros.concentracao_produto,
    },
    {
      name: "Zinco",
      symbol: "Zn",
      current: znMgDm3,
      min: parametros.micros.zinco.minimo_mg_dm3,
      max: parametros.micros.zinco.maximo_mg_dm3,
      factor: parametros.micros.zinco.fator_mg_dm3_para_kg_ha,
      concentration: parametros.micros.concentracao_produto,
    },
    {
      name: "Manganês",
      symbol: "Mn",
      current: mnMgDm3,
      min: parametros.micros.manganes.minimo_mg_dm3,
      max: parametros.micros.manganes.maximo_mg_dm3,
      factor: parametros.micros.manganes.fator_mg_dm3_para_kg_ha,
      concentration: parametros.micros.concentracao_produto,
    },
  ];

  const microDetails: MicroDetailResult[] = microConfigs.map((micro) => {
    const ideal = micro.max;
    const equilibriumPct = ideal > 0 ? (micro.current / ideal) * 100 : 0;
    const totalKgHa = micro.current * micro.factor;
    const needRaw = Math.max(0, ideal - micro.current);
    const needKgHa = needRaw * micro.factor;
    const commercialProductKgHa =
      micro.concentration > 0 ? needKgHa / micro.concentration : 0;
    const status = getStatus(equilibriumPct);

    return {
      name: micro.name,
      symbol: micro.symbol,
      currentLevel: micro.current,
      idealLevel: ideal,
      minLevel: micro.min,
      maxLevel: micro.max,
      totalKgHa: round2(totalKgHa),
      needKgHa: round2(needKgHa),
      equilibriumPct: round2(equilibriumPct),
      commercialProductKgHa: round2(commercialProductKgHa),
      concentration: micro.concentration,
      status: status.status,
      statusLabel: status.label,
    };
  });

  const nutrients: NutrientResult[] = [
    {
      name: "Potássio",
      symbol: "K₂O",
      unit: "Cmol/dm³",
      idealLevel: kIdeal,
      currentLevel: round2(kCmol),
      equilibriumPct: round2(kEquilibrium),
      needKgHa: round2(kNeedKgHa),
      status: getStatus(kEquilibrium).status,
      statusLabel: getStatus(kEquilibrium).label,
      details: `Participação CTC: ${kParticipation.toFixed(1)}% (ideal: ${kIdealParticipation}%)`,
    },
    {
      name: "Cálcio",
      symbol: "Ca",
      unit: "Cmol/dm³",
      idealLevel: caIdeal,
      currentLevel: round2(caCmol),
      equilibriumPct: round2(caEquilibrium),
      needKgHa: round2(caNeedKgHa),
      status: getStatus(caEquilibrium).status,
      statusLabel: getStatus(caEquilibrium).label,
      details: `Participação CTC: ${caParticipation.toFixed(1)}% (ideal: 50-60%)`,
    },
    {
      name: "Magnésio",
      symbol: "Mg",
      unit: "Cmol/dm³",
      idealLevel: mgIdeal,
      currentLevel: round2(mgCmol),
      equilibriumPct: round2(mgEquilibrium),
      needKgHa: round2(mgNeedKgHa),
      status: getStatus(mgEquilibrium).status,
      statusLabel: getStatus(mgEquilibrium).label,
      details: `Participação CTC: ${mgParticipation.toFixed(1)}% (ideal: 10-20%)`,
    },
    {
      name: "Fósforo",
      symbol: "P₂O₅",
      unit: "mg/dm³",
      idealLevel: pIdeal,
      currentLevel: round2(pMgDm3),
      equilibriumPct: round2(pEquilibrium),
      needKgHa: round2(pNeedKgHa),
      status: getStatus(pEquilibrium).status,
      statusLabel: getStatus(pEquilibrium).label,
      details: `Total P₂O₅: ${round2(pTotalIdealKgHa)} kg/ha | Reserva: ${round2(pReserveKgHa)} kg/ha`,
    },
    {
      name: "Enxofre",
      symbol: "SO₄²⁻",
      unit: "mg/dm³",
      idealLevel: sIdeal,
      currentLevel: round2(sMgDm3),
      equilibriumPct: round2(sEquilibrium),
      needKgHa: round2(sNeedKgHa),
      status: getStatus(sEquilibrium).status,
      statusLabel: getStatus(sEquilibrium).label,
      details: `Total SO₄²⁻: ${round2(sTotalKgHa)} kg/ha`,
    },
    ...microDetails.map((micro) => ({
      name: micro.name,
      symbol: micro.symbol,
      unit: "mg/dm³",
      idealLevel: micro.idealLevel,
      currentLevel: micro.currentLevel,
      equilibriumPct: micro.equilibriumPct,
      needKgHa: micro.needKgHa,
      status: micro.status,
      statusLabel: micro.statusLabel,
      details:
        micro.needKgHa > 0
          ? `Produto comercial (${(micro.concentration * 100).toFixed(0)}%): ${micro.commercialProductKgHa} kg/ha`
          : `Faixa ideal: ${micro.minLevel}-${micro.maxLevel} mg/dm³`,
    })),
  ];

  const kReserve = kAproveitavel > kIdealKgHa ? round2(kAproveitavel - kIdealKgHa) : 0;
  const kPerBag = parametros.producao.k2o_por_bolsa;
  const kTotalNeed = producaoDesejada * kPerBag;
  const kResult = kReserve - kTotalNeed;
  const kProductKgHa = kResult < 0 ? round2(Math.abs(kResult) * parametros.producao.fator_kcl) : 0;

  const pPerBag = parametros.producao.p2o5_por_bolsa;
  const pTotalNeed = producaoDesejada * pPerBag;
  const pResult = pReserveKgHa - pTotalNeed;
  const pProductKgHa = round2(Math.abs(pResult) / parametros.fosforo.concentracao_produto);

  const sReserve = round2(sTotalKgHa);
  const sPerBag = parametros.producao.so4_por_bolsa;
  const sTotalNeed = producaoDesejada * sPerBag;
  const sResult = sReserve - sTotalNeed;
  const sProductKgHa = sResult < 0 ? round2(Math.abs(sResult) / parametros.enxofre.concentracao_enxofre_elementar) : 0;

  const production: ProductionResult[] = [
    {
      nutrient: "K₂O",
      soilReserveKg: round2(kReserve),
      needPerBag: kPerBag,
      totalNeedKg: round2(kTotalNeed),
      resultKgHa: round2(kResult),
      productKgHa: round2(kProductKgHa),
      productName: "KCL (60%)",
    },
    {
      nutrient: "P₂O₅",
      soilReserveKg: round2(pReserveKgHa),
      needPerBag: pPerBag,
      totalNeedKg: round2(pTotalNeed),
      resultKgHa: round2(pResult),
      productKgHa: round2(pProductKgHa),
      productName: "Fosfato (30%)",
    },
    {
      nutrient: "SO₄²⁻",
      soilReserveKg: round2(sReserve),
      needPerBag: sPerBag,
      totalNeedKg: round2(sTotalNeed),
      resultKgHa: round2(sResult),
      productKgHa: round2(sProductKgHa),
      productName: "S Elementar (90%)",
    },
  ];

  const limestone: LimestoneResult = {
    needCaKgHa: round2(caNeedKgHa),
    needMgKgHa: round2(mgNeedKgHa),
    limestoneCaKgHa: round2(limestoneCa),
    limestoneMgKgHa: round2(limestoneMg),
    totalLimestoneKgHa: round2(Math.max(0, totalLimestone)),
    caParticipation: round2(caParticipation),
    mgParticipation: round2(mgParticipation),
    caMgRelation,
    type: limestoneType,
  };

  return {
    nutrients,
    limestone,
    production,
    microDetails,
  };
}

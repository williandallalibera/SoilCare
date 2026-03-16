import { describe, expect, it } from "vitest";
import { DEFAULT_PARAMETROS_GLOBAIS } from "./defaults";
import { calculateSoilRecommendations, type SoilInput } from "./lovableEngine";

const baseInput: SoilInput = {
  kCmol: 0.6,
  caCmol: 7,
  mgCmol: 2,
  pMgDm3: 25,
  sMgDm3: 15,
  bMgDm3: 1,
  cuMgDm3: 6.6,
  feMgDm3: 39,
  znMgDm3: 12,
  mnMgDm3: 61,
  ctc: 13.5,
  teorArgila: 60,
  pRem: 22,
  materiaOrganica: 3,
  prnt: 100,
  calcioCalcario: 30,
  magnesioCalcario: 20,
  producaoDesejada: 60,
};

describe("calculateSoilRecommendations", () => {
  it("replica o motor do Lovable exatamente no cenário-base", () => {
    const result = calculateSoilRecommendations(baseInput, DEFAULT_PARAMETROS_GLOBAIS);

    const k = result.nutrients.find((item) => item.symbol === "K₂O");
    const ca = result.nutrients.find((item) => item.symbol === "Ca");
    const mg = result.nutrients.find((item) => item.symbol === "Mg");
    const p = result.nutrients.find((item) => item.symbol === "P₂O₅");
    const s = result.nutrients.find((item) => item.symbol === "SO₄²⁻");

    expect(k?.needKgHa).toBeCloseTo(113.22, 2);
    expect(ca?.needKgHa).toBeCloseTo(250, 2);
    expect(mg?.needKgHa).toBeCloseTo(250, 2);
    expect(p?.idealLevel).toBe(25);
    expect(p?.needKgHa).toBe(0);
    expect(s?.needKgHa).toBe(0);

    expect(result.limestone.limestoneCaKgHa).toBeCloseTo(833.33, 2);
    expect(result.limestone.limestoneMgKgHa).toBeCloseTo(1250, 2);
    expect(result.limestone.totalLimestoneKgHa).toBeCloseTo(2083.33, 2);
  });

  it("gera a producao do Lovable com K, P e S nas mesmas regras do snippet", () => {
    const result = calculateSoilRecommendations(baseInput, DEFAULT_PARAMETROS_GLOBAIS);

    expect(result.production[0]).toMatchObject({
      nutrient: "K₂O",
      soilReserveKg: 0,
      totalNeedKg: 78,
      resultKgHa: -78,
      productKgHa: 130,
    });
    expect(result.production[1]).toMatchObject({
      nutrient: "P₂O₅",
      soilReserveKg: 76.5,
      totalNeedKg: 72,
      resultKgHa: 4.5,
      productKgHa: 15,
    });
    expect(result.production[2]).toMatchObject({
      nutrient: "SO₄²⁻",
      soilReserveKg: 225,
      totalNeedKg: 55.8,
      resultKgHa: 169.2,
      productKgHa: 0,
    });
  });
});

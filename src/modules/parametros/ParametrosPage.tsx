import type { ReactNode } from "react";
import { FormEvent, useEffect, useState } from "react";
import { DEFAULT_PARAMETROS_GLOBAIS } from "../soil-analysis/defaults";
import {
  getActiveParametros,
  listParametroVersions,
  saveParametroVersion,
} from "../soil-analysis/repository";
import type { ParametrosGlobais, ParametroVersion } from "../soil-analysis/types";
import {
  btnPrimary,
  btnSecondary,
  classNames,
  createId,
  formatDate,
  inputCls,
  labelCls,
  toNumber,
} from "../soil-analysis/utils";
import { useI18n } from "../i18n/I18nContext";

function updateNested<T extends keyof ParametrosGlobais, K extends keyof ParametrosGlobais[T]>(
  current: ParametrosGlobais,
  section: T,
  key: K,
  value: ParametrosGlobais[T][K]
): ParametrosGlobais {
  return {
    ...current,
    [section]: {
      ...current[section],
      [key]: value,
    },
  };
}

function updateFormulaOption(
  current: ParametrosGlobais,
  formulaId: string,
  key: "nome" | "percentual_p2o5" | "percentual_k2o" | "percentual_so4",
  value: string | number
): ParametrosGlobais {
  return {
    ...current,
    fertilizante: {
      ...current.fertilizante,
      formulas_opcoes: current.fertilizante.formulas_opcoes.map((formula) =>
        formula.id === formulaId ? { ...formula, [key]: value } : formula
      ),
    },
  };
}

type MicronutrienteKey = "boro" | "cobre" | "ferro" | "zinco" | "manganes";

const MICRONUTRIENTES: Array<{ key: MicronutrienteKey; label: string }> = [
  { key: "boro", label: "Boro" },
  { key: "cobre", label: "Cobre" },
  { key: "ferro", label: "Ferro" },
  { key: "zinco", label: "Zinco" },
  { key: "manganes", label: "Manganês" },
];

const sectionCardCls = "rounded-2xl border border-gray-100 p-5 space-y-4";
const helperTextCls = "text-xs leading-relaxed text-gray-500";

function updateMicronutriente(
  current: ParametrosGlobais,
  micro: MicronutrienteKey,
  key: keyof ParametrosGlobais["micros"]["boro"],
  value: number
): ParametrosGlobais {
  return {
    ...current,
    micros: {
      ...current.micros,
      [micro]: {
        ...current.micros[micro],
        [key]: value,
      },
    },
  };
}

function ConfigSection({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={classNames(sectionCardCls, className)}>
      <div className="space-y-1">
        <h3 className="text-xs font-black uppercase tracking-widest text-gray-900">{title}</h3>
        <p className={helperTextCls}>{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ParametrosPage() {
  const { t } = useI18n();
  const [active, setActive] = useState<ParametroVersion | null>(null);
  const [versions, setVersions] = useState<ParametroVersion[]>([]);
  const [versionLabel, setVersionLabel] = useState("Revisão manual");
  const [form, setForm] = useState<ParametrosGlobais>(DEFAULT_PARAMETROS_GLOBAIS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [activeRow, versionsRows] = await Promise.all([
        getActiveParametros(),
        listParametroVersions(),
      ]);
      setActive(activeRow);
      setVersions(versionsRows);
      setForm(activeRow.parametros);
      setVersionLabel(`Revisão ${new Date().toLocaleDateString("pt-BR")}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveParametroVersion({
        version_label: versionLabel.trim() || `Revisão ${new Date().toISOString()}`,
        parametros: form,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[0.8fr_1.35fr] gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {t("parametros.versions")}
            </h1>
          </div>
          <div className="p-4 space-y-3 max-h-[78vh] overflow-auto">
            {loading && (
              <div className="p-8 text-center text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2" />
                {t("parametros.loading")}
              </div>
            )}
            {!loading &&
              versions.map((row) => (
                <article
                  key={row.id}
                  className={classNames(
                    "rounded-2xl border p-4",
                    row.is_active ? "border-agro-primary bg-agro-primary/[0.03]" : "border-gray-100"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900">{row.version_label}</p>
                      <p className="text-xs text-gray-500 mt-1">{formatDate(row.created_at)}</p>
                    </div>
                    {row.is_active && (
                      <span className="px-2 py-1 rounded-full bg-green-100 text-green-700 text-[10px] font-bold uppercase tracking-wide">
                        {t("parametros.active")}
                      </span>
                    )}
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {t("parametros.globals")}
              </h2>
              <p className="text-sm text-gray-500">
                {t("parametros.globalsHelp")}
              </p>
            </div>
            {active && (
              <span className="inline-flex items-center px-3 py-2 rounded-xl bg-gray-50 text-xs font-bold text-gray-500">
                {t("parametros.active")}: {active.version_label}
              </span>
            )}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div>
              <label className={labelCls}>{t("parametros.newVersionLabel")}</label>
              <input
                className={inputCls}
                value={versionLabel}
                onChange={(event) => setVersionLabel(event.target.value)}
                required
              />
            </div>

            <div className="rounded-2xl border border-stone-300 bg-stone-100 px-4 py-3 text-sm text-agro-primary">
              {t("parametros.banner")}
            </div>

            <div className="grid lg:grid-cols-2 gap-6">
              <ConfigSection
                title="Potássio"
                description="Controla conversão do teor do solo, alvo técnico e recomendação corretiva de K₂O."
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Conversão mg/dm³ → kg/ha</label>
                    <input
                      className={inputCls}
                      value={form.k.mg_dm3_para_kg_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(form, "k", "mg_dm3_para_kg_ha", toNumber(event.target.value))
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fator K → K₂O atual</label>
                    <input
                      className={inputCls}
                      value={form.k.fator_k_para_k2o}
                      onChange={(event) =>
                        setForm(
                          updateNested(form, "k", "fator_k_para_k2o", toNumber(event.target.value))
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fator K → K₂O alvo</label>
                    <input
                      className={inputCls}
                      value={form.k.fator_k_para_k2o_alvo}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "k",
                            "fator_k_para_k2o_alvo",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Alvo K</label>
                    <input
                      className={inputCls}
                      value={form.k.alvo_mg_dm3}
                      onChange={(event) =>
                        setForm(updateNested(form, "k", "alvo_mg_dm3", toNumber(event.target.value)))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Participação ideal</label>
                    <input
                      className={inputCls}
                      value={form.k.participacao_ctc_ideal}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "k",
                            "participacao_ctc_ideal",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Limite técnico no sulco</label>
                    <input
                      className={inputCls}
                      value={form.k.limite_tecnico_sulco_kg_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "k",
                            "limite_tecnico_sulco_kg_ha",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection
                title="Cálcio, Magnésio e Calagem"
                description="Define metas de Ca e Mg, características do calcário e o critério de escolha entre corretivo calcítico e dolomítico."
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Alvo Ca</label>
                    <input
                      className={inputCls}
                      value={form.calcio.alvo_cmol_dm3}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "alvo_cmol_dm3",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Alvo Mg</label>
                    <input
                      className={inputCls}
                      value={form.magnesio.alvo_cmol_dm3}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "magnesio",
                            "alvo_cmol_dm3",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Garantia Ca</label>
                    <input
                      className={inputCls}
                      value={form.calcio.garantia_ca_calcario}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "garantia_ca_calcario",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Garantia Mg</label>
                    <input
                      className={inputCls}
                      value={form.calcio.garantia_mg_calcario}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "garantia_mg_calcario",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>PRNT</label>
                    <input
                      className={inputCls}
                      value={form.calcio.prnt}
                      onChange={(event) =>
                        setForm(updateNested(form, "calcio", "prnt", toNumber(event.target.value)))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fator cmol → kg/ha</label>
                    <input
                      className={inputCls}
                      value={form.calcio.fator_cmol_para_kg_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "fator_cmol_para_kg_ha",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Limite calcítico (Ca/Mg)</label>
                    <input
                      className={inputCls}
                      value={form.calcio.relacao_ca_mg_limite_calcitico}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "relacao_ca_mg_limite_calcitico",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Limite dolomítico (Ca/Mg)</label>
                    <input
                      className={inputCls}
                      value={form.calcio.relacao_ca_mg_limite_dolomitico}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "calcio",
                            "relacao_ca_mg_limite_dolomitico",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection
                title="Fósforo e Enxofre"
                description="Reúne a leitura de argila, retenção e fatores de conversão usados para correção e manutenção de P e S."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Fósforo</h4>
                      <p className={helperTextCls}>Faixas de argila e retenção definem o alvo ideal de P₂O₅.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelCls}>Fator P mg/dm³ → kg/ha</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.fator_objetivo}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "fator_objetivo",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Equilíbrio constante (kg/ha)</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.constante_equilibrio_kg_ha}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "constante_equilibrio_kg_ha",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Argila baixa (%)</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.teor_argila_baixo}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "teor_argila_baixo",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Argila média (%)</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.teor_argila_medio}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "teor_argila_medio",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Argila alta (%)</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.teor_argila_alto}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "teor_argila_alto",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Concentração do fosfato</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.concentracao_produto}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "concentracao_produto",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Retenção muito baixa</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.retencao_argila_muito_baixa}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "retencao_argila_muito_baixa",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Retenção baixa</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.retencao_argila_baixa}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "retencao_argila_baixa",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Retenção média</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.retencao_argila_media}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "retencao_argila_media",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Retenção alta</label>
                        <input
                          className={inputCls}
                          value={form.fosforo.retencao_argila_alta}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "fosforo",
                                "retencao_argila_alta",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-xs font-black uppercase tracking-widest text-gray-900">Enxofre</h4>
                      <p className={helperTextCls}>Esses valores definem o alvo do solo e a conversão para recomendação corretiva.</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <label className={labelCls}>Alvo SO₄</label>
                        <input
                          className={inputCls}
                          value={form.enxofre.alvo_mg_dm3}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "enxofre",
                                "alvo_mg_dm3",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Fator mg/dm³ → kg/ha</label>
                        <input
                          className={inputCls}
                          value={form.enxofre.fator_mg_dm3_para_kg_ha}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "enxofre",
                                "fator_mg_dm3_para_kg_ha",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>Concentração enxofre elementar</label>
                        <input
                          className={inputCls}
                          value={form.enxofre.concentracao_enxofre_elementar}
                          onChange={(event) =>
                            setForm(
                              updateNested(
                                form,
                                "enxofre",
                                "concentracao_enxofre_elementar",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection
                title="Produção e Fórmula Base"
                description="Define a meta produtiva padrão e a fórmula base usada nas leituras de apoio do relatório."
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Cultura padrão</label>
                    <input
                      className={inputCls}
                      value={form.producao.cultura_padrao}
                      onChange={(event) =>
                        setForm(
                          updateNested(form, "producao", "cultura_padrao", event.target.value)
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Produtividade padrão</label>
                    <input
                      className={inputCls}
                      value={form.producao.produtividade_padrao_bolsas_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "produtividade_padrao_bolsas_ha",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Alta produtividade</label>
                    <input
                      className={inputCls}
                      value={form.producao.produtividade_alta_bolsas_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "produtividade_alta_bolsas_ha",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>K₂O por bolsa</label>
                    <input
                      className={inputCls}
                      value={form.producao.k2o_por_bolsa}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "k2o_por_bolsa",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>P₂O₅ por bolsa</label>
                    <input
                      className={inputCls}
                      value={form.producao.p2o5_por_bolsa}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "p2o5_por_bolsa",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SO₄ por bolsa</label>
                    <input
                      className={inputCls}
                      value={form.producao.so4_por_bolsa}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "so4_por_bolsa",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Fator KCl</label>
                    <input
                      className={inputCls}
                      value={form.producao.fator_kcl}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "producao",
                            "fator_kcl",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Nome da fórmula</label>
                    <input
                      className={inputCls}
                      value={form.fertilizante.formula_nome}
                      onChange={(event) =>
                        setForm(updateNested(form, "fertilizante", "formula_nome", event.target.value))
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Dose da fórmula</label>
                    <input
                      className={inputCls}
                      value={form.fertilizante.dose_kg_ha}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "fertilizante",
                            "dose_kg_ha",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>P₂O₅ base (%)</label>
                    <input
                      className={inputCls}
                      value={form.fertilizante.percentual_p2o5}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "fertilizante",
                            "percentual_p2o5",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>K₂O base (%)</label>
                    <input
                      className={inputCls}
                      value={form.fertilizante.percentual_k2o}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "fertilizante",
                            "percentual_k2o",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                  <div>
                    <label className={labelCls}>SO₄ base (%)</label>
                    <input
                      className={inputCls}
                      value={form.fertilizante.percentual_so4}
                      onChange={(event) =>
                        setForm(
                          updateNested(
                            form,
                            "fertilizante",
                            "percentual_so4",
                            toNumber(event.target.value)
                          )
                        )
                      }
                    />
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection
                title="Fórmulas Comerciais"
                description="Cadastre as misturas que o sistema pode sugerir na recomendação final. Informe o nome da fórmula e os percentuais garantidos."
                className="lg:col-span-2"
              >
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() =>
                      setForm({
                        ...form,
                        fertilizante: {
                          ...form.fertilizante,
                          formulas_opcoes: [
                            ...form.fertilizante.formulas_opcoes,
                            {
                              id: createId("formula"),
                              nome: "Nova fórmula",
                              percentual_p2o5: 0,
                              percentual_k2o: 0,
                              percentual_so4: 0,
                            },
                          ],
                        },
                      })
                    }
                  >
                    <i className="fas fa-plus" />
                    Adicionar
                  </button>
                </div>
                <div className="space-y-3">
                  {form.fertilizante.formulas_opcoes.map((formula) => (
                    <div
                      key={formula.id}
                      className="grid gap-3 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-[repeat(4,minmax(0,1fr))_auto]"
                    >
                      <div>
                        <label className={labelCls}>Nome da fórmula</label>
                        <input
                          className={inputCls}
                          placeholder="Ex.: 00-20-20"
                          value={formula.nome}
                          onChange={(event) =>
                            setForm(updateFormulaOption(form, formula.id, "nome", event.target.value))
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>P₂O₅ (%)</label>
                        <input
                          className={inputCls}
                          placeholder="Ex.: 20"
                          value={formula.percentual_p2o5}
                          onChange={(event) =>
                            setForm(
                              updateFormulaOption(
                                form,
                                formula.id,
                                "percentual_p2o5",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>K₂O (%)</label>
                        <input
                          className={inputCls}
                          placeholder="Ex.: 20"
                          value={formula.percentual_k2o}
                          onChange={(event) =>
                            setForm(
                              updateFormulaOption(
                                form,
                                formula.id,
                                "percentual_k2o",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <div>
                        <label className={labelCls}>SO₄ (%)</label>
                        <input
                          className={inputCls}
                          placeholder="Ex.: 6"
                          value={formula.percentual_so4}
                          onChange={(event) =>
                            setForm(
                              updateFormulaOption(
                                form,
                                formula.id,
                                "percentual_so4",
                                toNumber(event.target.value)
                              )
                            )
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className={classNames(btnSecondary, "self-end")}
                        onClick={() =>
                          setForm({
                            ...form,
                            fertilizante: {
                              ...form.fertilizante,
                              formulas_opcoes: form.fertilizante.formulas_opcoes.filter(
                                (current) => current.id !== formula.id
                              ),
                            },
                          })
                        }
                      >
                        <i className="fas fa-trash" />
                      </button>
                    </div>
                  ))}
                </div>
              </ConfigSection>

              <ConfigSection
                title="Micronutrientes"
                description="Configure a concentração do produto comercial e a faixa desejada de cada micronutriente no solo."
                className="lg:col-span-2"
              >
                <div className="max-w-sm">
                  <label className={labelCls}>Concentração do produto</label>
                  <input
                    className={inputCls}
                    value={form.micros.concentracao_produto}
                    onChange={(event) =>
                      setForm(
                        updateNested(
                          form,
                          "micros",
                          "concentracao_produto",
                          toNumber(event.target.value)
                        )
                      )
                    }
                  />
                </div>
                <div className="space-y-3">
                  <div className="grid gap-3 text-xs font-bold uppercase tracking-wide text-gray-500 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]">
                    <span>Nutriente</span>
                    <span>Mínimo</span>
                    <span>Máximo</span>
                    <span>Fator mg/dm³ → kg/ha</span>
                  </div>
                  {MICRONUTRIENTES.map((micro) => (
                    <div
                      key={micro.key}
                      className="grid gap-3 rounded-2xl border border-gray-100 p-4 md:grid-cols-[1.2fr_repeat(3,minmax(0,1fr))]"
                    >
                      <div className="flex items-center font-bold text-gray-900">{micro.label}</div>
                      <input
                        className={inputCls}
                        value={form.micros[micro.key].minimo_mg_dm3}
                        onChange={(event) =>
                          setForm(
                            updateMicronutriente(
                              form,
                              micro.key,
                              "minimo_mg_dm3",
                              toNumber(event.target.value)
                            )
                          )
                        }
                      />
                      <input
                        className={inputCls}
                        value={form.micros[micro.key].maximo_mg_dm3}
                        onChange={(event) =>
                          setForm(
                            updateMicronutriente(
                              form,
                              micro.key,
                              "maximo_mg_dm3",
                              toNumber(event.target.value)
                            )
                          )
                        }
                      />
                      <input
                        className={inputCls}
                        value={form.micros[micro.key].fator_mg_dm3_para_kg_ha}
                        onChange={(event) =>
                          setForm(
                            updateMicronutriente(
                              form,
                              micro.key,
                              "fator_mg_dm3_para_kg_ha",
                              toNumber(event.target.value)
                            )
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              </ConfigSection>
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnPrimary} disabled={saving}>
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                {t("parametros.publish")}
              </button>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setForm(active?.parametros ?? DEFAULT_PARAMETROS_GLOBAIS)}
              >
                <i className="fas fa-undo" />
                {t("parametros.restore")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

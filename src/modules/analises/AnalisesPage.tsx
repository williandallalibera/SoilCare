import type { ReactNode } from "react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { useI18n } from "../i18n/I18nContext";
import { gerarPdfAnaliseSolo } from "./pdfAnalise";
import { calcularAnaliseSolo } from "../soil-analysis/engine";
import {
  getActiveParametros,
  listAnalises,
  listAreas,
  listClientes,
  saveAnalise,
} from "../soil-analysis/repository";
import type {
  AnaliseSolo,
  AnaliseSoloInput,
  Area,
  Cliente,
  ParametroVersion,
  ResultadoAnaliseSolo,
} from "../soil-analysis/types";
import {
  btnPrimary,
  btnSecondary,
  buildAnalysisCode,
  classNames,
  formatDate,
  formatNumber,
  inputCls,
  labelCls,
  toNumber,
} from "../soil-analysis/utils";

const formSectionCls = "rounded-[24px] border border-stone-200 bg-white p-5 shadow-sm";
const fieldShellCls =
  "mt-2 flex items-center gap-3 rounded-2xl border border-stone-300 bg-stone-50 px-4 py-3 focus-within:border-agro-primary focus-within:bg-white";

const emptyForm = (): AnaliseSoloInput => ({
  codigo_analise: buildAnalysisCode(),
  laboratorio: "",
  controle_laboratorio: "",
  amostra_identificacao: "",
  profundidade_quimica_cm: "0-15",
  fecha_muestreo: new Date().toISOString().slice(0, 10),
  fecha_reporte: new Date().toISOString().slice(0, 10),
  area_total_ha: 0,
  cultura: "Soja",
  productividad_objetivo_bolsas_ha: 60,
  prnt_calcario_percent: 0,
  calcio_no_calcario_percent: 0,
  magnesio_no_calcario_percent: 0,
  k_mg_dm3: 0,
  ctc_cmol_dm3: 0,
  ctc_ph7_cmol_dm3: 0,
  ctc_efetiva_cmol_dm3: 0,
  ca_cmol_dm3: 0,
  aluminio_cmol_dm3: 0,
  h_al_cmol_dm3: 0,
  soma_bases_cmol_dm3: 0,
  p_mg_dm3: 0,
  ncp_mg_dm3: 0,
  fosforo_relativo_percent: 0,
  teor_argila_percent: 0,
  areia_percent: 0,
  silte_percent: 0,
  classificacao_solo_tipo: "",
  agua_disponivel_mm_cm: 0,
  prem: 0,
  mg_cmol_dm3: 0,
  so4_mg_dm3: 0,
  b_mg_dm3: 0,
  cu_mg_dm3: 0,
  fe_mg_dm3: 0,
  zn_mg_dm3: 0,
  mn_mg_dm3: 0,
  carbono_g_dm3: 0,
  materia_organica_percent: 0,
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
});

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(150, value));
}

function statusCls(tone: "green" | "orange" | "red"): string {
  if (tone === "green") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (tone === "orange") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-red-200 bg-red-50 text-red-700";
}

function barCls(tone: "green" | "orange" | "red"): string {
  if (tone === "green") return "bg-emerald-500";
  if (tone === "orange") return "bg-amber-500";
  return "bg-red-500";
}

function SectionHeader({
  icon,
  title,
  helper,
}: {
  icon: string;
  title: string;
  helper?: string;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-agro-primary">
          <i className={`fas ${icon}`} />
        </div>
        <div>
          <h3 className="text-lg font-black text-gray-900">{title}</h3>
          {helper && <p className="text-sm text-gray-500">{helper}</p>}
        </div>
      </div>
    </div>
  );
}

function InputMetric({
  label,
  symbol,
  unit,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  symbol?: string;
  unit: string;
  value: string | number;
  placeholder?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-stone-600">
        {label}
        {symbol ? ` (${symbol})` : ""}
      </label>
      <div className={fieldShellCls}>
        <input
          className="w-full bg-transparent text-lg font-semibold text-gray-900 outline-none"
          inputMode="decimal"
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
        <span className="shrink-0 text-xs font-semibold text-stone-500">{unit}</span>
      </div>
    </div>
  );
}

function SelectField({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-stone-600">{label}</label>
      <select className={classNames(inputCls, "mt-2 bg-stone-50")} value={value} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="text-sm font-semibold text-stone-600">{label}</label>
      <input
        type={type}
        className={classNames(inputCls, "mt-2 bg-stone-50")}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function ResultValue({
  value,
  unit,
}: {
  value: number | null | undefined;
  unit: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return <span className="font-black text-gray-900">-</span>;
  }

  return (
    <span className="font-black text-gray-900">
      {formatNumber(value, 1)} <span className="text-xs font-semibold text-stone-500">{unit}</span>
    </span>
  );
}

function NeedValue({
  value,
  unit,
}: {
  value: number | null | undefined;
  unit: string;
}) {
  if (value === null || value === undefined || Number.isNaN(value) || value <= 0) {
    return <span className="font-black text-stone-400">-</span>;
  }

  return (
    <span className="font-black text-amber-700">
      {formatNumber(value, 1)} <span className="text-xs font-semibold">{unit}</span>
    </span>
  );
}

function BalanceCard({
  title,
  symbol,
  actual,
  actualUnit,
  ideal,
  idealUnit,
  need,
  needUnit,
  note,
  level,
}: {
  title: string;
  symbol: string;
  actual: number;
  actualUnit: string;
  ideal: number;
  idealUnit: string;
  need: number;
  needUnit: string;
  note: string;
  level: { label: string; tone: "green" | "orange" | "red" };
}) {
  const progress = clampPercent((actual / (ideal || 1)) * 100);

  return (
    <article className="rounded-[22px] border border-stone-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-base font-black text-gray-900">{title}</h4>
          <p className="text-xs font-semibold text-stone-500">{symbol}</p>
        </div>
        <span className={classNames("inline-flex items-center rounded-full border px-3 py-1 text-xs font-black", statusCls(level.tone))}>
          <i className={classNames("fas mr-1.5", level.tone === "green" ? "fa-check" : level.tone === "orange" ? "fa-arrow-up" : "fa-triangle-exclamation")} />
          {level.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div>
          <p className="text-xs text-stone-500">Atual</p>
          <p className="mt-1"><ResultValue value={actual} unit={actualUnit} /></p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Ideal</p>
          <p className="mt-1"><ResultValue value={ideal} unit={idealUnit} /></p>
        </div>
        <div>
          <p className="text-xs text-stone-500">Necessidade</p>
          <p className="mt-1"><NeedValue value={need} unit={needUnit} /></p>
        </div>
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold text-stone-500">
          <span>0%</span>
          <span>{formatNumber(progress, 1)}%</span>
          <span>150%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-stone-100">
          <div className={classNames("h-full rounded-full", barCls(level.tone))} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-stone-500">{note}</p>
    </article>
  );
}

function SummaryMetric({
  title,
  value,
  subtitle,
  accent = false,
}: {
  title: string;
  value: string;
  subtitle: string;
  accent?: boolean;
}) {
  return (
    <div className="text-center">
      <p className="text-xs text-stone-500">{title}</p>
      <p className={classNames("mt-1 text-3xl font-black", accent ? "text-agro-primary" : "text-gray-900")}>{value}</p>
      <p className="text-xs text-stone-500">{subtitle}</p>
    </div>
  );
}

export function AnalisesPage() {
  const { perfil } = useAuth();
  const { locale, t } = useI18n();
  const [rows, setRows] = useState<AnaliseSolo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [parametros, setParametros] = useState<ParametroVersion | null>(null);
  const [editing, setEditing] = useState<AnaliseSolo | null>(null);
  const [selectedClient, setSelectedClient] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [form, setForm] = useState<AnaliseSoloInput>(emptyForm);
  const [numericDrafts, setNumericDrafts] = useState<
    Partial<Record<keyof AnaliseSoloInput, string>>
  >({});
  const [clienteId, setClienteId] = useState("");
  const [areaId, setAreaId] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const [analises, clientesRows, areasRows, parametrosAtivos] = await Promise.all([
        listAnalises(),
        listClientes(),
        listAreas(),
        getActiveParametros(),
      ]);
      setRows(analises);
      setClientes(clientesRows.filter((row) => row.estado === "activo"));
      setAreas(areasRows.filter((row) => row.estado === "activo"));
      setParametros(parametrosAtivos);
      if (!clienteId && clientesRows[0]) {
        setClienteId(clientesRows[0].id);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    if (!parametros || editing) return;

    setForm((current) => ({
      ...current,
      cultura: current.cultura || parametros.parametros.producao.cultura_padrao,
      productividad_objetivo_bolsas_ha:
        current.productividad_objetivo_bolsas_ha ||
        parametros.parametros.producao.produtividade_padrao_bolsas_ha,
      prnt_calcario_percent:
        current.prnt_calcario_percent || parametros.parametros.calcio.prnt * 100,
      calcio_no_calcario_percent:
        current.calcio_no_calcario_percent ||
        parametros.parametros.calcio.garantia_ca_calcario * 100,
      magnesio_no_calcario_percent:
        current.magnesio_no_calcario_percent ||
        parametros.parametros.calcio.garantia_mg_calcario * 100,
    }));
  }, [editing, parametros]);

  const filteredRows = useMemo(() => {
    if (!selectedClient) return rows;
    return rows.filter((row) => row.cliente_id === selectedClient);
  }, [rows, selectedClient]);

  const availableAreas = useMemo(
    () => areas.filter((row) => row.cliente_id === (clienteId || clientes[0]?.id)),
    [areas, clienteId, clientes]
  );

  useEffect(() => {
    if (!areaId && availableAreas[0]) {
      setAreaId(availableAreas[0].id);
    }
  }, [availableAreas, areaId]);

  const clientMap = useMemo(
    () => Object.fromEntries(clientes.map((cliente) => [cliente.id, cliente.nombre])),
    [clientes]
  );
  const areaMap = useMemo(
    () => Object.fromEntries(areas.map((area) => [area.id, area.nombre])),
    [areas]
  );

  const setNumberField = (field: keyof AnaliseSoloInput, value: string) => {
    setNumericDrafts((current) => ({ ...current, [field]: value }));

    const normalized = value.replace(",", ".").trim();
    if (
      !normalized ||
      normalized === "-" ||
      normalized === "." ||
      normalized === "," ||
      normalized === "-."
    ) {
      setForm((current) => ({ ...current, [field]: 0 }));
      return;
    }

    const parsed = Number(normalized);
    if (Number.isFinite(parsed)) {
      setForm((current) => ({ ...current, [field]: parsed }));
    }
  };

  const setTextField = (field: keyof AnaliseSoloInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const getNumericFieldValue = (field: keyof AnaliseSoloInput) => {
    const draft = numericDrafts[field];
    if (draft !== undefined) return draft;

    const value = form[field];
    if (typeof value !== "number") return "";
    return value === 0 ? "" : String(value);
  };

  const previewResult = useMemo(() => {
    if (!parametros) return null;
    return calcularAnaliseSolo(form, parametros.parametros);
  }, [form, parametros]);

  const preparedInput = useMemo(
    () => ({
      ...form,
      ctc_cmol_dm3: form.ctc_efetiva_cmol_dm3 || form.ctc_cmol_dm3,
    }),
    [form]
  );

  const canGeneratePdf =
    Boolean(editing?.id) &&
    Boolean(previewResult) &&
    Boolean(clienteId) &&
    Boolean(areaId) &&
    !generatingPdf &&
    !saving;

  const essentialsReady = useMemo(
    () =>
      Boolean(
        clienteId &&
          areaId &&
          form.ca_cmol_dm3 > 0 &&
          form.mg_cmol_dm3 > 0 &&
          form.k_mg_dm3 > 0 &&
          form.p_mg_dm3 > 0 &&
          form.prem > 0 &&
          form.teor_argila_percent > 0 &&
          form.so4_mg_dm3 > 0 &&
          (form.ctc_efetiva_cmol_dm3 > 0 || form.ctc_cmol_dm3 > 0)
      ),
    [areaId, clienteId, form]
  );

  const balanceCards = useMemo(() => {
    if (!previewResult) return [];
    return previewResult.equilibrio_nutricional.map((card) => ({
      title: card.titulo,
      symbol: card.simbolo,
      actual: card.atual,
      actualUnit: card.unidade_atual,
      ideal: card.ideal,
      idealUnit: card.unidade_ideal,
      need: card.necessidade,
      needUnit: card.unidade_necessidade,
      note: card.nota,
      level:
        card.status === "Adequado"
          ? { label: "Adequado", tone: "green" as const }
          : card.status === "Excesso"
            ? { label: "Excesso", tone: "orange" as const }
            : card.status === "Crítico"
              ? { label: "Crítico", tone: "red" as const }
              : { label: "Deficiente", tone: "red" as const },
    }));
  }, [previewResult]);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm());
    setNumericDrafts({});
    setClienteId(clientes[0]?.id ?? "");
    setAreaId(areas.find((row) => row.cliente_id === clientes[0]?.id)?.id ?? "");
  };

  const handleEdit = (row: AnaliseSolo) => {
    setEditing(row);
    setClienteId(row.cliente_id);
    setAreaId(row.area_id);
    setForm(row.input);
    setNumericDrafts({});
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!parametros || !previewResult) return;

    setSaving(true);
    try {
      const saved = await saveAnalise({
        id: editing?.id,
        cliente_id: clienteId,
        area_id: areaId,
        parametro_version_id: parametros.id,
        input: preparedInput,
        resultado: previewResult,
        created_by: perfil?.id ?? null,
      });
      await load();
      setEditing(saved);
      setClienteId(saved.cliente_id);
      setAreaId(saved.area_id);
      setForm(saved.input);
      setNumericDrafts({});
    } finally {
      setSaving(false);
    }
  };

  const handleGeneratePdf = async () => {
    if (!canGeneratePdf || !editing) return;

    setGeneratingPdf(true);
    try {
      await gerarPdfAnaliseSolo({
        analise: {
          id: editing.id,
          input: editing.input,
          resultado: editing.resultado,
          created_at: editing.created_at,
          updated_at: editing.updated_at,
        },
        clienteNome: clientMap[clienteId] ?? "Cliente",
        areaNome: areaMap[areaId] ?? "Parcela",
        locale,
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.88fr_1.52fr]">
        <section className="overflow-hidden rounded-[28px] border border-stone-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b border-stone-200 px-6 py-4">
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.25em] text-gray-900">{t("analises.title")}</h1>
              <p className="mt-1 text-sm text-stone-500">{t("analises.subtitle")}</p>
            </div>
            <button type="button" onClick={reset} className={btnSecondary}>
              <i className="fas fa-plus" />
              {t("analises.new")}
            </button>
          </div>

          <div className="border-b border-stone-200 p-6">
            <label className={labelCls}>{t("analises.filterClient")}</label>
            <select
              className={inputCls}
              value={selectedClient}
              onChange={(event) => setSelectedClient(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="max-h-[78vh] space-y-3 overflow-auto p-4">
            {loading && (
              <div className="p-8 text-center text-stone-400">
                <i className="fas fa-spinner fa-spin mr-2" />
                {t("analises.loading")}
              </div>
            )}
            {!loading &&
              filteredRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleEdit(row)}
                  className={classNames(
                    "w-full rounded-2xl border p-4 text-left transition-all",
                    editing?.id === row.id
                      ? "border-agro-primary bg-stone-100 ring-2 ring-agro-primary/10"
                      : "border-stone-200 hover:border-agro-primary/30"
                  )}
                >
                  <p className="font-bold text-gray-900">
                    {row.input.controle_laboratorio || row.input.codigo_analise}
                  </p>
                  <p className="mt-1 text-xs text-stone-500">
                    {clientMap[row.cliente_id] ?? t("analises.clientFallback")} · {areaMap[row.area_id] ?? t("analises.areaFallback")}
                  </p>
                  <p className="mt-1 text-xs text-stone-400">
                    {t("analises.collection")}: {formatDate(row.input.fecha_muestreo)} · {t("analises.target")}:{" "}
                    {formatNumber(row.input.productividad_objetivo_bolsas_ha, 0)} {t("analises.bagsPerHa")}
                  </p>
                </button>
              ))}
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-[28px] border border-stone-200 bg-[#f6f1ea] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-gray-900">
                  {editing ? t("analises.edit") : t("analises.create")}
                </h2>
                <p className="mt-1 text-sm text-stone-600">
                  {t("analises.heroText")}
                </p>
                <p className="mt-2 text-xs font-semibold text-stone-500">
                  {t("analises.heroHint")}
                </p>
              </div>
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-amber-500" />
                {t("analises.systemCalculated")}
              </span>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <section className={formSectionCls}>
                <SectionHeader
                  icon="fa-id-card"
                  title={t("analises.reportData")}
                  helper={t("analises.reportHelp")}
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <SelectField label="Cliente" value={clienteId} onChange={(value) => { setClienteId(value); setAreaId(""); }}>
                    <option value="">Selecione</option>
                    {clientes.map((cliente) => (
                      <option key={cliente.id} value={cliente.id}>
                        {cliente.nombre}
                      </option>
                    ))}
                  </SelectField>
                  <SelectField label="Área" value={areaId} onChange={setAreaId}>
                    <option value="">Selecione</option>
                    {availableAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.nombre}
                      </option>
                    ))}
                  </SelectField>
                  <TextField
                    label="Controle do laboratório"
                    value={form.controle_laboratorio}
                    placeholder="51801/2026"
                    onChange={(value) => setTextField("controle_laboratorio", value)}
                  />
                  <TextField
                    label="Cultura"
                    value={form.cultura}
                    placeholder="Soja"
                    onChange={(value) => setTextField("cultura", value)}
                  />
                </div>
              </section>

              <section className={formSectionCls}>
                <SectionHeader
                  icon="fa-seedling"
                  title={t("analises.macros")}
                  helper={t("analises.macrosHelp")}
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <InputMetric label="Potássio" symbol="K" unit="cmolc/dm³" value={getNumericFieldValue("k_mg_dm3")} placeholder="0,60" onChange={(value) => setNumberField("k_mg_dm3", value)} />
                  <InputMetric label="Cálcio" symbol="Ca" unit="cmolc/dm³" value={getNumericFieldValue("ca_cmol_dm3")} placeholder="4,42" onChange={(value) => setNumberField("ca_cmol_dm3", value)} />
                  <InputMetric label="Magnésio" symbol="Mg" unit="cmolc/dm³" value={getNumericFieldValue("mg_cmol_dm3")} placeholder="1,58" onChange={(value) => setNumberField("mg_cmol_dm3", value)} />
                  <InputMetric label="Fósforo" symbol="P" unit="mg/dm³" value={getNumericFieldValue("p_mg_dm3")} placeholder="29,26" onChange={(value) => setNumberField("p_mg_dm3", value)} />
                  <InputMetric label="Enxofre" symbol="S" unit="mg/dm³" value={getNumericFieldValue("so4_mg_dm3")} placeholder="5,64" onChange={(value) => setNumberField("so4_mg_dm3", value)} />
                </div>
              </section>

              <section className={formSectionCls}>
                <SectionHeader
                  icon="fa-flask"
                  title="Micronutrientes"
                  helper="Use a mesma nomenclatura do laudo: B, Cu, Fe, Zn e Mn."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  <InputMetric label="Boro" symbol="B" unit="mg/dm³" value={getNumericFieldValue("b_mg_dm3")} placeholder="0,33" onChange={(value) => setNumberField("b_mg_dm3", value)} />
                  <InputMetric label="Cobre" symbol="Cu" unit="mg/dm³" value={getNumericFieldValue("cu_mg_dm3")} placeholder="3,90" onChange={(value) => setNumberField("cu_mg_dm3", value)} />
                  <InputMetric label="Ferro" symbol="Fe" unit="mg/dm³" value={getNumericFieldValue("fe_mg_dm3")} placeholder="21,80" onChange={(value) => setNumberField("fe_mg_dm3", value)} />
                  <InputMetric label="Zinco" symbol="Zn" unit="mg/dm³" value={getNumericFieldValue("zn_mg_dm3")} placeholder="1,80" onChange={(value) => setNumberField("zn_mg_dm3", value)} />
                  <InputMetric label="Manganês" symbol="Mn" unit="mg/dm³" value={getNumericFieldValue("mn_mg_dm3")} placeholder="31,40" onChange={(value) => setNumberField("mn_mg_dm3", value)} />
                </div>
              </section>

              <section className={formSectionCls}>
                <SectionHeader
                  icon="fa-mountain"
                  title="Propriedades do Solo"
                  helper="Essas medidas ajudam o motor de recomendação da planilha."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InputMetric label="CTC" symbol="T" unit="cmolc/dm³" value={getNumericFieldValue("ctc_cmol_dm3")} placeholder="13,50" onChange={(value) => setNumberField("ctc_cmol_dm3", value)} />
                  <InputMetric label="Teor de Argila" unit="%" value={getNumericFieldValue("teor_argila_percent")} placeholder="72,50" onChange={(value) => setNumberField("teor_argila_percent", value)} />
                  <InputMetric label="P Remanescente" symbol="P.Rem" unit="mg/dm³" value={getNumericFieldValue("prem")} placeholder="15,13" onChange={(value) => setNumberField("prem", value)} />
                  <InputMetric label="Matéria orgânica" symbol="MO" unit="%" value={getNumericFieldValue("materia_organica_percent")} placeholder="3,00" onChange={(value) => setNumberField("materia_organica_percent", value)} />
                </div>
              </section>

              <section className={formSectionCls}>
                <SectionHeader
                  icon="fa-bullseye"
                  title="Calcário e Produção"
                  helper="Esses quatro campos alteram diretamente a calagem e a recomendação final, como na planilha."
                />
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <InputMetric
                    label="PRNT do calcário"
                    unit="%"
                    value={getNumericFieldValue("prnt_calcario_percent")}
                    placeholder={parametros ? formatNumber(parametros.parametros.calcio.prnt * 100, 0) : "100"}
                    onChange={(value) => setNumberField("prnt_calcario_percent", value)}
                  />
                  <InputMetric
                    label="Cálcio no calcário"
                    symbol="Ca"
                    unit="%"
                    value={getNumericFieldValue("calcio_no_calcario_percent")}
                    placeholder={
                      parametros
                        ? formatNumber(parametros.parametros.calcio.garantia_ca_calcario * 100, 0)
                        : "30"
                    }
                    onChange={(value) => setNumberField("calcio_no_calcario_percent", value)}
                  />
                  <InputMetric
                    label="Magnésio no calcário"
                    symbol="Mg"
                    unit="%"
                    value={getNumericFieldValue("magnesio_no_calcario_percent")}
                    placeholder={
                      parametros
                        ? formatNumber(parametros.parametros.calcio.garantia_mg_calcario * 100, 0)
                        : "20"
                    }
                    onChange={(value) => setNumberField("magnesio_no_calcario_percent", value)}
                  />
                  <InputMetric
                    label="Produção desejada"
                    unit="bls/ha"
                    value={getNumericFieldValue("productividad_objetivo_bolsas_ha")}
                    placeholder={
                      parametros
                        ? formatNumber(
                            parametros.parametros.producao.produtividade_padrao_bolsas_ha,
                            0
                          )
                        : "60"
                    }
                    onChange={(value) => setNumberField("productividad_objetivo_bolsas_ha", value)}
                  />
                </div>
              </section>

              <div className="rounded-full bg-white/70 px-4 py-3 text-center text-sm font-semibold text-agro-primary">
                <span className="inline-flex items-center">
                  <span className="mr-2 h-2.5 w-2.5 rounded-full bg-agro-primary" />
                  Campos que você preenche
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
                <button
                  type="button"
                  className={classNames(btnSecondary, "w-full justify-center py-4 text-base")}
                  onClick={() => void handleGeneratePdf()}
                  disabled={!canGeneratePdf}
                  title={canGeneratePdf ? "Gerar PDF da análise salva" : "Salve a análise para liberar o PDF"}
                >
                  <i className={`fas ${generatingPdf ? "fa-spinner fa-spin" : "fa-file-pdf"}`} />
                  {generatingPdf ? "Gerando PDF..." : "Gerar PDF"}
                </button>
                <button
                  type="submit"
                  className={classNames(btnPrimary, "w-full justify-center py-4 text-base")}
                  disabled={saving || !parametros}
                >
                  <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-seedling"}`} />
                  {editing ? "Salvar análise e recomendação" : "Salvar análise e recomendação"}
                </button>
              </div>
            </form>
          </div>

          <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-stone-100 text-agro-primary">
                  <i className="fas fa-droplet" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-gray-900">Equilíbrio Nutricional</h3>
                  <p className="text-sm text-stone-500">Leitura instantânea do que está adequado e do que precisa correção.</p>
                </div>
              </div>
              <span className="inline-flex items-center rounded-full border border-stone-200 bg-white px-4 py-2 text-xs font-semibold text-stone-600">
                <span className="mr-2 h-2.5 w-2.5 rounded-full bg-amber-500" />
                Valores calculados pelo sistema
              </span>
            </div>

            {!essentialsReady && (
              <div className="rounded-[24px] border border-dashed border-stone-300 bg-white p-8 text-center text-stone-500 shadow-sm">
                Preencha os campos principais do laudo para visualizar o equilíbrio nutricional e a sugestão completa.
              </div>
            )}

            {essentialsReady && previewResult && (
              <>
                <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
                  <SectionHeader
                    icon="fa-clipboard-check"
                    title="Recomendação Final"
                    helper="Diagnóstico direto para quem vai decidir a adubação."
                  />
                  <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-6">
                    <SummaryMetric
                      title="Status"
                      value={previewResult.recomendacao_final.manutencao_apenas ? "Manutenção" : "Corrigir"}
                      subtitle={previewResult.recomendacao_final.cultura}
                      accent={!previewResult.recomendacao_final.manutencao_apenas}
                    />
                    <SummaryMetric
                      title="K₂O"
                      value={formatNumber(previewResult.recomendacao_final.necessidade_fertilizante.k2o_kg_ha, 1)}
                      subtitle="kg/ha"
                    />
                    <SummaryMetric
                      title="P₂O₅"
                      value={formatNumber(previewResult.recomendacao_final.necessidade_fertilizante.p2o5_kg_ha, 1)}
                      subtitle="kg/ha"
                    />
                    <SummaryMetric
                      title="S"
                      value={formatNumber(previewResult.recomendacao_final.necessidade_fertilizante.so4_kg_ha, 1)}
                      subtitle="kg/ha"
                    />
                    <SummaryMetric
                      title="Fórmula"
                      value={previewResult.recomendacao_final.formula_sugerida?.nome ?? "Separada"}
                      subtitle="mistura sugerida"
                    />
                    <SummaryMetric
                      title="Dose"
                      value={
                        previewResult.recomendacao_final.formula_sugerida
                          ? formatNumber(previewResult.recomendacao_final.formula_sugerida.dose_kg_ha, 0)
                          : "-"
                      }
                      subtitle="kg/ha"
                    />
                  </div>
                  {previewResult.alertas.length > 0 && (
                    <div className="mt-6 space-y-3">
                      {previewResult.alertas.map((alerta) => (
                        <div
                          key={alerta.id}
                          className={classNames(
                            "rounded-2xl border px-4 py-3 text-sm",
                            alerta.tipo === "warning"
                              ? "border-amber-200 bg-amber-50 text-amber-800"
                              : "border-stone-300 bg-stone-100 text-agro-primary"
                          )}
                        >
                          <p className="font-black">{alerta.titulo}</p>
                          <p className="mt-1">{alerta.mensagem}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                  {balanceCards.map((card) => (
                    <BalanceCard key={card.title} {...card} />
                  ))}
                </div>

                <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
                  <SectionHeader icon="fa-hill-rockslide" title="Calagem" />
                  <div className="grid gap-6 md:grid-cols-3 xl:grid-cols-7">
                    <SummaryMetric
                      title="Total Calcário"
                      value={formatNumber(previewResult.calagem_resumo.total_calcario_kg_ha, 2)}
                      subtitle="kg/ha"
                      accent
                    />
                    <SummaryMetric
                      title="Tipo"
                      value={previewResult.calagem_resumo.tipo === "calcitico" ? "Calcítico" : "Dolomítico"}
                      subtitle="corretivo sugerido"
                    />
                    <SummaryMetric
                      title="Relação Ca/Mg"
                      value={formatNumber(previewResult.calagem_resumo.relacao_ca_mg, 1)}
                      subtitle="equilíbrio atual"
                    />
                    <SummaryMetric
                      title="Calcário p/ Ca"
                      value={formatNumber(previewResult.calcio.calcario_kg_ha, 2)}
                      subtitle="kg"
                    />
                    <SummaryMetric
                      title="Calcário p/ Mg"
                      value={formatNumber(previewResult.magnesio.recomendacao_produto_kg_ha, 2)}
                      subtitle="kg"
                    />
                    <SummaryMetric
                      title="Part. Ca CTC"
                      value={formatNumber(previewResult.calagem_resumo.participacao_ca_ctc_percent, 2)}
                      subtitle="% pós-calagem"
                    />
                    <SummaryMetric
                      title="Part. Mg CTC"
                      value={formatNumber(previewResult.magnesio.participacao_pos_correcao, 2)}
                      subtitle="% pós-correção"
                    />
                  </div>
                </section>

                <section className="rounded-[24px] border border-stone-200 bg-white p-6 shadow-sm">
                  <SectionHeader
                    icon="fa-wheat-awn"
                    title={`Extração x Produção (${formatNumber(form.productividad_objetivo_bolsas_ha, 0)} bolsas/ha)`}
                  />
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-stone-200 text-left text-stone-500">
                          <th className="px-2 py-3 font-semibold">Nutriente</th>
                          <th className="px-2 py-3 font-semibold">Reserva Solo (kg)</th>
                          <th className="px-2 py-3 font-semibold">Necessidade/Bolsa</th>
                          <th className="px-2 py-3 font-semibold">Total Necessário (kg)</th>
                          <th className="px-2 py-3 font-semibold">Resultado (kg/ha)</th>
                          <th className="px-2 py-3 font-semibold">Produto (kg/ha)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewResult.extracao_producao.linhas.map((row) => (
                          <tr key={row.nutriente} className="border-b border-stone-100">
                            <td className="px-2 py-4 font-black text-gray-900">{row.nutriente}</td>
                            <td className="px-2 py-4 text-gray-900">{formatNumber(row.reserva_solo_kg, 1)}</td>
                            <td className="px-2 py-4 text-gray-900">{formatNumber(row.necessidade_por_bolsa_kg, 2)} kg</td>
                            <td className="px-2 py-4 text-gray-900">{formatNumber(row.total_necessario_kg, 1)}</td>
                            <td className={classNames("px-2 py-4 font-black", row.saldo_kg_ha >= 0 ? "text-emerald-600" : "text-red-600")}>
                              {formatNumber(row.saldo_kg_ha, 1)}
                            </td>
                            <td className="px-2 py-4 font-black text-amber-700">
                              {row.produto_kg_ha > 0 ? formatNumber(row.produto_kg_ha, 1) : "-"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </section>
        </section>
      </div>
    </div>
  );
}

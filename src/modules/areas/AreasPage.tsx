import { FormEvent, useEffect, useMemo, useState } from "react";
import { listAreas, listClientes, saveArea } from "../soil-analysis/repository";
import type { Area, Cliente } from "../soil-analysis/types";
import {
  btnPrimary,
  btnSecondary,
  classNames,
  inputCls,
  labelCls,
  toNumber,
} from "../soil-analysis/utils";
import { useI18n } from "../i18n/I18nContext";

const emptyForm: {
  cliente_id: string;
  nombre: string;
  codigo: string;
  municipio: string;
  departamento: string;
  tamanho_ha: string;
  estado: "activo" | "inactivo";
  observaciones: string;
} = {
  cliente_id: "",
  nombre: "",
  codigo: "",
  municipio: "",
  departamento: "",
  tamanho_ha: "",
  estado: "activo" as const,
  observaciones: "",
};

export function AreasPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Area[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [editing, setEditing] = useState<Area | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterCliente, setFilterCliente] = useState("");
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    try {
      const [areas, clientesRows] = await Promise.all([listAreas(), listClientes()]);
      setRows(areas);
      setClientes(clientesRows.filter((row) => row.estado === "activo"));
      if (!form.cliente_id && clientesRows[0]) {
        setForm((current) => ({ ...current, cliente_id: current.cliente_id || clientesRows[0].id }));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const clienteMap = useMemo(
    () => Object.fromEntries(clientes.map((cliente) => [cliente.id, cliente.nombre])),
    [clientes]
  );

  const filtered = useMemo(() => {
    if (!filterCliente) return rows;
    return rows.filter((row) => row.cliente_id === filterCliente);
  }, [rows, filterCliente]);

  const reset = () => {
    setEditing(null);
    setForm((current) => ({
      ...emptyForm,
      cliente_id: clientes[0]?.id ?? current.cliente_id,
    }));
  };

  const handleEdit = (row: Area) => {
    setEditing(row);
    setForm({
      cliente_id: row.cliente_id,
      nombre: row.nombre,
      codigo: row.codigo ?? "",
      municipio: row.municipio ?? "",
      departamento: row.departamento ?? "",
      tamanho_ha: row.tamanho_ha != null ? String(row.tamanho_ha) : "",
      estado: row.estado,
      observaciones: row.observaciones ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveArea({
        id: editing?.id,
        cliente_id: form.cliente_id,
        nombre: form.nombre.trim(),
        codigo: form.codigo.trim() || null,
        municipio: form.municipio.trim() || null,
        departamento: form.departamento.trim() || null,
        tamanho_ha: form.tamanho_ha ? toNumber(form.tamanho_ha) : null,
        estado: form.estado,
        observaciones: form.observaciones.trim() || null,
      });
      await load();
      reset();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {t("areas.title")}
              </h1>
              <p className="text-sm text-gray-500">{t("areas.subtitle")}</p>
            </div>
            <button type="button" onClick={reset} className={btnSecondary}>
              <i className="fas fa-plus" />
              {t("areas.new")}
            </button>
          </div>
          <div className="p-6 border-b border-gray-100">
            <label className={labelCls}>{t("areas.filterClient")}</label>
            <select
              className={inputCls}
              value={filterCliente}
              onChange={(event) => setFilterCliente(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              {clientes.map((cliente) => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
            {loading && (
              <div className="p-8 text-center text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2" />
                {t("areas.loading")}
              </div>
            )}
            {!loading &&
              filtered.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => handleEdit(row)}
                  className={classNames(
                    "w-full text-left rounded-2xl border p-4 transition-all",
                    editing?.id === row.id
                      ? "border-agro-primary ring-2 ring-agro-primary/10 bg-agro-primary/[0.03]"
                      : "border-gray-100 hover:border-agro-primary/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-bold text-gray-900">{row.nombre}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {clienteMap[row.cliente_id] ?? t("areas.clientMissing")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {row.municipio ?? t("areas.noMunicipality")} · {row.tamanho_ha ?? 0} ha
                      </p>
                    </div>
                    <span
                      className={classNames(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
                        row.estado === "activo"
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      )}
                    >
                      {row.estado === "activo"
                        ? t("common.state.active")
                        : t("common.state.inactive")}
                    </span>
                  </div>
                </button>
              ))}
            {!loading && filtered.length === 0 && (
              <div className="p-12 text-center text-gray-400">
                <i className="fas fa-map-marked-alt text-2xl mb-3 block" />
                {t("areas.noResults")}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {editing ? t("areas.edit") : t("areas.create")}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label className={labelCls}>{t("areas.client")}</label>
              <select
                className={inputCls}
                value={form.cliente_id}
                onChange={(event) => setForm({ ...form, cliente_id: event.target.value })}
                required
              >
                <option value="">{t("areas.select")}</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("areas.name")}</label>
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>{t("areas.code")}</label>
                <input
                  className={inputCls}
                  value={form.codigo}
                  onChange={(event) => setForm({ ...form, codigo: event.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("areas.city")}</label>
                <input
                  className={inputCls}
                  value={form.municipio}
                  onChange={(event) => setForm({ ...form, municipio: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>{t("areas.department")}</label>
                <input
                  className={inputCls}
                  value={form.departamento}
                  onChange={(event) => setForm({ ...form, departamento: event.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("areas.size")}</label>
                <input
                  className={inputCls}
                  value={form.tamanho_ha}
                  onChange={(event) => setForm({ ...form, tamanho_ha: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>{t("areas.state")}</label>
                <select
                  className={inputCls}
                  value={form.estado}
                  onChange={(event) =>
                    setForm({ ...form, estado: event.target.value as "activo" | "inactivo" })
                  }
                >
                  <option value="activo">{t("common.state.active")}</option>
                  <option value="inactivo">{t("common.state.inactive")}</option>
                </select>
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("areas.notes")}</label>
              <textarea
                className={classNames(inputCls, "min-h-28")}
                value={form.observaciones}
                onChange={(event) => setForm({ ...form, observaciones: event.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnPrimary} disabled={saving}>
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                {editing ? t("areas.submitSave") : t("areas.submitCreate")}
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                <i className="fas fa-eraser" />
                {t("areas.clear")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

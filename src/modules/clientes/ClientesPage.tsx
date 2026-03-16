import { FormEvent, useEffect, useMemo, useState } from "react";
import { listClientes, saveCliente } from "../soil-analysis/repository";
import type { Cliente } from "../soil-analysis/types";
import {
  btnPrimary,
  btnSecondary,
  classNames,
  inputCls,
  labelCls,
} from "../soil-analysis/utils";
import { useI18n } from "../i18n/I18nContext";

const emptyForm: {
  nombre: string;
  documento: string;
  contacto: string;
  telefono: string;
  email: string;
  ciudad: string;
  estado: "activo" | "inactivo";
  observaciones: string;
} = {
  nombre: "",
  documento: "",
  contacto: "",
  telefono: "",
  email: "",
  ciudad: "",
  estado: "activo" as const,
  observaciones: "",
};

export function ClientesPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Cliente[]>([]);
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.nombre, row.documento, row.contacto, row.email, row.ciudad]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [rows, search]);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listClientes());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const reset = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleEdit = (row: Cliente) => {
    setEditing(row);
    setForm({
      nombre: row.nombre,
      documento: row.documento ?? "",
      contacto: row.contacto ?? "",
      telefono: row.telefono ?? "",
      email: row.email ?? "",
      ciudad: row.ciudad ?? "",
      estado: row.estado,
      observaciones: row.observaciones ?? "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await saveCliente({
        id: editing?.id,
        nombre: form.nombre.trim(),
        documento: form.documento.trim() || null,
        contacto: form.contacto.trim() || null,
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        ciudad: form.ciudad.trim() || null,
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
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.1fr] gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {t("clientes.title")}
              </h1>
              <p className="text-sm text-gray-500">{t("clientes.subtitle")}</p>
            </div>
            <button type="button" onClick={reset} className={btnSecondary}>
              <i className="fas fa-plus" />
              {t("clientes.new")}
            </button>
          </div>
          <div className="border-b border-gray-100 p-4 sm:p-6">
            <input
              className={inputCls}
              placeholder={t("clientes.searchPlaceholder")}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
            {loading && (
              <div className="p-8 text-center text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2" />
                {t("clientes.loading")}
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
                        {row.contacto ?? t("clientes.noContact")} · {row.ciudad ?? t("clientes.noCity")}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{row.email ?? t("clientes.noEmail")}</p>
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
                <i className="fas fa-users-slash text-2xl mb-3 block" />
                {t("clientes.noResults")}
              </div>
            )}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {editing ? t("clientes.edit") : t("clientes.create")}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("clientes.name")}</label>
                <input
                  className={inputCls}
                  value={form.nombre}
                  onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>{t("clientes.document")}</label>
                <input
                  className={inputCls}
                  value={form.documento}
                  onChange={(event) => setForm({ ...form, documento: event.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("clientes.contact")}</label>
                <input
                  className={inputCls}
                  value={form.contacto}
                  onChange={(event) => setForm({ ...form, contacto: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>{t("clientes.phone")}</label>
                <input
                  className={inputCls}
                  value={form.telefono}
                  onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("clientes.email")}</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                />
              </div>
              <div>
                <label className={labelCls}>{t("clientes.city")}</label>
                <input
                  className={inputCls}
                  value={form.ciudad}
                  onChange={(event) => setForm({ ...form, ciudad: event.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={labelCls}>{t("clientes.state")}</label>
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

            <div>
              <label className={labelCls}>{t("clientes.notes")}</label>
              <textarea
                className={classNames(inputCls, "min-h-28")}
                value={form.observaciones}
                onChange={(event) => setForm({ ...form, observaciones: event.target.value })}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnPrimary} disabled={saving}>
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                {editing ? t("clientes.submitSave") : t("clientes.submitCreate")}
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                <i className="fas fa-eraser" />
                {t("clientes.clear")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

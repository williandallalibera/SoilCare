import { FormEvent, useEffect, useMemo, useState } from "react";
import { listUsuarios, saveUsuario } from "../soil-analysis/repository";
import type { Usuario, UsuarioPerfil } from "../soil-analysis/types";
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
  email: string;
  telefono: string;
  perfil_acceso: UsuarioPerfil;
  estado: "activo" | "inactivo";
  password: string;
} = {
  nombre: "",
  email: "",
  telefono: "",
  perfil_acceso: "operador" as UsuarioPerfil,
  estado: "activo" as const,
  password: "",
};

export function UsuariosPage() {
  const { t } = useI18n();
  const [rows, setRows] = useState<Usuario[]>([]);
  const [editing, setEditing] = useState<Usuario | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterRole, setFilterRole] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!filterRole) return rows;
    return rows.filter((row) => row.perfil_acceso === filterRole);
  }, [rows, filterRole]);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await listUsuarios());
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
    setError(null);
    setSuccess(null);
  };

  const handleEdit = (row: Usuario) => {
    setEditing(row);
    setError(null);
    setSuccess(null);
    setForm({
      nombre: row.nombre ?? "",
      email: row.email ?? "",
      telefono: row.telefono ?? "",
      perfil_acceso: row.perfil_acceso,
      estado: row.estado,
      password: "",
    });
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSaving(true);
    try {
      await saveUsuario({
        id: editing?.id,
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        perfil_acesso: form.perfil_acceso,
        estado: form.estado,
        password: form.password || undefined,
      });
      await load();
      setEditing(null);
      setForm(emptyForm);
      setSuccess(
        editing
          ? form.password
            ? t("users.message.updatedReset")
            : t("users.message.updated")
          : t("users.message.created")
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("users.message.saveError")
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 px-4 py-4 sm:px-6">
            <div>
              <h1 className="text-sm font-black text-gray-900 uppercase tracking-widest">
                {t("users.title")}
              </h1>
              <p className="text-sm text-gray-500">{t("users.subtitle")}</p>
            </div>
            <button type="button" onClick={reset} className={btnSecondary}>
              <i className="fas fa-plus" />
              {t("users.new")}
            </button>
          </div>
          <div className="border-b border-gray-100 p-4 sm:p-6">
            <label className={labelCls}>{t("users.filterRole")}</label>
            <select
              className={inputCls}
              value={filterRole}
              onChange={(event) => setFilterRole(event.target.value)}
            >
              <option value="">{t("common.all")}</option>
              <option value="admin">{t("common.role.admin")}</option>
              <option value="operador">{t("common.role.operador")}</option>
            </select>
          </div>
          <div className="p-4 space-y-3 max-h-[70vh] overflow-auto">
            {loading && (
              <div className="p-8 text-center text-gray-400">
                <i className="fas fa-spinner fa-spin mr-2" />
                {t("users.loading")}
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
                      <p className="text-xs text-gray-500 mt-1">{row.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {row.telefono ?? t("common.noPhone")}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400">
                        {t(`common.role.${row.perfil_acceso}`)}
                      </span>
                      <span
                        className={classNames(
                          "inline-flex mt-1 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide",
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
                  </div>
                </button>
              ))}
          </div>
        </section>

        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {editing ? t("users.edit") : t("users.create")}
            </h2>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5 p-4 sm:p-6">
            {error && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {success && (
              <div className="rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                {success}
              </div>
            )}
            <div>
              <label className={labelCls}>{t("users.name")}</label>
              <input
                className={inputCls}
                value={form.nombre}
                onChange={(event) => setForm({ ...form, nombre: event.target.value })}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("users.email")}</label>
                <input
                  type="email"
                  className={inputCls}
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>{t("users.phone")}</label>
                <input
                  className={inputCls}
                  value={form.telefono}
                  onChange={(event) => setForm({ ...form, telefono: event.target.value })}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 text-amber-600">
                  <i className={`fas ${editing ? "fa-key" : "fa-user-lock"}`} />
                </div>
                <div className="flex-1">
                  <label className={labelCls}>
                    {editing ? t("users.resetPassword") : t("users.initialPassword")}
                  </label>
                  <input
                    type="password"
                    className={inputCls}
                    value={form.password}
                    onChange={(event) =>
                      setForm({ ...form, password: event.target.value })
                    }
                    placeholder="Temp123456!"
                  />
                  <p className="mt-2 text-xs text-amber-800">
                    {editing
                      ? t("users.passwordEditHelp")
                      : t("users.passwordCreateHelp")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>{t("users.profile")}</label>
                <select
                  className={inputCls}
                  value={form.perfil_acceso}
                  onChange={(event) =>
                    setForm({ ...form, perfil_acceso: event.target.value as UsuarioPerfil })
                  }
                >
                  <option value="admin">{t("common.role.admin")}</option>
                  <option value="operador">{t("common.role.operador")}</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>{t("users.state")}</label>
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

            <div className="flex flex-wrap gap-3">
              <button type="submit" className={btnPrimary} disabled={saving}>
                <i className={`fas ${saving ? "fa-spinner fa-spin" : "fa-save"}`} />
                {editing
                  ? form.password
                    ? t("users.submitReset")
                    : t("users.submitSave")
                  : t("users.submitCreate")}
              </button>
              <button type="button" className={btnSecondary} onClick={reset}>
                <i className="fas fa-eraser" />
                {t("users.clear")}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

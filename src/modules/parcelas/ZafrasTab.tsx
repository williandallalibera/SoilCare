import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { exportToCsv } from "../productos/utils";

interface ZafraRow {
  id: string;
  nombre_zafra: string;
  ciclo: number | null;
  id_cultura: string | null;
  cultura_desc: string;
  estado: string;
  created_at: string;
}

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const CSV_COLUMNS = [
  { key: "nombre_zafra", header: "Nombre Zafra" },
  { key: "ciclo", header: "Ciclo" },
  { key: "cultura_desc", header: "Cultura" },
  { key: "estado", header: "Estado" },
  { key: "created_at", header: "Fecha creación" },
];

export function ZafrasTab() {
  const [rows, setRows] = useState<ZafraRow[]>([]);
  const [culturas, setCulturas] = useState<{ id: string; descripcion: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ZafraRow | null>(null);
  const [form, setForm] = useState({
    nombre_zafra: "",
    ciclo: "",
    id_cultura: "",
    estado: "activo",
  });
  const [filterEstado, setFilterEstado] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("zafras")
      .select("id, nombre_zafra, ciclo, id_cultura, estado, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const cultIds = [...new Set((data as any[]).map((d) => d.id_cultura).filter(Boolean))];
      let cultMap: Record<string, string> = {};
      if (cultIds.length > 0) {
        const { data: c } = await supabase
          .from("culturas")
          .select("id, descripcion")
          .in("id", cultIds);
        if (c) cultMap = Object.fromEntries((c as any[]).map((x) => [x.id, x.descripcion]));
      }
      setRows(
        (data as any[]).map((d) => ({
          id: d.id,
          nombre_zafra: d.nombre_zafra,
          ciclo: d.ciclo,
          id_cultura: d.id_cultura ?? null,
          cultura_desc: d.id_cultura ? cultMap[d.id_cultura] ?? "" : "",
          estado: d.estado,
          created_at: d.created_at,
        }))
      );
    }
    const { data: cult } = await supabase.from("culturas").select("id, descripcion");
    if (cult) setCulturas(cult as any);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!filterEstado) return rows;
    return rows.filter((r) => r.estado === filterEstado);
  }, [rows, filterEstado]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      nombre_zafra: "",
      ciclo: "",
      id_cultura: "",
      estado: "activo",
    });
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (row: ZafraRow) => {
    setEditing(row);
    setForm({
      nombre_zafra: row.nombre_zafra,
      ciclo: row.ciclo != null ? String(row.ciclo) : "",
      id_cultura: row.id_cultura ?? "",
      estado: row.estado,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      nombre_zafra: form.nombre_zafra.trim(),
      ciclo: form.ciclo !== "" ? parseInt(form.ciclo, 10) : null,
      id_cultura: form.id_cultura || null,
      estado: form.estado,
    };
    if (editing) {
      await supabase.from("zafras").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("zafras").insert(payload);
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleExportCsv = () => {
    const toExport = filtered.map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toLocaleDateString("es-PY"),
    }));
    exportToCsv(
      toExport,
      `zafras_${new Date().toISOString().slice(0, 10)}.csv`,
      CSV_COLUMNS
    );
  };

  if (loading) return <span>Cargando zafras...</span>;

  return (
    <div>
      <h5 className="mb-3">Zafras</h5>
      <div className="row mb-3">
        <div className="col-md-3">
          <label className="form-label">Estado</label>
          <select
            className="form-control form-control-sm"
            value={filterEstado}
            onChange={(e) => setFilterEstado(e.target.value)}
          >
            {ESTADOS.map((o) => (
              <option key={o.value || "all"} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-9 d-flex align-items-end gap-2">
          <button type="button" className="btn btn-success btn-sm" onClick={handleNuevo}>
            <i className="fas fa-plus mr-1" />
            Nuevo
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportCsv}>
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped table-hover">
          <thead className="thead-dark">
            <tr>
              <th>Nombre Zafra</th>
              <th>Ciclo</th>
              <th>Cultura</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className={r.estado === "inactivo" ? "table-secondary" : ""}>
                <td>{r.nombre_zafra}</td>
                <td>{r.ciclo ?? "-"}</td>
                <td>{r.cultura_desc || "-"}</td>
                <td>
                  <span
                    className={`badge ${r.estado === "activo" ? "badge-success" : "badge-secondary"}`}
                  >
                    {r.estado === "activo" ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td>{new Date(r.created_at).toLocaleDateString("es-PY")}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-success"
                    onClick={() => handleEdit(r)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && <p className="text-muted">No hay registros.</p>}

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  {editing ? "Editar zafra" : "Nueva zafra"}
                </h5>
                <button type="button" className="close text-white" onClick={resetForm}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Nombre Zafra</label>
                    <input
                      className="form-control"
                      placeholder="Nombre de la zafra"
                      value={form.nombre_zafra}
                      onChange={(e) => setForm({ ...form, nombre_zafra: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Ciclo (año)</label>
                    <input
                      type="number"
                      className="form-control"
                      placeholder="Ej: 2025"
                      value={form.ciclo}
                      onChange={(e) => setForm({ ...form, ciclo: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cultura</label>
                    <select
                      className="form-control"
                      value={form.id_cultura}
                      onChange={(e) => setForm({ ...form, id_cultura: e.target.value })}
                    >
                      <option value="">Seleccione</option>
                      {culturas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.descripcion}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      className="form-control"
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? "Guardando..." : editing ? "Alterar" : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

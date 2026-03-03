import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { exportToCsv } from "./utils";

interface DistribuidorRow {
  id: string;
  fabricante: string;
  distribuidor: string;
  estado: string;
  created_at: string;
}

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const CSV_COLUMNS = [
  { key: "fabricante", header: "Fabricante" },
  { key: "distribuidor", header: "Distribuidor" },
  { key: "estado", header: "Estado" },
  { key: "created_at", header: "Fecha creación" },
];

export function DistribuidorTab() {
  const [rows, setRows] = useState<DistribuidorRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<DistribuidorRow | null>(null);
  const [form, setForm] = useState({
    fabricante: "",
    distribuidor: "",
    estado: "activo",
  });
  const [filterEstado, setFilterEstado] = useState("");
  const [filterBusqueda, setFilterBusqueda] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("distribuidores")
      .select("id, fabricante, distribuidor, estado, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(data as DistribuidorRow[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterEstado) {
      list = list.filter((r) => r.estado === filterEstado);
    }
    if (filterBusqueda.trim()) {
      const q = filterBusqueda.toLowerCase();
      list = list.filter(
        (r) =>
          r.fabricante.toLowerCase().includes(q) ||
          r.distribuidor.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, filterEstado, filterBusqueda]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      fabricante: "",
      distribuidor: "",
      estado: "activo",
    });
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (row: DistribuidorRow) => {
    setEditing(row);
    setForm({
      fabricante: row.fabricante,
      distribuidor: row.distribuidor,
      estado: row.estado,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (editing) {
      await supabase
        .from("distribuidores")
        .update({
          fabricante: form.fabricante.trim(),
          distribuidor: form.distribuidor.trim(),
          estado: form.estado,
        })
        .eq("id", editing.id);
    } else {
      await supabase.from("distribuidores").insert({
        fabricante: form.fabricante.trim(),
        distribuidor: form.distribuidor.trim(),
        estado: form.estado,
      });
    }
    await load();
    resetForm();
    setSaving(false);
  };

  const handleExportCsv = () => {
    const toExport = filteredRows.map((r) => ({
      ...r,
      created_at: new Date(r.created_at).toLocaleDateString("es-PY"),
    }));
    exportToCsv(
      toExport,
      `distribuidores_${new Date().toISOString().slice(0, 10)}.csv`,
      CSV_COLUMNS
    );
  };

  if (loading) {
    return <span>Cargando distribuidores...</span>;
  }

  return (
    <div>
      <h5 className="mb-3">Distribuidor</h5>
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
        <div className="col-md-4">
          <label className="form-label">Buscar</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Fabricante o distribuidor"
            value={filterBusqueda}
            onChange={(e) => setFilterBusqueda(e.target.value)}
          />
        </div>
        <div className="col-md-5 d-flex align-items-end gap-2">
          <button type="button" className="btn btn-success btn-sm" onClick={handleNuevo}>
            <i className="fas fa-plus mr-1" />
            Nuevo
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={handleExportCsv}>
            <i className="fas fa-download mr-1" />
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped table-hover">
          <thead className="thead-dark">
            <tr>
              <th>Fabricante</th>
              <th>Distribuidor</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className={r.estado === "inactivo" ? "table-secondary" : ""}>
                <td>{r.fabricante}</td>
                <td>{r.distribuidor}</td>
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
      {filteredRows.length === 0 && (
        <p className="text-muted">No hay registros.</p>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  {editing ? "Editar distribuidor" : "Nuevo distribuidor"}
                </h5>
                <button
                  type="button"
                  className="close text-white"
                  onClick={resetForm}
                  aria-label="Cerrar"
                >
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Fabricante</label>
                    <input
                      className="form-control"
                      placeholder="Fabricante"
                      value={form.fabricante}
                      onChange={(e) => setForm({ ...form, fabricante: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Distribuidor</label>
                    <input
                      className="form-control"
                      placeholder="Distribuidor"
                      value={form.distribuidor}
                      onChange={(e) => setForm({ ...form, distribuidor: e.target.value })}
                      required
                    />
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

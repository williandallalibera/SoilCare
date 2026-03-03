import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";

interface MonitoreoRow {
  id: string;
  id_cliente: string;
  id_parcela: string;
  id_zafra: string;
  hectares: number | null;
  costo_estimado: number | null;
  productividad_estimada: number | null;
  tiene_siembra: boolean;
  tiene_aplicaciones: boolean;
  tiene_evaluaciones: boolean;
  tiene_cosecha: boolean;
  tiene_rte: boolean;
  concluido: boolean;
  cliente_nombre: string;
  parcela_nombre: string;
  zafra_nombre: string;
  created_at: string;
}

export function MonitoreoTab() {
  const [rows, setRows] = useState<MonitoreoRow[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [parcelas, setParcelas] = useState<{ id: string; nombre_parcela: string; id_cliente: string; area_real_ha: number | null }[]>([]);
  const [zafras, setZafras] = useState<{ id: string; nombre_zafra: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState<MonitoreoRow | null>(null);
  const [form, setForm] = useState({
    id_cliente: "",
    id_parcela: "",
    id_zafra: "",
    costo_estimado: "",
    productividad_estimada: "",
  });
  const [filterCliente, setFilterCliente] = useState("");
  const [filterParcela, setFilterParcela] = useState("");

  const loadMonitoreos = async () => {
    const { data, error } = await supabase
      .from("monitoreos")
      .select("id, id_cliente, id_parcela, id_zafra, hectares, costo_estimado, productividad_estimada, tiene_siembra, tiene_aplicaciones, tiene_evaluaciones, tiene_cosecha, tiene_rte, concluido, created_at")
      .order("created_at", { ascending: false });
    if (error || !data) return;
    const cIds = [...new Set((data as any[]).map((d) => d.id_cliente))];
    const pIds = [...new Set((data as any[]).map((d) => d.id_parcela))];
    const zIds = [...new Set((data as any[]).map((d) => d.id_zafra))];
    let cMap: Record<string, string> = {};
    let pMap: Record<string, string> = {};
    let zMap: Record<string, string> = {};
    if (cIds.length) {
      const { data: c } = await supabase.from("clientes").select("id, nombre").in("id", cIds);
      if (c) cMap = Object.fromEntries((c as any[]).map((x) => [x.id, x.nombre]));
    }
    if (pIds.length) {
      const { data: p } = await supabase.from("parcelas").select("id, nombre_parcela").in("id", pIds);
      if (p) pMap = Object.fromEntries((p as any[]).map((x) => [x.id, x.nombre_parcela]));
    }
    if (zIds.length) {
      const { data: z } = await supabase.from("zafras").select("id, nombre_zafra").in("id", zIds);
      if (z) zMap = Object.fromEntries((z as any[]).map((x) => [x.id, x.nombre_zafra]));
    }
    setRows(
      (data as any[]).map((d) => ({
        ...d,
        cliente_nombre: cMap[d.id_cliente] ?? "",
        parcela_nombre: pMap[d.id_parcela] ?? "",
        zafra_nombre: zMap[d.id_zafra] ?? "",
      }))
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadMonitoreos();
      const [c, p, z] = await Promise.all([
        supabase.from("clientes").select("id, nombre").eq("estado", "activo"),
        supabase.from("parcelas").select("id, nombre_parcela, id_cliente, area_real_ha").eq("estado", "activo"),
        supabase.from("zafras").select("id, nombre_zafra").eq("estado", "activo"),
      ]);
      if (c.data) setClientes(c.data as any);
      if (p.data) setParcelas(p.data as any);
      if (z.data) setZafras(z.data as any);
      setLoading(false);
    };
    load();
  }, []);

  const parcelasByCliente = useMemo(() => {
    if (!form.id_cliente) return parcelas;
    return parcelas.filter((p) => p.id_cliente === form.id_cliente);
  }, [parcelas, form.id_cliente]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterCliente) list = list.filter((r) => r.id_cliente === filterCliente);
    if (filterParcela) list = list.filter((r) => r.id_parcela === filterParcela);
    return list;
  }, [rows, filterCliente, filterParcela]);

  const resetForm = () => {
    setForm({
      id_cliente: "",
      id_parcela: "",
      id_zafra: "",
      costo_estimado: "",
      productividad_estimada: "",
    });
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parcela = parcelas.find((p) => p.id === form.id_parcela);
    const hectares = parcela?.area_real_ha ?? null;
    setSaving(true);
    await supabase.from("monitoreos").insert({
      id_cliente: form.id_cliente,
      id_parcela: form.id_parcela,
      id_zafra: form.id_zafra,
      hectares,
      costo_estimado: form.costo_estimado !== "" ? Number(form.costo_estimado) : null,
      productividad_estimada: form.productividad_estimada !== "" ? Number(form.productividad_estimada) : null,
    });
    await loadMonitoreos();
    resetForm();
    setSaving(false);
  };

  const handleIniciarSiembra = async (m: MonitoreoRow) => {
    const { data } = await supabase.from("siembra").insert({ id_monitoreo: m.id }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_siembra: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_siembra: true } : prev));
    }
  };

  const handleIniciarAplicacion = async (m: MonitoreoRow) => {
    await supabase.from("aplicaciones").insert({ id_monitoreo: m.id });
    const { count } = await supabase.from("aplicaciones").select("id", { count: "exact", head: true }).eq("id_monitoreo", m.id);
    if ((count ?? 0) > 0) {
      await supabase.from("monitoreos").update({ tiene_aplicaciones: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_aplicaciones: true } : prev));
    }
  };

  const handleIniciarEvaluacion = async (m: MonitoreoRow) => {
    await supabase.from("evaluaciones").insert({ id_monitoreo: m.id, fecha_evaluacion: new Date().toISOString().slice(0, 10) });
    const { count } = await supabase.from("evaluaciones").select("id", { count: "exact", head: true }).eq("id_monitoreo", m.id);
    if ((count ?? 0) > 0) {
      await supabase.from("monitoreos").update({ tiene_evaluaciones: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_evaluaciones: true } : prev));
    }
  };

  const handleIniciarCosecha = async (m: MonitoreoRow) => {
    await supabase.from("cosechas").insert({ id_monitoreo: m.id });
    await supabase.from("monitoreos").update({ tiene_cosecha: true }).eq("id", m.id);
    await loadMonitoreos();
    setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_cosecha: true } : prev));
  };

  const handleIniciarRte = async (m: MonitoreoRow) => {
    await supabase.from("rte").insert({ id_monitoreo: m.id, costo_total: 0, ingreso_total: 0, resultado_tecnico: 0 });
    await supabase.from("monitoreos").update({ tiene_rte: true }).eq("id", m.id);
    await loadMonitoreos();
    setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_rte: true } : prev));
  };

  const handleConcluir = async (m: MonitoreoRow) => {
    await supabase.from("monitoreos").update({ concluido: true }).eq("id", m.id);
    await loadMonitoreos();
    setShowDetail((prev) => (prev?.id === m.id ? { ...prev, concluido: true } : null));
  };

  if (loading) return <span>Cargando monitoreos...</span>;

  return (
    <div>
      <h5 className="mb-3">Monitoreo</h5>
      <div className="row mb-3">
        <div className="col-md-4">
          <label className="form-label">Cliente</label>
          <select
            className="form-control form-control-sm"
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Parcela</label>
          <select
            className="form-control form-control-sm"
            value={filterParcela}
            onChange={(e) => setFilterParcela(e.target.value)}
          >
            <option value="">Todas</option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre_parcela}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4 d-flex align-items-end">
          <button type="button" className="btn btn-success btn-sm" onClick={handleNuevo}>
            <i className="fas fa-plus mr-1" />
            Nuevo monitoreo
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped table-hover">
          <thead className="thead-dark">
            <tr>
              <th>Cliente</th>
              <th>Parcela</th>
              <th>Zafra</th>
              <th>Ha</th>
              <th>Costo est.</th>
              <th>Concluido</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id}>
                <td>{r.cliente_nombre}</td>
                <td>{r.parcela_nombre}</td>
                <td>{r.zafra_nombre}</td>
                <td>{formatDecimal(r.hectares)}</td>
                <td>{formatDecimal(r.costo_estimado)}</td>
                <td>{r.concluido ? "Sí" : "No"}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-xs btn-outline-success"
                    onClick={() => setShowDetail(r)}
                  >
                    Ver
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">Nuevo monitoreo – Planificación</h5>
                <button type="button" className="close text-white" onClick={resetForm}>
                  <span>&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="form-group">
                    <label>Cliente</label>
                    <select
                      className="form-control"
                      value={form.id_cliente}
                      onChange={(e) => setForm({ ...form, id_cliente: e.target.value, id_parcela: "" })}
                      required
                    >
                      <option value="">Seleccione</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Parcela</label>
                    <select
                      className="form-control"
                      value={form.id_parcela}
                      onChange={(e) => setForm({ ...form, id_parcela: e.target.value })}
                      required
                    >
                      <option value="">Seleccione</option>
                      {parcelasByCliente.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre_parcela}
                          {p.area_real_ha != null ? ` (${formatDecimal(p.area_real_ha)} ha)` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Zafra</label>
                    <select
                      className="form-control"
                      value={form.id_zafra}
                      onChange={(e) => setForm({ ...form, id_zafra: e.target.value })}
                      required
                    >
                      <option value="">Seleccione</option>
                      {zafras.map((z) => (
                        <option key={z.id} value={z.id}>
                          {z.nombre_zafra}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Costo estimado (USD)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      placeholder="0"
                      value={form.costo_estimado}
                      onChange={(e) => setForm({ ...form, costo_estimado: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Productividad estimada (kg/ha)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-control"
                      placeholder="0"
                      value={form.productividad_estimada}
                      onChange={(e) => setForm({ ...form, productividad_estimada: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-success" disabled={saving}>
                    {saving ? "Guardando..." : "Crear"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showDetail && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  Monitoreo – {showDetail.cliente_nombre} / {showDetail.parcela_nombre} / {showDetail.zafra_nombre}
                </h5>
                <button type="button" className="close text-white" onClick={() => setShowDetail(null)}>
                  <span>&times;</span>
                </button>
              </div>
              <div className="modal-body">
                <div className="row mb-3">
                  <div className="col">
                    <div className="card border-primary">
                      <div className="card-body py-2">
                        <strong>Planificación</strong> – Ha: {formatDecimal(showDetail.hectares)} | Costo est.: {formatDecimal(showDetail.costo_estimado)} USD
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <div className="card border-secondary">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <span><strong>Siembra</strong> {showDetail.tiene_siembra ? "– Registrada" : ""}</span>
                        {!showDetail.tiene_siembra && (
                          <button type="button" className="btn btn-sm btn-success" onClick={() => handleIniciarSiembra(showDetail)}>
                            Iniciar Siembra
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <div className="card border-secondary">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <span><strong>Aplicaciones</strong> {showDetail.tiene_aplicaciones ? "– Con registros" : ""}</span>
                        <button type="button" className="btn btn-sm btn-success" onClick={() => handleIniciarAplicacion(showDetail)}>
                          Nueva aplicación
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <div className="card border-secondary">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <span><strong>Evaluaciones</strong> {showDetail.tiene_evaluaciones ? "– Con registros" : ""}</span>
                        <button type="button" className="btn btn-sm btn-success" onClick={() => handleIniciarEvaluacion(showDetail)}>
                          Nueva evaluación
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <div className="card border-secondary">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <span><strong>Cosecha</strong> {showDetail.tiene_cosecha ? "– Registrada" : ""}</span>
                        {!showDetail.tiene_cosecha && showDetail.tiene_siembra && (showDetail.tiene_aplicaciones || showDetail.tiene_evaluaciones) && (
                          <button type="button" className="btn btn-sm btn-success" onClick={() => handleIniciarCosecha(showDetail)}>
                            Iniciar Cosecha
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="row mb-2">
                  <div className="col">
                    <div className="card border-secondary">
                      <div className="card-body py-2 d-flex justify-content-between align-items-center">
                        <span><strong>RTE</strong> {showDetail.tiene_rte ? "– Registrado" : ""}</span>
                        {!showDetail.tiene_rte && showDetail.tiene_cosecha && (
                          <button type="button" className="btn btn-sm btn-success" onClick={() => handleIniciarRte(showDetail)}>
                            Iniciar RTE
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {showDetail.tiene_rte && !showDetail.concluido && (
                  <div className="row">
                    <div className="col">
                      <button type="button" className="btn btn-success" onClick={() => handleConcluir(showDetail)}>
                        Concluir monitoreo
                      </button>
                    </div>
                  </div>
                )}
                {showDetail.concluido && (
                  <p className="text-muted mb-0">Monitoreo concluido. Solo lectura.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

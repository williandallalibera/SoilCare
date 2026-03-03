import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface EvalRow {
  id: string;
  fecha_evaluacion: string;
  fecha_proxima_evaluacion: string | null;
  cliente_nombre: string;
  parcela_nombre: string;
}

const today = new Date().toISOString().slice(0, 10);

export function VisitasTab() {
  const [rows, setRows] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(today);
  const [fechaHasta, setFechaHasta] = useState(today);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("evaluaciones")
        .select("id, fecha_evaluacion, fecha_proxima_evaluacion, id_monitoreo")
        .order("fecha_proxima_evaluacion", { ascending: true });
      if (error || !data) {
        setLoading(false);
        return;
      }
      const monIds = [...new Set((data as any[]).map((d) => d.id_monitoreo).filter(Boolean))];
      let monMap: Record<string, { id_cliente: string; id_parcela: string }> = {};
      if (monIds.length > 0) {
        const { data: mon } = await supabase
          .from("monitoreos")
          .select("id, id_cliente, id_parcela")
          .in("id", monIds);
        if (mon)
          monMap = Object.fromEntries(
            (mon as any[]).map((m) => [m.id, { id_cliente: m.id_cliente, id_parcela: m.id_parcela }])
          );
      }
      const clienteIds = [...new Set(Object.values(monMap).map((v) => v.id_cliente))];
      const parcelaIds = [...new Set(Object.values(monMap).map((v) => v.id_parcela))];
      let clientes: Record<string, string> = {};
      let parcelas: Record<string, string> = {};
      if (clienteIds.length > 0) {
        const { data: c } = await supabase.from("clientes").select("id, nombre").in("id", clienteIds);
        if (c) clientes = Object.fromEntries((c as any[]).map((x) => [x.id, x.nombre]));
      }
      if (parcelaIds.length > 0) {
        const { data: p } = await supabase.from("parcelas").select("id, nombre_parcela").in("id", parcelaIds);
        if (p) parcelas = Object.fromEntries((p as any[]).map((x) => [x.id, x.nombre_parcela]));
      }
      setRows(
        (data as any[]).map((d) => {
          const m = monMap[d.id_monitoreo];
          return {
            id: d.id,
            fecha_evaluacion: d.fecha_evaluacion,
            fecha_proxima_evaluacion: d.fecha_proxima_evaluacion,
            cliente_nombre: m ? clientes[m.id_cliente] ?? "" : "",
            parcela_nombre: m ? parcelas[m.id_parcela] ?? "" : "",
          };
        })
      );
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const prox = r.fecha_proxima_evaluacion ?? "";
      return prox >= fechaDesde && prox <= fechaHasta;
    });
  }, [rows, fechaDesde, fechaHasta]);

  const exportCsv = () => {
    const csv =
      "Fecha evaluación,Fecha próxima,Cliente,Parcela\n" +
      filtered
        .map(
          (r) =>
            `${r.fecha_evaluacion},${r.fecha_proxima_evaluacion ?? ""},${r.cliente_nombre},${r.parcela_nombre}`
        )
        .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visitas_${fechaDesde}_${fechaHasta}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <span>Cargando evaluaciones...</span>;

  return (
    <div>
      <h5 className="mb-3">Visitas / Evaluaciones</h5>
      <p className="text-muted small">
        Por defecto se listan las evaluaciones cuya &quot;Fecha próxima evaluación&quot; es hoy.
        Filtre por período para ver pasado o futuro.
      </p>
      <div className="row mb-3">
        <div className="col-md-2">
          <label className="form-label">Desde</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fechaDesde}
            onChange={(e) => setFechaDesde(e.target.value)}
          />
        </div>
        <div className="col-md-2">
          <label className="form-label">Hasta</label>
          <input
            type="date"
            className="form-control form-control-sm"
            value={fechaHasta}
            onChange={(e) => setFechaHasta(e.target.value)}
          />
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={exportCsv}
          >
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped">
          <thead className="thead-dark">
            <tr>
              <th>Fecha evaluación</th>
              <th>Fecha próxima evaluación</th>
              <th>Cliente</th>
              <th>Parcela</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.fecha_evaluacion}</td>
                <td>{r.fecha_proxima_evaluacion ?? "-"}</td>
                <td>{r.cliente_nombre}</td>
                <td>{r.parcela_nombre}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length === 0 && (
        <p className="text-muted">No hay evaluaciones en el período.</p>
      )}
    </div>
  );
}

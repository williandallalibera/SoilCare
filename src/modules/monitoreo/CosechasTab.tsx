import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";

interface CosechaRow {
  id: string;
  fecha_inicio: string | null;
  fecha_termino: string | null;
  resultado_liquido_kg: number | null;
  productividad_bolsas_alq: number | null;
  costo_total: number | null;
  cliente_nombre: string;
  parcela_nombre: string;
  zafra_nombre: string;
}

export function CosechasTab() {
  const [rows, setRows] = useState<CosechaRow[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCliente, setFilterCliente] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cosechas")
        .select("id, fecha_inicio, fecha_termino, resultado_liquido_kg, productividad_bolsas_alq, costo_total, id_monitoreo")
        .order("created_at", { ascending: false });
      if (error || !data) {
        setLoading(false);
        return;
      }
      const monIds = (data as any[]).map((d) => d.id_monitoreo);
      const { data: mon } = await supabase.from("monitoreos").select("id, id_cliente, id_parcela, id_zafra").in("id", monIds);
      if (!mon?.length) {
        setLoading(false);
        return;
      }
      const cIds = [...new Set((mon as any[]).map((m) => m.id_cliente))];
      const [cRes, pRes, zRes] = await Promise.all([
        supabase.from("clientes").select("id, nombre").in("id", cIds),
        supabase.from("parcelas").select("id, nombre_parcela").in("id", (mon as any[]).map((m) => m.id_parcela)),
        supabase.from("zafras").select("id, nombre_zafra").in("id", (mon as any[]).map((m) => m.id_zafra)),
      ]);
      const cMap: Record<string, string> = Object.fromEntries((cRes.data as any[])?.map((x) => [x.id, x.nombre]) ?? []);
      const pMap: Record<string, string> = Object.fromEntries((pRes.data as any[])?.map((x) => [x.id, x.nombre_parcela]) ?? []);
      const zMap: Record<string, string> = Object.fromEntries((zRes.data as any[])?.map((x) => [x.id, x.nombre_zafra]) ?? []);
      const monMap: Record<string, any> = Object.fromEntries((mon as any[]).map((m) => [m.id, m]));
      setRows(
        (data as any[]).map((d) => {
          const m = monMap[d.id_monitoreo];
          return {
            id: d.id,
            fecha_inicio: d.fecha_inicio,
            fecha_termino: d.fecha_termino,
            resultado_liquido_kg: d.resultado_liquido_kg,
            productividad_bolsas_alq: d.productividad_bolsas_alq,
            costo_total: d.costo_total,
            cliente_nombre: m ? cMap[m.id_cliente] ?? "" : "",
            parcela_nombre: m ? pMap[m.id_parcela] ?? "" : "",
            zafra_nombre: m ? zMap[m.id_zafra] ?? "" : "",
          };
        })
      );
      if (cRes.data) setClientes(cRes.data as any);
      setLoading(false);
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!filterCliente) return rows;
    const name = clientes.find((c) => c.id === filterCliente)?.nombre ?? "";
    return rows.filter((r) => r.cliente_nombre === name);
  }, [rows, filterCliente, clientes]);

  if (loading) return <span>Cargando cosechas...</span>;

  return (
    <div>
      <h5 className="mb-3">Cosechas</h5>
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
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped">
          <thead className="thead-dark">
            <tr>
              <th>Cliente</th>
              <th>Parcela</th>
              <th>Zafra</th>
              <th>Fecha inicio</th>
              <th>Fecha término</th>
              <th>Resultado (kg)</th>
              <th>Bolsas/alq</th>
              <th>Costo total</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td>{r.cliente_nombre}</td>
                <td>{r.parcela_nombre}</td>
                <td>{r.zafra_nombre}</td>
                <td>{r.fecha_inicio ?? "-"}</td>
                <td>{r.fecha_termino ?? "-"}</td>
                <td>{formatDecimal(r.resultado_liquido_kg)}</td>
                <td>{formatDecimal(r.productividad_bolsas_alq)}</td>
                <td>{formatDecimal(r.costo_total)}</td>
                <td>
                  <button type="button" className="btn btn-xs btn-outline-secondary">
                    Ver detalle
                  </button>
                  <button type="button" className="btn btn-xs btn-outline-secondary ml-1">
                    PDF
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

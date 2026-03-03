import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface CbotRow {
  id: string;
  created_at: string;
  vencimiento: string | null;
  ctr: string | null;
  cierre: number | null;
  simulacion: number | null;
  variacion: number | null;
  alto: number | null;
  bajo: number | null;
  apertura: number | null;
  costo: number | null;
  precio_bolsa_simulacion: number | null;
  precio_bolsa: number | null;
  cultura: string;
}

export function CbotTab() {
  const [rows, setRows] = useState<CbotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("cbot")
        .select(
          "id, created_at, vencimiento, ctr, cierre, simulacion, variacion, alto, bajo, apertura, costo, precio_bolsa_simulacion, precio_bolsa, culturas(codigo)"
        )
        .order("created_at", { ascending: false })
        .limit(100);
      if (!error && data) {
        const mapped: CbotRow[] = data.map((d: any) => ({
          id: d.id,
          created_at: d.created_at,
          vencimiento: d.vencimiento,
          ctr: d.ctr,
          cierre: d.cierre,
          simulacion: d.simulacion,
          variacion: d.variacion,
          alto: d.alto,
          bajo: d.bajo,
          apertura: d.apertura,
          costo: d.costo,
          precio_bolsa_simulacion: d.precio_bolsa_simulacion,
          precio_bolsa: d.precio_bolsa,
          cultura: d.culturas?.codigo ?? ""
        }));
        setRows(mapped);
      }
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return <span>Cargando registros de mercado CBOT...</span>;
  }

  return (
    <div className="table-responsive">
      <table className="table table-striped table-sm">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cultura</th>
            <th>Vencimiento</th>
            <th>CTR</th>
            <th>Cierre</th>
            <th>Variación</th>
            <th>Alto</th>
            <th>Bajo</th>
            <th>Precio bolsa</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{new Date(r.created_at).toLocaleDateString()}</td>
              <td>{r.cultura}</td>
              <td>{r.vencimiento ?? "-"}</td>
              <td>{r.ctr ?? "-"}</td>
              <td>{formatNum(r.cierre)}</td>
              <td>{formatNum(r.variacion)}</td>
              <td>{formatNum(r.alto)}</td>
              <td>{formatNum(r.bajo)}</td>
              <td>{formatNum(r.precio_bolsa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatNum(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "-";
  return v.toFixed(3);
}


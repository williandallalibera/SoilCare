import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { exportToCsv } from "../productos/utils";

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

const tableThCls = "text-left px-4 py-3 font-bold text-gray-600 text-[10px] uppercase tracking-wider";
const tableTdCls = "px-4 py-3 text-sm text-gray-700 font-medium";
const inputCls = "px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all";
const labelCls = "block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 px-1";

const today = new Date().toISOString().slice(0, 10);
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function CbotTab() {
  const [rows, setRows] = useState<CbotRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [fechaDesde, setFechaDesde] = useState(thirtyDaysAgo);
  const [fechaHasta, setFechaHasta] = useState(today);

  const load = async () => {
    setLoading(true);
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      console.log("CbotTab: Review Mode - Injecting mock cbot data");
      setRows([
        { id: "cb-1", created_at: new Date().toISOString(), vencimiento: "MAR 26", ctr: "123", cierre: 420.5, simulacion: 425.0, variacion: 1.5, alto: 422.0, bajo: 418.0, apertura: 419.0, costo: 15.0, precio_bolsa_simulacion: 410.0, precio_bolsa: 405.0, cultura: "SOJA" },
        { id: "cb-2", created_at: new Date(Date.now() - 86400000).toISOString(), vencimiento: "MAY 26", ctr: "124", cierre: 430.0, simulacion: 432.0, variacion: -0.5, alto: 435.0, bajo: 428.0, apertura: 431.0, costo: 15.0, precio_bolsa_simulacion: 420.0, precio_bolsa: 415.0, cultura: "MAIZ" }
      ]);
      setLoading(false);
      return;
    }

    let query = supabase
      .from("cbot")
      .select(
        "id, created_at, vencimiento, ctr, cierre, simulacion, variacion, alto, bajo, apertura, costo, precio_bolsa_simulacion, precio_bolsa, culturas(codigo)"
      )
      .order("created_at", { ascending: false });

    if (fechaDesde) {
      query = query.gte("created_at", fechaDesde);
    }
    if (fechaHasta) {
      query = query.lte("created_at", fechaHasta + "T23:59:59");
    }

    const { data, error } = await query.limit(500);

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

  useEffect(() => {
    load();
  }, [fechaDesde, fechaHasta]);

  const handleExportCsv = () => {
    const columns = [
      { key: "fecha", header: "Fecha" },
      { key: "cultura", header: "Cultura" },
      { key: "vencimiento", header: "Vencimiento" },
      { key: "cierre", header: "Cierre" },
      { key: "variacion", header: "Variación" },
      { key: "precio_bolsa", header: "Precio Bolsa" }
    ];
    const data = rows.map(r => ({
      fecha: new Date(r.created_at).toLocaleDateString(),
      cultura: r.cultura,
      vencimiento: r.vencimiento || "-",
      cierre: r.cierre?.toFixed(3) || "-",
      variacion: r.variacion?.toFixed(3) || "-",
      precio_bolsa: r.precio_bolsa?.toFixed(3) || "-"
    }));
    exportToCsv(data, `cbot_mkt_${fechaDesde}_${fechaHasta}.csv`, columns);
  };

  return (
    <div className="p-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
            <i className="fas fa-chart-line" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-tight">Mercado de Chicago (CBOT)</h3>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Histórico de Cotizaciones</p>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className={labelCls}>Desde</label>
            <input type="date" className={inputCls} value={fechaDesde} onChange={(e) => setFechaDesde(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Hasta</label>
            <input type="date" className={inputCls} value={fechaHasta} onChange={(e) => setFechaHasta(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all"
          >
            <i className="fas fa-download text-xs" /> Exportar CSV
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-100 shadow-sm">
        {loading ? (
          <div className="p-20 text-center text-gray-400">
            <i className="fas fa-spinner fa-spin mr-2" />Cargando cotizaciones...
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className={tableThCls}>Fecha</th>
                <th className={tableThCls}>Cultura</th>
                <th className={tableThCls}>Vencs.</th>
                <th className={`${tableThCls} text-right`}>Cierre</th>
                <th className={`${tableThCls} text-right`}>Simul.</th>
                <th className={`${tableThCls} text-right`}>Variación</th>
                <th className={`${tableThCls} text-right`}>Alto</th>
                <th className={`${tableThCls} text-right`}>Bajo</th>
                <th className={`${tableThCls} text-right`}>Precio Bolsa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className={tableTdCls}>
                    <div className="font-bold text-gray-900">{new Date(r.created_at).toLocaleDateString()}</div>
                    <div className="text-[10px] text-gray-400 uppercase font-black">{new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className={tableTdCls}>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase">{r.cultura}</span>
                  </td>
                  <td className={tableTdCls}>
                    <div className="text-xs text-gray-500 font-bold uppercase">{r.vencimiento ?? "-"}</div>
                    <div className="text-[10px] text-gray-400">CTR: {r.ctr ?? "-"}</div>
                  </td>
                  <td className={`${tableTdCls} text-right font-mono text-gray-900 font-bold tracking-tighter`}>{formatNum(r.cierre)}</td>
                  <td className={`${tableTdCls} text-right font-mono text-gray-400`}>{formatNum(r.simulacion)}</td>
                  <td className={`${tableTdCls} text-right font-mono font-bold ${(r.variacion ?? 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {(r.variacion ?? 0) > 0 ? '+' : ''}{formatNum(r.variacion)}
                  </td>
                  <td className={`${tableTdCls} text-right font-mono text-xs text-gray-400`}>{formatNum(r.alto)}</td>
                  <td className={`${tableTdCls} text-right font-mono text-xs text-gray-400`}>{formatNum(r.bajo)}</td>
                  <td className={`${tableTdCls} text-right font-mono text-blue-600 font-black`}>${formatNum(r.precio_bolsa)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {!loading && rows.length === 0 && (
          <div className="py-20 text-center text-gray-300">
            <i className="fas fa-layer-group text-3xl mb-3 block opacity-20" />
            No hay datos de mercado disponibles para este período.
          </div>
        )}
      </div>
    </div>
  );
}

function formatNum(v: number | null): string {
  if (v === null || Number.isNaN(v)) return "-";
  return v.toFixed(3);
}

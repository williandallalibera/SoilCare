import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { formatDecimal } from "../productos/utils";

type SubTab = "voucher" | "movimiento";

interface VoucherRow {
  id: string;
  id_cliente: string;
  valor_total_generado: number;
  valor_total_liberado: number;
  valor_restante: number;
  cliente_nombre: string;
}

interface MovRow {
  id: string;
  fecha: string;
  cliente_nombre: string;
  valor_generado: number | null;
  valor_liberado: number | null;
  porcentaje_liberado: number | null;
  tipo: string;
}

export function VouchersTab() {
  const { perfil } = useAuth();
  const [subTab, setSubTab] = useState<SubTab>("voucher");
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [movRows, setMovRows] = useState<MovRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [liberarClienteId, setLiberarClienteId] = useState<string | null>(null);
  const [pctLiberar, setPctLiberar] = useState("");
  const [saving, setSaving] = useState(false);
  const [filterNombre, setFilterNombre] = useState("");
  const [filterTipo, setFilterTipo] = useState("");
  const [filterFechaDesde, setFilterFechaDesde] = useState("");
  const [filterFechaHasta, setFilterFechaHasta] = useState("");

  const loadVouchers = async () => {
    const { data, error } = await supabase
      .from("vouchers")
      .select("id, id_cliente, valor_total_generado, valor_total_liberado, valor_restante")
      .order("valor_restante", { ascending: false });
    if (error || !data) return;
    const ids = (data as any[]).map((d) => d.id_cliente);
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre")
        .in("id", ids);
      if (clientes)
        names = Object.fromEntries((clientes as any[]).map((c) => [c.id, c.nombre]));
    }
    setRows(
      (data as any[]).map((d) => ({
        id: d.id,
        id_cliente: d.id_cliente,
        valor_total_generado: d.valor_total_generado ?? 0,
        valor_total_liberado: d.valor_total_liberado ?? 0,
        valor_restante: d.valor_restante ?? 0,
        cliente_nombre: names[d.id_cliente] ?? "",
      }))
    );
  };

  const loadMovimientos = async () => {
    const { data, error } = await supabase
      .from("movimiento_vouchers")
      .select("id, id_cliente, fecha, valor_generado, valor_liberado, porcentaje_liberado, tipo")
      .order("fecha", { ascending: false });
    if (error || !data) return;
    const ids = [...new Set((data as any[]).map((d) => d.id_cliente))];
    let names: Record<string, string> = {};
    if (ids.length > 0) {
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nombre")
        .in("id", ids);
      if (clientes)
        names = Object.fromEntries((clientes as any[]).map((c) => [c.id, c.nombre]));
    }
    setMovRows(
      (data as any[]).map((d) => ({
        id: d.id,
        fecha: d.fecha,
        cliente_nombre: names[d.id_cliente] ?? "",
        valor_generado: d.valor_generado,
        valor_liberado: d.valor_liberado,
        porcentaje_liberado: d.porcentaje_liberado,
        tipo: d.tipo,
      }))
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadVouchers(), loadMovimientos()]);
      setLoading(false);
    };
    load();
  }, []);

  const filteredVouchers = useMemo(() => {
    let list = rows;
    if (filterNombre.trim()) {
      const q = filterNombre.toLowerCase();
      list = list.filter((r) => r.cliente_nombre.toLowerCase().includes(q));
    }
    return list;
  }, [rows, filterNombre]);

  const filteredMov = useMemo(() => {
    let list = movRows;
    if (filterTipo) list = list.filter((r) => r.tipo === filterTipo);
    if (filterFechaDesde)
      list = list.filter((r) => r.fecha >= filterFechaDesde);
    if (filterFechaHasta)
      list = list.filter((r) => r.fecha.slice(0, 10) <= filterFechaHasta);
    if (filterNombre.trim()) {
      const q = filterNombre.toLowerCase();
      list = list.filter((r) => r.cliente_nombre.toLowerCase().includes(q));
    }
    return list;
  }, [movRows, filterTipo, filterFechaDesde, filterFechaHasta, filterNombre]);

  const handleLiberar = async (voucher: VoucherRow) => {
    setLiberarClienteId(voucher.id_cliente);
    setPctLiberar("");
  };

  const confirmLiberar = async () => {
    if (!liberarClienteId || !pctLiberar) return;
    const pct = Number(pctLiberar);
    if (pct <= 0 || pct > 100) {
      alert("Porcentaje entre 1 y 100.");
      return;
    }
    setSaving(true);
    const row = rows.find((r) => r.id_cliente === liberarClienteId);
    if (!row) {
      setSaving(false);
      return;
    }
    const valorLiberado = Number(((row.valor_restante * pct) / 100).toFixed(3));
    const nuevoRestante = Number((row.valor_restante - valorLiberado).toFixed(3));
    const nuevoLiberado = Number((row.valor_total_liberado + valorLiberado).toFixed(3));
    await supabase
      .from("vouchers")
      .update({
        valor_total_liberado: nuevoLiberado,
        valor_restante: Math.max(0, nuevoRestante),
      })
      .eq("id_cliente", liberarClienteId);
    await supabase.from("movimiento_vouchers").insert({
      id_voucher: row.id,
      id_cliente: liberarClienteId,
      valor_liberado: valorLiberado,
      porcentaje_liberado: pct,
      tipo: "liberado",
      id_usuario: perfil?.id,
    });
    await loadVouchers();
    await loadMovimientos();
    setLiberarClienteId(null);
    setPctLiberar("");
    setSaving(false);
  };

  const exportMovCsv = () => {
    const cols = [
      { key: "fecha", header: "Fecha" },
      { key: "cliente_nombre", header: "Cliente" },
      { key: "tipo", header: "Tipo" },
      { key: "valor_generado", header: "Valor generado" },
      { key: "valor_liberado", header: "Valor liberado" },
      { key: "porcentaje_liberado", header: "% liberado" },
    ];
    const csv =
      cols.map((c) => c.header).join(",") +
      "\n" +
      filteredMov
        .map((r) =>
          cols
            .map((c) => {
              const v = (r as any)[c.key];
              if (c.key === "fecha")
                return new Date(v).toLocaleString("es-PY");
              return v ?? "";
            })
            .join(",")
        )
        .join("\n");
    const blob = new Blob(["\uFEFF" + csv], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `movimiento_vouchers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <span>Cargando vouchers...</span>;

  return (
    <div>
      <ul className="nav nav-pills mb-3">
        <li className="nav-item">
          <button
            className={`nav-link ${subTab === "voucher" ? "active" : ""}`}
            onClick={() => setSubTab("voucher")}
            type="button"
          >
            Voucher
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${subTab === "movimiento" ? "active" : ""}`}
            onClick={() => setSubTab("movimiento")}
            type="button"
          >
            Movimiento Vouchers
          </button>
        </li>
      </ul>

      {subTab === "voucher" && (
        <>
          <h5 className="mb-3">Voucher</h5>
          <div className="row mb-3">
            <div className="col-md-4">
              <label className="form-label">Buscar por nombre</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Cliente"
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
              />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead className="thead-dark">
                <tr>
                  <th>Cliente</th>
                  <th>Valor total generado (USD)</th>
                  <th>Valor liberado (USD)</th>
                  <th>Valor restante (USD)</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredVouchers.map((r) => (
                  <tr key={r.id}>
                    <td>{r.cliente_nombre}</td>
                    <td>{formatDecimal(r.valor_total_generado)}</td>
                    <td>{formatDecimal(r.valor_total_liberado)}</td>
                    <td>{formatDecimal(r.valor_restante)}</td>
                    <td>
                      {r.valor_restante > 0 && (
                        <button
                          type="button"
                          className="btn btn-xs btn-success"
                          onClick={() => handleLiberar(r)}
                        >
                          Liberar %
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {liberarClienteId && (
            <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
              <div className="modal-dialog">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Porcentaje a liberar</h5>
                    <button
                      type="button"
                      className="close"
                      onClick={() => setLiberarClienteId(null)}
                    >
                      <span>&times;</span>
                    </button>
                  </div>
                  <div className="modal-body">
                    <div className="form-group">
                      <label>Porcentaje (%)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0.01"
                        max="100"
                        className="form-control"
                        value={pctLiberar}
                        onChange={(e) => setPctLiberar(e.target.value)}
                        placeholder="Ej: 50"
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setLiberarClienteId(null)}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="btn btn-success"
                      onClick={confirmLiberar}
                      disabled={saving || !pctLiberar}
                    >
                      {saving ? "Guardando..." : "Confirmar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {subTab === "movimiento" && (
        <>
          <h5 className="mb-3">Movimiento Vouchers</h5>
          <div className="row mb-3">
            <div className="col-md-2">
              <label className="form-label">Tipo</label>
              <select
                className="form-control form-control-sm"
                value={filterTipo}
                onChange={(e) => setFilterTipo(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="generado">Generado</option>
                <option value="liberado">Liberado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterFechaDesde}
                onChange={(e) => setFilterFechaDesde(e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filterFechaHasta}
                onChange={(e) => setFilterFechaHasta(e.target.value)}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Buscar cliente</label>
              <input
                type="text"
                className="form-control form-control-sm"
                value={filterNombre}
                onChange={(e) => setFilterNombre(e.target.value)}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={exportMovCsv}
              >
                Exportar CSV
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-striped">
              <thead className="thead-dark">
                <tr>
                  <th>Fecha</th>
                  <th>Cliente</th>
                  <th>Tipo</th>
                  <th>Valor generado</th>
                  <th>Valor liberado</th>
                  <th>% liberado</th>
                </tr>
              </thead>
              <tbody>
                {filteredMov.map((r) => (
                  <tr key={r.id}>
                    <td>{new Date(r.fecha).toLocaleString("es-PY")}</td>
                    <td>{r.cliente_nombre}</td>
                    <td>{r.tipo}</td>
                    <td>{formatDecimal(r.valor_generado)}</td>
                    <td>{formatDecimal(r.valor_liberado)}</td>
                    <td>{formatDecimal(r.porcentaje_liberado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { exportToCsv, formatDecimal } from "./utils";

interface ProductoRow {
  id: string;
  sku: string;
  nombre: string;
  fabricante: string | null;
  estado: string;
  created_at: string;
  categoria_desc?: string;
  precio_final: number | null;
}

interface Lookup {
  id: string;
  codigo?: string;
  descripcion: string;
}

/** Calcula Precio Final según PRD (3 decimales) */
function calcPrecioFinal(form: {
  precio_compra: number;
  margen: number;
  costo_operacional: number;
  costo_financiero: number;
  bonificacion_vendedor: number;
  bonificacion_cliente: number;
  voucher: number;
}): { precio_venta: number; impacto_total: number; precio_final: number } {
  const pc = form.precio_compra || 0;
  const margenPct = (form.margen || 0) / 100;
  const calcMargen = pc * margenPct;
  const precio_venta = pc + calcMargen;

  const pv = precio_venta;
  const calcVoucher = pv * ((form.voucher || 0) / 100);
  const calcCostoOp = pv * ((form.costo_operacional || 0) / 100);
  const calcCostoFin = pv * ((form.costo_financiero || 0) / 100);
  const calcBonifVend = pv * ((form.bonificacion_vendedor || 0) / 100);
  const calcBonifCliente = pv * ((form.bonificacion_cliente || 0) / 100);
  const impacto_total =
    calcVoucher + calcCostoOp + calcCostoFin + calcBonifVend + calcBonifCliente;
  const precio_final = precio_venta + impacto_total;

  return {
    precio_venta: Number(precio_venta.toFixed(3)),
    impacto_total: Number(impacto_total.toFixed(3)),
    precio_final: Number(precio_final.toFixed(3)),
  };
}

/** Genera SKU único */
function generateSku(): string {
  return `PROD-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const CSV_COLUMNS = [
  { key: "sku", header: "SKU" },
  { key: "nombre", header: "Nombre" },
  { key: "categoria_desc", header: "Categoría" },
  { key: "fabricante", header: "Fabricante" },
  { key: "precio_final", header: "Precio final (USD)" },
  { key: "estado", header: "Estado" },
  { key: "created_at", header: "Fecha creación" },
];

export function ProductoTab() {
  const [rows, setRows] = useState<ProductoRow[]>([]);
  const [categorias, setCategorias] = useState<Lookup[]>([]);
  const [unidades, setUnidades] = useState<Lookup[]>([]);
  const [culturas, setCulturas] = useState<Lookup[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ProductoRow | null>(null);
  const [form, setForm] = useState({
    sku: "",
    id_categoria: "",
    nombre: "",
    fabricante: "",
    culturas: [] as string[],
    composicion: "",
    id_unidad_medida: "",
    contenido_empaque: "",
    estado: "activo",
    precio_compra: "",
    margen: "",
    costo_operacional: "",
    costo_financiero: "",
    bonificacion_vendedor: "",
    bonificacion_cliente: "",
    voucher: "",
    precio_minimo: "",
  });
  const [filterEstado, setFilterEstado] = useState("");
  const [filterBusqueda, setFilterBusqueda] = useState("");
  const [filterCategoria, setFilterCategoria] = useState("");

  const loadProductos = async () => {
    const { data, error } = await supabase
      .from("productos")
      .select(
        "id, sku, nombre, fabricante, estado, created_at, precio_final, id_categoria, categorias_producto(descripcion)"
      )
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(
        (data as any[]).map((d) => ({
          id: d.id,
          sku: d.sku,
          nombre: d.nombre,
          fabricante: d.fabricante,
          estado: d.estado,
          created_at: d.created_at,
          precio_final: d.precio_final,
          categoria_desc: d.categorias_producto?.descripcion ?? "-",
        }))
      );
    }
  };

  const loadLookups = async () => {
    const [cat, un, cul] = await Promise.all([
      supabase.from("categorias_producto").select("id, codigo, descripcion"),
      supabase.from("unidades_medida").select("id, codigo, descripcion"),
      supabase.from("culturas").select("id, codigo, descripcion"),
    ]);
    if (cat.data) setCategorias(cat.data as Lookup[]);
    if (un.data) setUnidades(un.data as Lookup[]);
    if (cul.data) setCulturas(cul.data as Lookup[]);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([loadProductos(), loadLookups()]);
      setLoading(false);
    };
    load();
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterEstado) list = list.filter((r) => r.estado === filterEstado);
    if (filterCategoria)
      list = list.filter((r) => r.categoria_desc === filterCategoria);
    if (filterBusqueda.trim()) {
      const q = filterBusqueda.toLowerCase();
      list = list.filter(
        (r) =>
          r.sku.toLowerCase().includes(q) ||
          r.nombre.toLowerCase().includes(q) ||
          (r.fabricante && r.fabricante.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rows, filterEstado, filterCategoria, filterBusqueda]);

  const computed = useMemo(
    () =>
      calcPrecioFinal({
        precio_compra: Number(form.precio_compra) || 0,
        margen: Number(form.margen) || 0,
        costo_operacional: Number(form.costo_operacional) || 0,
        costo_financiero: Number(form.costo_financiero) || 0,
        bonificacion_vendedor: Number(form.bonificacion_vendedor) || 0,
        bonificacion_cliente: Number(form.bonificacion_cliente) || 0,
        voucher: Number(form.voucher) || 0,
      }),
    [
      form.precio_compra,
      form.margen,
      form.costo_operacional,
      form.costo_financiero,
      form.bonificacion_vendedor,
      form.bonificacion_cliente,
      form.voucher,
    ]
  );

  const resetForm = () => {
    setEditing(null);
    setForm({
      sku: "",
      id_categoria: "",
      nombre: "",
      fabricante: "",
      culturas: [],
      composicion: "",
      id_unidad_medida: "",
      contenido_empaque: "",
      estado: "activo",
      precio_compra: "",
      margen: "",
      costo_operacional: "",
      costo_financiero: "",
      bonificacion_vendedor: "",
      bonificacion_cliente: "",
      voucher: "",
      precio_minimo: "",
    });
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setForm((f) => ({ ...f, sku: generateSku(), estado: "activo" }));
    setShowModal(true);
  };

  const handleEdit = async (row: ProductoRow) => {
    const { data } = await supabase
      .from("productos")
      .select("*")
      .eq("id", row.id)
      .single();
    if (!data) return;
    const d = data as any;
    setEditing(row);
    setForm({
      sku: d.sku,
      id_categoria: d.id_categoria ?? "",
      nombre: d.nombre,
      fabricante: d.fabricante ?? "",
      culturas: Array.isArray(d.culturas) ? d.culturas : [],
      composicion: d.composicion ?? "",
      id_unidad_medida: d.id_unidad_medida ?? "",
      contenido_empaque: d.contenido_empaque != null ? String(d.contenido_empaque) : "",
      estado: d.estado,
      precio_compra: d.precio_compra != null ? String(d.precio_compra) : "",
      margen: d.margen != null ? String(d.margen) : "",
      costo_operacional: d.costo_operacional != null ? String(d.costo_operacional) : "",
      costo_financiero: d.costo_financiero != null ? String(d.costo_financiero) : "",
      bonificacion_vendedor:
        d.bonificacion_vendedor != null ? String(d.bonificacion_vendedor) : "",
      bonificacion_cliente:
        d.bonificacion_cliente != null ? String(d.bonificacion_cliente) : "",
      voucher: d.voucher != null ? String(d.voucher) : "",
      precio_minimo: d.precio_minimo != null ? String(d.precio_minimo) : "",
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      sku: form.sku.trim(),
      id_categoria: form.id_categoria || null,
      nombre: form.nombre.trim(),
      fabricante: form.fabricante.trim() || null,
      culturas: form.culturas,
      composicion: form.composicion.trim() || null,
      id_unidad_medida: form.id_unidad_medida || null,
      contenido_empaque:
        form.contenido_empaque !== "" ? Number(form.contenido_empaque) : null,
      estado: form.estado,
      precio_compra:
        form.precio_compra !== "" ? Number(form.precio_compra) : null,
      margen: form.margen !== "" ? Number(form.margen) : null,
      precio_venta: computed.precio_venta,
      costo_operacional:
        form.costo_operacional !== "" ? Number(form.costo_operacional) : null,
      costo_financiero:
        form.costo_financiero !== "" ? Number(form.costo_financiero) : null,
      bonificacion_vendedor:
        form.bonificacion_vendedor !== ""
          ? Number(form.bonificacion_vendedor)
          : null,
      bonificacion_cliente:
        form.bonificacion_cliente !== ""
          ? Number(form.bonificacion_cliente)
          : null,
      voucher: form.voucher !== "" ? Number(form.voucher) : null,
      impacto_total_costo: computed.impacto_total,
      precio_final: computed.precio_final,
      precio_minimo:
        form.precio_minimo !== "" ? Number(form.precio_minimo) : null,
    };

    if (editing) {
      await supabase.from("productos").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("productos").insert(payload);
    }
    await loadProductos();
    resetForm();
    setSaving(false);
  };

  const toggleCultura = (id: string) => {
    setForm((f) => ({
      ...f,
      culturas: f.culturas.includes(id)
        ? f.culturas.filter((x) => x !== id)
        : [...f.culturas, id],
    }));
  };

  const handleExportCsv = () => {
    const toExport = filteredRows.map((r) => ({
      ...r,
      precio_final: formatDecimal(r.precio_final),
      created_at: new Date(r.created_at).toLocaleDateString("es-PY"),
    }));
    exportToCsv(
      toExport,
      `productos_${new Date().toISOString().slice(0, 10)}.csv`,
      CSV_COLUMNS
    );
  };

  if (loading) {
    return <span>Cargando productos...</span>;
  }

  const categoriasUnicas = useMemo(
    () => Array.from(new Set(rows.map((r) => r.categoria_desc).filter(Boolean))),
    [rows]
  );

  return (
    <div>
      <h5 className="mb-3">Producto</h5>
      <div className="row mb-3">
        <div className="col-md-2">
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
        <div className="col-md-2">
          <label className="form-label">Categoría</label>
          <select
            className="form-control form-control-sm"
            value={filterCategoria}
            onChange={(e) => setFilterCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {categoriasUnicas.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="col-md-4">
          <label className="form-label">Buscar</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="SKU, nombre o fabricante"
            value={filterBusqueda}
            onChange={(e) => setFilterBusqueda(e.target.value)}
          />
        </div>
        <div className="col-md-4 d-flex align-items-end gap-2">
          <button type="button" className="btn btn-success btn-sm" onClick={handleNuevo}>
            <i className="fas fa-plus mr-1" />
            Nuevo
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={handleExportCsv}
          >
            <i className="fas fa-download mr-1" />
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped table-hover">
          <thead className="thead-dark">
            <tr>
              <th>SKU</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Fabricante</th>
              <th>Precio final (USD)</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className={r.estado === "inactivo" ? "table-secondary" : ""}>
                <td>{r.sku}</td>
                <td>{r.nombre}</td>
                <td>{r.categoria_desc}</td>
                <td>{r.fabricante ?? "-"}</td>
                <td>{formatDecimal(r.precio_final)}</td>
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
      {filteredRows.length === 0 && <p className="text-muted">No hay registros.</p>}

      {/* Modal Producto */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  {editing ? "Editar producto" : "Nuevo producto"}
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
                  <h6 className="border-bottom pb-1">Info generales</h6>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>SKU</label>
                        <input
                          className="form-control"
                          value={form.sku}
                          readOnly
                          placeholder="Se generará al guardar"
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Categoría</label>
                        <select
                          className="form-control"
                          value={form.id_categoria}
                          onChange={(e) =>
                            setForm({ ...form, id_categoria: e.target.value })
                          }
                        >
                          <option value="">Seleccione</option>
                          {categorias.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="form-group">
                        <label>Nombre</label>
                        <input
                          className="form-control"
                          placeholder="Nombre del producto"
                          value={form.nombre}
                          onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Fabricante</label>
                        <input
                          className="form-control"
                          placeholder="Fabricante"
                          value={form.fabricante}
                          onChange={(e) =>
                            setForm({ ...form, fabricante: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Culturas</label>
                    <div className="d-flex gap-3">
                      {culturas.map((c) => (
                        <label key={c.id} className="mb-0">
                          <input
                            type="checkbox"
                            checked={form.culturas.includes(c.id)}
                            onChange={() => toggleCultura(c.id)}
                          />
                          <span className="ml-1">{c.descripcion}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Composición</label>
                        <input
                          className="form-control"
                          placeholder="Composición"
                          value={form.composicion}
                          onChange={(e) =>
                            setForm({ ...form, composicion: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Unidad de medida</label>
                        <select
                          className="form-control"
                          value={form.id_unidad_medida}
                          onChange={(e) =>
                            setForm({ ...form, id_unidad_medida: e.target.value })
                          }
                        >
                          <option value="">Seleccione</option>
                          {unidades.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.descripcion}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="form-group">
                        <label>Contenido empaque</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.contenido_empaque}
                          onChange={(e) =>
                            setForm({ ...form, contenido_empaque: e.target.value })
                          }
                        />
                      </div>
                    </div>
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

                  <h6 className="border-bottom pb-1 mt-4">Composición de precio</h6>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Precio de compra (USD)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.precio_compra}
                          onChange={(e) =>
                            setForm({ ...form, precio_compra: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Margen (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.margen}
                          onChange={(e) =>
                            setForm({ ...form, margen: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Precio de venta (USD)</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          readOnly
                          value={formatDecimal(computed.precio_venta)}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Costo operacional (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.costo_operacional}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              costo_operacional: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Costo financiero (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.costo_financiero}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              costo_financiero: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Bonificación vendedor (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.bonificacion_vendedor}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              bonificacion_vendedor: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Bonificación cliente (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.bonificacion_cliente}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              bonificacion_cliente: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Voucher (%)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.voucher}
                          onChange={(e) =>
                            setForm({ ...form, voucher: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Precio mínimo (USD)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="0"
                          value={form.precio_minimo}
                          onChange={(e) =>
                            setForm({ ...form, precio_minimo: e.target.value })
                          }
                        />
                      </div>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Impacto total en el costo (USD)</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          readOnly
                          value={formatDecimal(computed.impacto_total)}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Precio final (USD)</label>
                        <input
                          type="text"
                          className="form-control bg-light font-weight-bold"
                          readOnly
                          value={formatDecimal(computed.precio_final)}
                        />
                      </div>
                    </div>
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

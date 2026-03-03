import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => { setCenter: (c: object) => void; setZoom: (z: number) => void };
        event: { addListener: (obj: object, ev: string, fn: (p: unknown) => void) => void };
        geometry: { spherical: { computeArea: (path: { getLength: () => number; getAt: (i: number) => { lat: () => number; lng: () => number } }) => number } };
        drawing: {
          DrawingManager: new (opts: object) => { setMap: (m: unknown) => void };
          OverlayType: { POLYGON: string };
        };
      };
    };
    initParcelasMap?: () => void;
  }
}

interface ParcelaRow {
  id: string;
  nombre_parcela: string;
  localidad: string | null;
  area_prevista_ha: number | null;
  area_real_ha: number | null;
  estado: string;
  id_cliente: string;
  cliente_nombre: string;
  created_at: string;
}

const PARAGUAY_CENTER = { lat: -23.4425, lng: -58.4438 };
const DEFAULT_ZOOM = 6;

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

export function ParcelasTab() {
  const [rows, setRows] = useState<ParcelaRow[]>([]);
  const [clientes, setClientes] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<ParcelaRow | null>(null);
  const [form, setForm] = useState({
    id_cliente: "",
    nombre_parcela: "",
    localidad: "",
    area_prevista_ha: "",
    area_real_ha: "",
    estado: "activo",
  });
  const [filterEstado, setFilterEstado] = useState("");
  const [filterCliente, setFilterCliente] = useState("");
  const [filterBusqueda, setFilterBusqueda] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [apiKey, setApiKey] = useState<string | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);
  const polygonRef = useRef<unknown>(null);
  const drawingManagerRef = useRef<unknown>(null);

  const loadParcelas = async () => {
    const { data, error } = await supabase
      .from("parcelas")
      .select("id, nombre_parcela, localidad, area_prevista_ha, area_real_ha, estado, id_cliente, created_at")
      .order("created_at", { ascending: false });
    if (!error && data) {
      const ids = [...new Set((data as any[]).map((d) => d.id_cliente))];
      let names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: c } = await supabase.from("clientes").select("id, nombre").in("id", ids);
        if (c) names = Object.fromEntries((c as any[]).map((x) => [x.id, x.nombre]));
      }
      setRows(
        (data as any[]).map((d) => ({
          id: d.id,
          nombre_parcela: d.nombre_parcela,
          localidad: d.localidad,
          area_prevista_ha: d.area_prevista_ha,
          area_real_ha: d.area_real_ha,
          estado: d.estado,
          id_cliente: d.id_cliente,
          cliente_nombre: names[d.id_cliente] ?? "",
          created_at: d.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await loadParcelas();
      const { data } = await supabase.from("clientes").select("id, nombre").eq("estado", "activo");
      if (data) setClientes(data as any);
      const { data: int } = await supabase.from("integraciones").select("api_google_maps").limit(1).maybeSingle();
      setApiKey((int as any)?.api_google_maps ?? null);
      setLoading(false);
    };
    load();
  }, []);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterEstado) list = list.filter((r) => r.estado === filterEstado);
    if (filterCliente) list = list.filter((r) => r.id_cliente === filterCliente);
    if (filterBusqueda.trim()) {
      const q = filterBusqueda.toLowerCase();
      list = list.filter(
        (r) =>
          r.nombre_parcela.toLowerCase().includes(q) ||
          (r.localidad && r.localidad.toLowerCase().includes(q))
      );
    }
    return list;
  }, [rows, filterEstado, filterCliente, filterBusqueda]);

  useEffect(() => {
    if (!showModal || !apiKey || !mapRef.current) return;
    if (window.google?.maps) {
      initMap();
      return;
    }
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing,geometry&callback=initParcelasMap`;
    script.async = true;
    window.initParcelasMap = () => {
      setMapReady(true);
    };
    document.head.appendChild(script);
    return () => {
      window.initParcelasMap = undefined;
    };
  }, [showModal, apiKey]);

  useEffect(() => {
    if (mapReady && mapRef.current && window.google && !mapInstanceRef.current) {
      initMap();
    }
  }, [mapReady]);

  function initMap() {
    const g = window.google;
    if (!mapRef.current || !g) return;
    const map = new g.maps.Map(mapRef.current, {
      center: PARAGUAY_CENTER,
      zoom: DEFAULT_ZOOM,
    });
    mapInstanceRef.current = map;
    const drawingManager = new g.maps.drawing.DrawingManager({
      drawingMode: g.maps.drawing.OverlayType.POLYGON,
      drawingControl: false,
      polygonOptions: {
        fillColor: "rgba(100, 180, 255, 0.4)",
        strokeColor: "#64b4ff",
        clickable: true,
        editable: true,
      },
    });
    (drawingManager as { setMap: (m: unknown) => void }).setMap(map);
    drawingManagerRef.current = drawingManager;
    g.maps.event.addListener(drawingManager, "polygoncomplete", (polygon: { getPath: () => { getLength: () => number; getAt: (i: number) => { lat: () => number; lng: () => number } } }) => {
      polygonRef.current = polygon;
      const path = polygon.getPath();
      const areaM2 = g.maps.geometry.spherical.computeArea(path);
      const areaHa = Number((areaM2 / 10000).toFixed(3));
      setForm((f) => ({ ...f, area_prevista_ha: String(areaHa) }));
    });
  }

  const clearMap = () => {
    const p = polygonRef.current as { setMap: (m: null) => void } | null;
    if (p) {
      p.setMap(null);
      polygonRef.current = null;
    }
    setForm((f) => ({ ...f, area_prevista_ha: "" }));
  };

  const miraMap = () => {
    if (!navigator.geolocation || !mapInstanceRef.current) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const center = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        const m = mapInstanceRef.current as { setCenter: (c: object) => void; setZoom: (z: number) => void };
        m?.setCenter(center);
        m?.setZoom(14);
      },
      () => alert("No se pudo obtener la ubicación.")
    );
  };

  const resetForm = () => {
    setEditing(null);
    setForm({
      id_cliente: "",
      nombre_parcela: "",
      localidad: "",
      area_prevista_ha: "",
      area_real_ha: "",
      estado: "activo",
    });
    if (mapInstanceRef.current) {
      const p = polygonRef.current as { setMap: (m: null) => void } | null;
      if (p) {
        p.setMap(null);
        polygonRef.current = null;
      }
      mapInstanceRef.current = null;
      const dm = drawingManagerRef.current as { setMap: (m: null) => void } | null;
      if (dm) dm.setMap(null);
      drawingManagerRef.current = null;
    }
    setMapReady(false);
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = async (row: ParcelaRow) => {
    const { data } = await supabase.from("parcelas").select("*").eq("id", row.id).single();
    if (!data) return;
    const d = data as any;
    setEditing(row);
    setForm({
      id_cliente: d.id_cliente,
      nombre_parcela: d.nombre_parcela,
      localidad: d.localidad ?? "",
      area_prevista_ha: d.area_prevista_ha != null ? String(d.area_prevista_ha) : "",
      area_real_ha: d.area_real_ha != null ? String(d.area_real_ha) : "",
      estado: d.estado,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    let geom: object | null = null;
    const poly = polygonRef.current as { getPath: () => { getLength: () => number; getAt: (i: number) => { lat: () => number; lng: () => number } } } | null;
    if (poly) {
      const path = poly.getPath();
      const coords: [number, number][] = [];
      for (let i = 0; i < path.getLength(); i++) {
        const pt = path.getAt(i);
        coords.push([pt.lng(), pt.lat()]);
      }
      geom = { type: "Polygon", coordinates: [coords] };
    }
    const payload = {
      id_cliente: form.id_cliente,
      nombre_parcela: form.nombre_parcela.trim(),
      localidad: form.localidad.trim() || null,
      area_prevista_ha: form.area_prevista_ha !== "" ? Number(form.area_prevista_ha) : null,
      area_real_ha: form.area_real_ha !== "" ? Number(form.area_real_ha) : null,
      estado: form.estado,
      geom: geom ?? undefined,
    };
    if (editing) {
      await supabase.from("parcelas").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("parcelas").insert(payload);
    }
    await loadParcelas();
    resetForm();
    setSaving(false);
  };

  const exportCsv = () => {
    const cols = [
      { key: "nombre_parcela", header: "Nombre parcela" },
      { key: "cliente_nombre", header: "Cliente" },
      { key: "localidad", header: "Localidad" },
      { key: "area_prevista_ha", header: "Área prevista (ha)" },
      { key: "area_real_ha", header: "Área real (ha)" },
      { key: "estado", header: "Estado" },
      { key: "created_at", header: "Fecha creación" },
    ];
    const csv =
      cols.map((c) => c.header).join(",") +
      "\n" +
      filteredRows
        .map((r) =>
          cols
            .map((c) => {
              const v = (r as any)[c.key];
              if (c.key === "created_at") return new Date(v).toLocaleDateString("es-PY");
              return v ?? "";
            })
            .join(",")
        )
        .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `parcelas_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <span>Cargando parcelas...</span>;

  return (
    <div>
      <h5 className="mb-3">Parcelas</h5>
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
        <div className="col-md-3">
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
        <div className="col-md-3">
          <label className="form-label">Buscar</label>
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Nombre o localidad"
            value={filterBusqueda}
            onChange={(e) => setFilterBusqueda(e.target.value)}
          />
        </div>
        <div className="col-md-4 d-flex align-items-end gap-2">
          <button type="button" className="btn btn-success btn-sm" onClick={handleNuevo}>
            <i className="fas fa-plus mr-1" />
            Nuevo
          </button>
          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={exportCsv}>
            <i className="fas fa-download mr-1" />
            Exportar CSV
          </button>
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm table-striped table-hover">
          <thead className="thead-dark">
            <tr>
              <th>Nombre parcela</th>
              <th>Cliente</th>
              <th>Localidad</th>
              <th>Área prevista (ha)</th>
              <th>Área real (ha)</th>
              <th>Estado</th>
              <th>Fecha creación</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((r) => (
              <tr key={r.id} className={r.estado === "inactivo" ? "table-secondary" : ""}>
                <td>{r.nombre_parcela}</td>
                <td>{r.cliente_nombre}</td>
                <td>{r.localidad ?? "-"}</td>
                <td>{formatDecimal(r.area_prevista_ha)}</td>
                <td>{formatDecimal(r.area_real_ha)}</td>
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

      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  {editing ? "Editar parcela" : "Nueva parcela"}
                </h5>
                <button type="button" className="close text-white" onClick={resetForm}>
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {!apiKey && (
                    <div className="alert alert-warning">
                      Configure la API de Google Maps en Ajustes &gt; Integraciones.
                    </div>
                  )}
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Cliente</label>
                        <select
                          className="form-control"
                          value={form.id_cliente}
                          onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
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
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Nombre parcela</label>
                        <input
                          className="form-control"
                          placeholder="Nombre de la parcela"
                          value={form.nombre_parcela}
                          onChange={(e) => setForm({ ...form, nombre_parcela: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Localidad</label>
                        <input
                          className="form-control"
                          placeholder="Localidad"
                          value={form.localidad}
                          onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                  {apiKey && (
                    <>
                      <div className="form-group">
                        <label>Mapa – dibuje el polígono en el mapa</label>
                        <div
                          ref={mapRef}
                          style={{ height: "400px", width: "100%", background: "#e9ecef" }}
                        />
                      </div>
                      <div className="mb-2">
                        <button type="button" className="btn btn-sm btn-outline-primary mr-2" onClick={miraMap}>
                          Mira
                        </button>
                        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={clearMap}>
                          Clear
                        </button>
                      </div>
                    </>
                  )}
                  <div className="row">
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Área prevista (ha)</label>
                        <input
                          type="text"
                          className="form-control bg-light"
                          readOnly
                          value={form.area_prevista_ha}
                          placeholder="Se calcula al cerrar el polígono"
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="form-group">
                        <label>Área real (ha)</label>
                        <input
                          type="number"
                          step="0.001"
                          className="form-control"
                          placeholder="Ingrese el área real"
                          value={form.area_real_ha}
                          onChange={(e) => setForm({ ...form, area_real_ha: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
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
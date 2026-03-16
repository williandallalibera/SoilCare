import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";

declare global {
  interface Window {
    google?: {
      maps: {
        Map: new (el: HTMLElement, opts: object) => {
          setCenter: (c: object) => void;
          setZoom: (z: number) => void;
          fitBounds: (b: any) => void;
        };
        event: { addListener: (obj: object, ev: string, fn: (p: unknown) => void) => void };
        geometry: { spherical: { computeArea: (path: any) => number } };
        drawing: {
          DrawingManager: new (opts: object) => {
            setMap: (m: any) => void;
            setDrawingMode: (mode: any) => void;
          };
          OverlayType: { POLYGON: string };
        };
        Polygon: new (opts: object) => any;
        LatLngBounds: new () => any;
        LatLng: new (lat: number, lng: number) => any;
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
  geom: any | null;
  created_at: string;
}

const PARAGUAY_CENTER = { lat: -23.4425, lng: -58.4438 };
const DEFAULT_ZOOM = 6;

const ESTADOS = [
  { value: "", label: "Todos" },
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
];

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all";
const labelCls = "block text-xs font-bold text-gray-600 mb-1";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all";

function getStaticMapUrl(geom: any, apiKey: string | null) {
  if (!geom || !apiKey || geom.type !== "Polygon" || !geom.coordinates[0]) return null;
  const coords = geom.coordinates[0];
  const path = coords.map((c: any) => `${c[1]},${c[0]}`).join("|");
  return `https://maps.googleapis.com/maps/api/staticmap?size=100x100&maptype=satellite&path=color:0xff0000ff|fillcolor:0xff000044|weight:2|${path}&key=${apiKey}`;
}

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
  const [historyState, setHistoryState] = useState({ list: [] as (any[] | null)[], step: -1 });
  const isRedrawing = useRef(false);
  const saveTimeout = useRef<any>(null);

  const saveHistoryStateRef = useRef<any>(null);
  const updateAreaDisplayRef = useRef<any>(null);

  useEffect(() => {
    saveHistoryStateRef.current = saveHistoryState;
    updateAreaDisplayRef.current = updateAreaDisplay;
  });

  const loadParcelas = async () => {
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      console.log("ParcelasTab: Review Mode - Injecting mock parcelas");
      setRows([{
        id: "pa-1", nombre_parcela: "Lote 1", localidad: "San Alberto", area_prevista_ha: 105, area_real_ha: 100, estado: "activo", id_cliente: "cl-1", cliente_nombre: "Fazenda Santa Maria", geom: null, created_at: new Date().toISOString()
      }]);
      return;
    }

    const { data, error } = await supabase
      .from("parcelas")
      .select("id, nombre_parcela, localidad, area_prevista_ha, area_real_ha, estado, id_cliente, geom, created_at")
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
          geom: d.geom,
          created_at: d.created_at,
        }))
      );
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      await loadParcelas();

      const envKey = (import.meta as any).env.VITE_GOOGLE_MAPS_API_KEY ?? null;

      if (isReviewMode) {
        setClientes([{ id: "cl-1", nombre: "Fazenda Santa Maria" }]);
        setApiKey(envKey || "AIzaSyBiZxljlMaoLLgpqN1qkMLhawWlF0nkQh4");
        setLoading(false);
        return;
      }

      const { data } = await supabase.from("clientes").select("id, nombre").eq("estado", "activo");
      if (data) setClientes(data as any);

      const { data: int } = await supabase.from("integraciones").select("api_google_maps").limit(1).maybeSingle();
      const dbKey = (int as any)?.api_google_maps ?? null;
      setApiKey(dbKey || envKey || "AIzaSyBiZxljlMaoLLgpqN1qkMLhawWlF0nkQh4");
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
    script.onerror = () => {
      console.error("Google Maps failed to load. Check your API Key.");
      setLoading(false);
    };
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
      mapTypeId: 'satellite'
    });
    mapInstanceRef.current = map;

    const polygonOptions = {
      fillColor: "rgba(100, 180, 255, 0.4)",
      strokeColor: "#64b4ff",
      strokeWeight: 2,
      clickable: true,
      editable: true,
    };

    // Removemos o DrawingManager para assumir o controle ponto a ponto.

    if (editing?.geom && editing.geom.type === "Polygon") {
      const coords = editing.geom.coordinates[0].map((c: any) => ({ lat: c[1], lng: c[0] }));
      const poly = new g.maps.Polygon({
        paths: coords,
        ...polygonOptions
      });
      poly.setMap(map);
      polygonRef.current = poly;

      const path = poly.getPath();
      g.maps.event.addListener(path, "insert_at", () => {
        console.log("Map: insert_at");
        saveHistoryStateRef.current?.(poly);
      });
      g.maps.event.addListener(path, "remove_at", () => {
        console.log("Map: remove_at");
        saveHistoryStateRef.current?.(poly);
      });
      g.maps.event.addListener(path, "set_at", () => {
        console.log("Map: set_at");
        saveHistoryStateRef.current?.(poly);
      });

      // Initial state
      const initialCoords = coords.map((c: any) => ({ lat: c.lat, lng: c.lng }));
      setHistoryState({ list: [initialCoords], step: 0 });

      const bounds = new g.maps.LatLngBounds();
      coords.forEach((c: any) => bounds.extend(c));
      map.fitBounds(bounds);
    }

    // Controle customizado para desenho e edição Ponto-a-Ponto (Undo dinâmico)
    g.maps.event.addListener(map, "click", (e: any) => {
      let p = polygonRef.current as any;

      if (!p) {
        // Inicia um novo polígono com o primeiro ponto
        p = new g.maps.Polygon({
          paths: [e.latLng],
          ...polygonOptions
        });
        p.setMap(map);
        polygonRef.current = p;

        const path = p.getPath();
        g.maps.event.addListener(path, "insert_at", () => {
          saveHistoryStateRef.current?.(p);
        });
        g.maps.event.addListener(path, "remove_at", () => {
          saveHistoryStateRef.current?.(p);
        });
        g.maps.event.addListener(path, "set_at", () => {
          saveHistoryStateRef.current?.(p);
        });

        // Salva imediatamente o estado contendo o 1º ponto
        saveHistoryStateRef.current?.(p, true);
      } else {
        // Se já existe, apenas adiciona o ponto no final (dispara insert_at e salva no histórico)
        const path = p.getPath();
        path.push(e.latLng);
      }
    });
  }

  // Saving state for undo/redo
  const saveHistoryState = (poly: any, immediate = false) => {
    if (isRedrawing.current) return;

    const save = () => {
      console.log("saveHistoryState: executing save...");
      // poly might be null if we are saving an empty state (clear)
      let currentCoords: any[] | null = null;
      if (poly) {
        const path = poly.getPath();
        currentCoords = [];
        for (let i = 0; i < path.getLength(); i++) {
          const pt = path.getAt(i);
          currentCoords.push({ lat: pt.lat(), lng: pt.lng() });
        }
      }

      setHistoryState(prev => {
        const last = prev.list[prev.step];
        if (last && currentCoords && JSON.stringify(last) === JSON.stringify(currentCoords)) {
          console.log("saveHistoryState: identical state, ignoring");
          return prev;
        }

        const newList = prev.list.slice(0, prev.step + 1);
        newList.push(currentCoords);
        console.log("saveHistoryState: saved. new step =", newList.length - 1, newList);
        return { list: newList, step: newList.length - 1 };
      });
      if (poly) updateAreaDisplayRef.current?.(poly);
      else setForm(f => ({ ...f, area_prevista_ha: "" }));
    };

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    if (immediate) {
      save();
    } else {
      saveTimeout.current = setTimeout(save, 500);
    }
  };

  const updateAreaDisplay = (poly: any) => {
    const g = window.google;
    if (!g) return;
    const areaM2 = g.maps.geometry.spherical.computeArea(poly.getPath());
    const areaHa = Number((areaM2 / 10000).toFixed(3));
    setForm((f) => ({ ...f, area_prevista_ha: String(areaHa) }));
  }

  const handleUndo = () => {
    console.log("handleUndo: current step", historyState.step);
    if (historyState.step >= 0) {
      const newStep = historyState.step - 1;
      setHistoryState(prev => ({ ...prev, step: newStep }));
      const coords = newStep >= 0 ? historyState.list[newStep] : null;
      if (!coords) {
        clearMap(false); // clear map but don't reset history list
      } else {
        redrawPolygon(coords);
      }
    }
  };

  const handleRedo = () => {
    if (historyState.step < historyState.list.length - 1) {
      const newStep = historyState.step + 1;
      setHistoryState(prev => ({ ...prev, step: newStep }));

      // Se estava vazio e vai refazer o primeiro, precisa garantir que o polígono existe
      // (caso o usuário tenha limpado o mapa via Undo)
      const coords = historyState.list[newStep];
      if (!coords) return;

      if (!polygonRef.current) {
        reconstructPolygon(coords);
      } else {
        redrawPolygon(coords);
      }
    }
  };

  const reconstructPolygon = (coords: any[] | null) => {
    if (!coords) return;
    const g = window.google;
    if (!g || !mapInstanceRef.current) return;
    const poly = new g.maps.Polygon({
      paths: coords,
      fillColor: "rgba(100, 180, 255, 0.4)",
      strokeColor: "#64b4ff",
      strokeWeight: 2,
      clickable: true,
      editable: true,
    });
    poly.setMap(mapInstanceRef.current as any);
    polygonRef.current = poly;

    const path = poly.getPath();
    g.maps.event.addListener(path, "insert_at", () => saveHistoryStateRef.current?.(poly));
    g.maps.event.addListener(path, "remove_at", () => saveHistoryStateRef.current?.(poly));
    g.maps.event.addListener(path, "set_at", () => saveHistoryStateRef.current?.(poly));

    updateAreaDisplayRef.current?.(poly);
  };

  const redrawPolygon = (coords: any[] | null) => {
    const p = polygonRef.current as any;
    if (!p || !coords) return;
    isRedrawing.current = true;

    // Evita resetar toda a MVCArray usando setPath (pois destrói os listeners). 
    // Em vez disso, limpamos a path e repovoamos.
    const path = p.getPath();
    const g = window.google;
    if (!g) return;

    path.clear();
    coords.forEach((c: any) => {
      const isLatLng = typeof c.lat === "function";
      path.push(isLatLng ? c : new g.maps.LatLng(c.lat, c.lng));
    });

    updateAreaDisplay(p);
    setTimeout(() => {
      isRedrawing.current = false;
    }, 100);
  };

  const clearMap = (resetHistory = true) => {
    const p = polygonRef.current as { setMap: (m: null) => void } | null;
    if (p) {
      p.setMap(null);
      polygonRef.current = null;
    }
    if (resetHistory) {
      setHistoryState({ list: [], step: -1 });
    }
    setForm((f) => ({ ...f, area_prevista_ha: "" }));
  };

  const handleManualClear = () => {
    saveHistoryState(null, true); // save an empty state in history
    clearMap(false); // clear map but keep history list
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
    setHistoryState({ list: [], step: -1 });
    setMapReady(false);
    setShowModal(false);
  };

  const handleNuevo = () => {
    resetForm();
    setShowModal(true);
  };

  const handleEdit = (row: ParcelaRow) => {
    setEditing(row);
    setForm({
      id_cliente: row.id_cliente,
      nombre_parcela: row.nombre_parcela,
      localidad: row.localidad ?? "",
      area_prevista_ha: row.area_prevista_ha != null ? String(row.area_prevista_ha) : "",
      area_real_ha: row.area_real_ha != null ? String(row.area_real_ha) : "",
      estado: row.estado,
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
      // Close the ring for GeoJSON standard
      if (coords.length > 2) {
        const first = coords[0];
        const last = coords[coords.length - 1];
        if (first[0] !== last[0] || first[1] !== last[1]) {
          coords.push([first[0], first[1]]);
        }
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
      { key: "created_at", header: "Fecha criação" },
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

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <i className="fas fa-spinner fa-spin mr-2" />Cargando parcelas...
    </div>
  );

  return (
    <div>
      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div className="min-w-[140px]">
          <label className={labelCls}>Estado</label>
          <select
            className={inputCls}
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
        <div className="min-w-[180px]">
          <label className={labelCls}>Cliente</label>
          <select
            className={inputCls}
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
        <div className="flex-1 min-w-[200px]">
          <label className={labelCls}>Buscar</label>
          <div className="relative">
            <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              className={`${inputCls} pl-8`}
              placeholder="Nombre o localidade..."
              value={filterBusqueda}
              onChange={(e) => setFilterBusqueda(e.target.value)}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnPrimary} onClick={handleNuevo}>
            <i className="fas fa-plus text-xs" /> Nuevo
          </button>
          <button type="button" className={btnSecondary} onClick={exportCsv}>
            <i className="fas fa-download text-xs" /> Exportar CSV
          </button>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Mapa</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Nombre parcela</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Localidad</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Área prev (ha)</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Área real (ha)</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Estado</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRows.map((r) => (
              <tr key={r.id} className={`hover:bg-gray-50 transition-colors ${r.estado === "inactivo" ? "opacity-60" : ""}`}>
                <td className="px-4 py-3">
                  <div className="w-12 h-12 bg-agro-primary/10 rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden shadow-sm">
                    {getStaticMapUrl(r.geom, apiKey) ? (
                      <img
                        src={getStaticMapUrl(r.geom, apiKey)!}
                        alt="Mapa"
                        className="w-full h-full object-cover shadow-inner"
                      />
                    ) : (
                      <i className="fas fa-map-marked-alt text-agro-primary opacity-30 text-lg" />
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{r.nombre_parcela}</td>
                <td className="px-4 py-3 text-gray-600">{r.cliente_nombre}</td>
                <td className="px-4 py-3 text-gray-500">{r.localidad ?? "—"}</td>
                <td className="px-4 py-3 text-gray-900 font-mono">{formatDecimal(r.area_prevista_ha)}</td>
                <td className="px-4 py-3 text-gray-900 font-mono">{formatDecimal(r.area_real_ha)}</td>
                <td className="px-4 py-3">
                  {r.estado === "activo" ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      Activo
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">
                      Inactivo
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">{new Date(r.created_at).toLocaleDateString("es-PY")}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs font-bold text-agro-primary hover:underline"
                    onClick={() => handleEdit(r)}
                  >
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <i className="fas fa-map-marked-alt mb-2 text-2xl block" />
            No hay parcelas registradas.
          </div>
        )}
      </div>

      {/* ── Modal ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-agro-primary/10 text-agro-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-map-marker-alt text-sm" />
                </div>
                <h3 className="font-bold text-gray-900">
                  {editing ? "Editar parcela" : "Nueva parcela"}
                </h3>
              </div>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6">
                {!apiKey && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
                    <i className="fas fa-exclamation-triangle text-amber-500" />
                    Configure la API de Google Maps en Ajustes &gt; Integraciones para usar el mapa.
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Cliente *</label>
                    <select
                      className={inputCls}
                      value={form.id_cliente}
                      onChange={(e) => setForm({ ...form, id_cliente: e.target.value })}
                      required
                    >
                      <option value="">Seleccione</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id}>{c.nombre}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Nombre parcela *</label>
                    <input
                      className={inputCls}
                      placeholder="Nombre de la parcela"
                      value={form.nombre_parcela}
                      onChange={(e) => setForm({ ...form, nombre_parcela: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Localidad</label>
                    <input
                      className={inputCls}
                      placeholder="Localidad"
                      value={form.localidad}
                      onChange={(e) => setForm({ ...form, localidad: e.target.value })}
                    />
                  </div>
                </div>

                {apiKey && (
                  <div className="space-y-2">
                    <label className={labelCls}>Mapa – dibuje el polígono en el mapa</label>
                    <div className="relative rounded-2xl overflow-hidden border border-gray-200">
                      <div
                        ref={mapRef}
                        style={{ height: "400px", width: "100%", background: "#f8f9fa" }}
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <button type="button" className={`px-3 py-1.5 bg-white shadow-md rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 border border-gray-100 transition-all ${historyState.step >= 0 ? "text-gray-700" : "text-gray-300 cursor-not-allowed"}`} onClick={handleUndo} disabled={historyState.step < 0}>
                          <i className="fas fa-undo" /> Deshacer
                        </button>
                        <button type="button" className={`px-3 py-1.5 bg-white shadow-md rounded-lg text-xs font-bold hover:bg-gray-50 flex items-center gap-2 border border-gray-100 transition-all ${historyState.step < historyState.list.length - 1 ? "text-gray-700" : "text-gray-300 cursor-not-allowed"}`} onClick={handleRedo} disabled={historyState.step >= historyState.list.length - 1}>
                          <i className="fas fa-redo" /> Rehacer
                        </button>
                        <button type="button" className="px-3 py-1.5 bg-white shadow-md rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border border-gray-100" onClick={miraMap}>
                          <i className="fas fa-location-arrow text-agro-primary" /> Mi ubicación
                        </button>
                        <button type="button" className="px-3 py-1.5 bg-white shadow-md rounded-lg text-xs font-bold text-gray-700 hover:bg-gray-50 flex items-center gap-2 border border-gray-100" onClick={handleManualClear}>
                          <i className="fas fa-trash-alt text-red-500" /> Limpiar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelCls}>Área prevista (ha)</label>
                    <input
                      type="text"
                      className={`${inputCls} bg-gray-50 font-mono`}
                      readOnly
                      value={form.area_prevista_ha}
                      placeholder="Automático (mapa)"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Área real (ha)</label>
                    <input
                      type="number"
                      step="0.001"
                      className={inputCls}
                      placeholder="0.000"
                      value={form.area_real_ha}
                      onChange={(e) => setForm({ ...form, area_real_ha: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Estado</label>
                    <select
                      className={inputCls}
                      value={form.estado}
                      onChange={(e) => setForm({ ...form, estado: e.target.value })}
                    >
                      <option value="activo">Activo</option>
                      <option value="inactivo">Inactivo</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0">
                <button type="button" className={btnSecondary} onClick={resetForm}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                  ) : editing ? "Guardar cambios" : "Crear parcela"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
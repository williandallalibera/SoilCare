import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { formatDecimal } from "../productos/utils";
import { AplicacionModal } from "./AplicacionModal";
import { CosechaModal } from "./CosechaModal";
import { EvaluacionModal } from "./EvaluacionModal";
import { RteModal } from "./RteModal";
import { SiembraModal } from "./SiembraModal";

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

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all";
const labelCls = "block text-xs font-bold text-gray-600 mb-1";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all";

export function MonitoreoTab() {
  const { perfil } = useAuth();
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
  const [siembraModal, setSiembraModal] = useState<{ monitoreo: MonitoreoRow; siembraId: string } | null>(null);
  const [aplicacionModal, setAplicacionModal] = useState<{ aplicacionId: string; monitoreo: MonitoreoRow; areaHa: number | null } | null>(null);
  const [aplicacionesList, setAplicacionesList] = useState<{ id: string; fecha_aplicacion: string | null }[]>([]);
  const [cosechaModal, setCosechaModal] = useState<{ cosechaId: string; monitoreo: MonitoreoRow } | null>(null);
  const [rteModal, setRteModal] = useState<{ rteId: string; monitoreo: MonitoreoRow } | null>(null);
  const [evaluacionModal, setEvaluacionModal] = useState<{ evaluacionId: string; monitoreo: MonitoreoRow } | null>(null);
  const [evaluacionesList, setEvaluacionesList] = useState<{ id: string; fecha_evaluacion: string }[]>([]);
  const [siembraData, setSiembraData] = useState<{ id: string; fecha_inicio: string | null; fecha_termino: string | null; costo_total: number | null } | null>(null);
  const [cosechaData, setCosechaData] = useState<{ id: string; fecha_inicio: string | null; fecha_termino: string | null; costo_total: number | null } | null>(null);
  const [rteDataRow, setRteDataRow] = useState<{ id: string; costo_total: number | null; ingreso_total: number | null; resultado_tecnico: number | null } | null>(null);
  const [filterEtapa, setFilterEtapa] = useState("");
  const [editPlanificacion, setEditPlanificacion] = useState(false);

  
  useEffect(() => {
    if (!showDetail?.id) {
      setSiembraData(null);
      setCosechaData(null);
      setRteDataRow(null);
      return;
    }
    const loadExtra = async () => {
      if (showDetail.tiene_siembra) {
        const { data } = await supabase.from("siembra").select("id, fecha_inicio, fecha_termino, costo_total").eq("id_monitoreo", showDetail.id).single();
        setSiembraData((data as any) || null);
      }
      if (showDetail.tiene_cosecha) {
        const { data } = await supabase.from("cosechas").select("id, fecha_inicio, fecha_termino, costo_total").eq("id_monitoreo", showDetail.id).single();
        setCosechaData((data as any) || null);
      }
      if (showDetail.tiene_rte) {
        const { data } = await supabase.from("rte").select("id, costo_total, ingreso_total, resultado_tecnico").eq("id_monitoreo", showDetail.id).single();
        setRteDataRow((data as any) || null);
      }
    };
    loadExtra();
  }, [showDetail?.id, showDetail?.tiene_siembra, showDetail?.tiene_cosecha, showDetail?.tiene_rte]);

  // Accordion state
  const [expandedAplicaciones, setExpandedAplicaciones] = useState(false);
  const [expandedEvaluaciones, setExpandedEvaluaciones] = useState(false);

  const loadMonitoreos = async () => {
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      console.log("MonitoreoTab: Review Mode - Injecting mock monitoreos");
      setRows([{
        id: "m-1", id_cliente: "cl-1", id_parcela: "pa-1", id_zafra: "z-1", hectares: 100, costo_estimado: 5000, productividad_estimada: 3500, tiene_siembra: true, tiene_aplicaciones: true, tiene_evaluaciones: true, tiene_cosecha: false, tiene_rte: false, concluido: false, cliente_nombre: "Fazenda Santa Maria", parcela_nombre: "Lote 1", zafra_nombre: "2023/2024", created_at: new Date().toISOString()
      }]);
      return;
    }

    let q = supabase
      .from("monitoreos")
      .select("id, id_cliente, id_parcela, id_zafra, hectares, costo_estimado, productividad_estimada, tiene_siembra, tiene_aplicaciones, tiene_evaluaciones, tiene_cosecha, tiene_rte, concluido, created_at")
      .order("created_at", { ascending: false });

    if (perfil?.perfil_acceso === "rtv") {
      const { data: clientesRtv } = await supabase.from("clientes").select("id").eq("id_vendedor", perfil.id);
      const ids = (clientesRtv ?? []).map((c: { id: string }) => c.id);
      if (ids.length === 0) {
        setRows([]);
        return;
      }
      q = q.in("id_cliente", ids);
    }
    const { data, error } = await q;
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
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      await loadMonitoreos();

      if (isReviewMode) {
        setClientes([{ id: "cl-1", nombre: "Fazenda Santa Maria" }]);
        setParcelas([{ id: "pa-1", nombre_parcela: "Lote 1", id_cliente: "cl-1", area_real_ha: 100 }]);
        setZafras([{ id: "z-1", nombre_zafra: "2023/2024" }]);
        setLoading(false);
        return;
      }

      let clientesQ = supabase.from("clientes").select("id, nombre").eq("estado", "activo");
      if (perfil?.perfil_acceso === "rtv") {
        clientesQ = clientesQ.eq("id_vendedor", perfil.id);
      }
      const [c, p, z] = await Promise.all([
        clientesQ,
        supabase.from("parcelas").select("id, nombre_parcela, id_cliente, area_real_ha").eq("estado", "activo"),
        supabase.from("zafras").select("id, nombre_zafra").eq("estado", "activo"),
      ]);
      if (c.data) setClientes(c.data as any);
      if (p.data) setParcelas(p.data as any);
      if (z.data) setZafras(z.data as any);
      setLoading(false);
    };
    load();
  }, [perfil?.id, perfil?.perfil_acceso]);

  const parcelasByCliente = useMemo(() => {
    if (!form.id_cliente) return parcelas;
    return parcelas.filter((p) => p.id_cliente === form.id_cliente);
  }, [parcelas, form.id_cliente]);

  useEffect(() => {
    if (!showDetail?.id || !showDetail.tiene_aplicaciones) {
      setAplicacionesList([]);
      setExpandedAplicaciones(false);
      return;
    }
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setAplicacionesList([
        { id: "app-1", fecha_aplicacion: "2024-01-15T10:00:00.000Z" },
        { id: "app-2", fecha_aplicacion: "2024-02-20T14:30:00.000Z" }
      ]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("aplicaciones")
        .select("id, fecha_aplicacion")
        .eq("id_monitoreo", showDetail.id)
        .order("fecha_aplicacion", { ascending: false });
      setAplicacionesList((data as any[]) ?? []);
    };
    load();
  }, [showDetail?.id, showDetail?.tiene_aplicaciones]);

  useEffect(() => {
    if (!showDetail?.id || !showDetail.tiene_evaluaciones) {
      setEvaluacionesList([]);
      setExpandedEvaluaciones(false);
      return;
    }
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setEvaluacionesList([
        { id: "ev-1", fecha_evaluacion: "2024-01-20T09:00:00.000Z" },
        { id: "ev-2", fecha_evaluacion: "2024-03-05T11:15:00.000Z" }
      ]);
      return;
    }
    const load = async () => {
      const { data } = await supabase
        .from("evaluaciones")
        .select("id, fecha_evaluacion")
        .eq("id_monitoreo", showDetail.id)
        .order("fecha_evaluacion", { ascending: false });
      setEvaluacionesList((data as any[]) ?? []);
    };
    load();
  }, [showDetail?.id, showDetail?.tiene_evaluaciones]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (filterCliente) list = list.filter((r) => r.id_cliente === filterCliente);
    if (filterParcela) list = list.filter((r) => r.id_parcela === filterParcela);
    if (filterEtapa) {
      list = list.filter((r) => {
        if (filterEtapa === "concluido") return r.concluido;
        if (filterEtapa === "rte") return r.tiene_rte;
        if (filterEtapa === "cosecha") return r.tiene_cosecha;
        if (filterEtapa === "evaluacion") return r.tiene_evaluaciones;
        if (filterEtapa === "aplicacion") return r.tiene_aplicaciones;
        if (filterEtapa === "siembra") return r.tiene_siembra;
        if (filterEtapa === "planificacion") return !r.tiene_siembra && !r.tiene_aplicaciones && !r.tiene_evaluaciones && !r.tiene_cosecha && !r.concluido;
        return true;
      });
    }
    // Busqueda por cliente o parcela se puede hacer combinando o en sus dropdowns
    return list;
  }, [rows, filterCliente, filterParcela, filterEtapa]);

  const exportCSV = () => {
    const headers = ["Cliente", "Parcela", "Zafra", "Hectareas", "Costo Est.", "Status", "Fecha Creacion"];
    const csvRows = [headers.join(",")];
    for (const r of filteredRows) {
      const status = r.concluido ? "Concluido" : "Em Pista";
      csvRows.push([r.cliente_nombre, r.parcela_nombre, r.zafra_nombre, r.hectares, r.costo_estimado, status, r.created_at].join(","));
    }
    const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "monitoreos.csv";
    a.click();
  };

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
    
    if (editPlanificacion && showDetail) {
      await supabase.from("monitoreos").update({
        id_cliente: form.id_cliente,
        id_parcela: form.id_parcela,
        id_zafra: form.id_zafra,
        hectares,
        costo_estimado: form.costo_estimado !== "" ? Number(form.costo_estimado) : null,
        productividad_estimada: form.productividad_estimada !== "" ? Number(form.productividad_estimada) : null,
      }).eq("id", showDetail.id);
      await loadMonitoreos();
      setShowDetail(null);
      setEditPlanificacion(false);
    } else {
      await supabase.from("monitoreos").insert({
        id_cliente: form.id_cliente,
        id_parcela: form.id_parcela,
        id_zafra: form.id_zafra,
        hectares,
        costo_estimado: form.costo_estimado !== "" ? Number(form.costo_estimado) : null,
        productividad_estimada: form.productividad_estimada !== "" ? Number(form.productividad_estimada) : null,
      });
      await loadMonitoreos();
    }
    resetForm();
    setSaving(false);
  };

  const handleIniciarSiembra = async (m: MonitoreoRow) => {
    if (m.tiene_siembra) return;
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setSiembraModal({ monitoreo: m, siembraId: "mock-siembra-id" });
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_siembra: true } : prev));
      return;
    }

    const { data } = await supabase.from("siembra").insert({ id_monitoreo: m.id }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_siembra: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_siembra: true } : prev));
      setSiembraModal({ monitoreo: m, siembraId: (data as any).id });
    }
  };

  const handleVerSiembra = async (m: MonitoreoRow) => {
    const { data } = await supabase.from("siembra").select("id").eq("id_monitoreo", m.id).single();
    if (data) setSiembraModal({ monitoreo: m, siembraId: (data as any).id });
  };

  const handleIniciarAplicacion = async (m: MonitoreoRow) => {
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setAplicacionModal({
        aplicacionId: "mock-app-" + Date.now(),
        monitoreo: m,
        areaHa: m.hectares ?? 100,
      });
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_aplicaciones: true } : prev));
      return;
    }

    const { data } = await supabase.from("aplicaciones").insert({ id_monitoreo: m.id }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_aplicaciones: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_aplicaciones: true } : prev));
      setAplicacionModal({
        aplicacionId: (data as any).id,
        monitoreo: m,
        areaHa: parcelas.find((p) => p.id === m.id_parcela)?.area_real_ha ?? m.hectares ?? null,
      });
    }
  };

  const handleVerAplicacion = (aplicacionId: string, m: MonitoreoRow) => {
    setAplicacionModal({
      aplicacionId,
      monitoreo: m,
      areaHa: parcelas.find((p) => p.id === m.id_parcela)?.area_real_ha ?? m.hectares ?? null,
    });
  };

  const handleIniciarEvaluacion = async (m: MonitoreoRow) => {
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setEvaluacionModal({ evaluacionId: "mock-ev-" + Date.now(), monitoreo: m });
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_evaluaciones: true } : prev));
      return;
    }

    const { data } = await supabase.from("evaluaciones").insert({ id_monitoreo: m.id, fecha_evaluacion: new Date().toISOString().slice(0, 10) }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_evaluaciones: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_evaluaciones: true } : prev));
      setEvaluacionModal({ evaluacionId: (data as any).id, monitoreo: m });
    }
  };

  const handleVerEvaluacion = (evaluacionId: string, m: MonitoreoRow) => {
    setEvaluacionModal({ evaluacionId, monitoreo: m });
  };

  const handleIniciarCosecha = async (m: MonitoreoRow) => {
    if (m.tiene_cosecha) return;
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setCosechaModal({ cosechaId: "mock-cosecha-id", monitoreo: m });
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_cosecha: true } : prev));
      return;
    }

    const { data } = await supabase.from("cosechas").insert({ id_monitoreo: m.id }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_cosecha: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_cosecha: true } : prev));
      setCosechaModal({ cosechaId: (data as any).id, monitoreo: m });
    }
  };

  const handleVerCosecha = async (m: MonitoreoRow) => {
    const { data } = await supabase.from("cosechas").select("id").eq("id_monitoreo", m.id).single();
    if (data) setCosechaModal({ cosechaId: (data as any).id, monitoreo: m });
  };

  const handleIniciarRte = async (m: MonitoreoRow) => {
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      setRteModal({ rteId: "mock-rte-" + Date.now(), monitoreo: m });
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_rte: true } : prev));
      return;
    }

    const { data } = await supabase.from("rte").insert({ id_monitoreo: m.id, costo_total: 0, ingreso_total: 0, resultado_tecnico: 0 }).select("id").single();
    if (data) {
      await supabase.from("monitoreos").update({ tiene_rte: true }).eq("id", m.id);
      await loadMonitoreos();
      setShowDetail((prev) => (prev?.id === m.id ? { ...prev, tiene_rte: true } : prev));
      setRteModal({ rteId: (data as any).id, monitoreo: m });
    }
  };

  const handleVerRte = async (m: MonitoreoRow) => {
    const { data } = await supabase.from("rte").select("id").eq("id_monitoreo", m.id).single();
    if (data) setRteModal({ rteId: (data as any).id, monitoreo: m });
  };

  const handleConcluir = async (m: MonitoreoRow) => {
    await supabase.from("monitoreos").update({ concluido: true }).eq("id", m.id);
    await loadMonitoreos();
    setShowDetail((prev) => (prev?.id === m.id ? { ...prev, concluido: true } : null));
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 text-gray-400">
      <i className="fas fa-spinner fa-spin mr-2" />Cargando monitoreos...
    </div>
  );

  return (
    <div>
      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-3 mb-5 items-end">
        <div className="min-w-[180px]">
          <label className={labelCls}>Cliente</label>
          <select
            className={inputCls}
            value={filterCliente}
            onChange={(e) => setFilterCliente(e.target.value)}
          >
            <option value="">Todos</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>{c.nombre}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className={labelCls}>Parcela</label>
          <select
            className={inputCls}
            value={filterParcela}
            onChange={(e) => setFilterParcela(e.target.value)}
          >
            <option value="">Todas</option>
            {parcelas.map((p) => (
              <option key={p.id} value={p.id}>{p.nombre_parcela}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[180px]">
          <label className={labelCls}>Etapa</label>
          <select
            className={inputCls}
            value={filterEtapa}
            onChange={(e) => setFilterEtapa(e.target.value)}
          >
            <option value="">Todas</option>
            <option value="planificacion">Planificación</option>
            <option value="siembra">Siembra</option>
            <option value="aplicacion">Aplicaciones</option>
            <option value="evaluacion">Evaluaciones</option>
            <option value="cosecha">Cosecha</option>
            <option value="rte">RTE</option>
            <option value="concluido">Concluido</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button type="button" className={btnSecondary} onClick={exportCSV}>
            <i className="fas fa-file-csv text-xs" /> Exportar CSV
          </button>
          <button type="button" className={btnPrimary} onClick={handleNuevo}>
            <i className="fas fa-plus text-xs" /> Nuevo monitoreo
          </button>
        </div>
      </div>

      {/* ── Tabela ── */}
      <div className="overflow-x-auto rounded-xl border border-gray-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Cliente</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Parcela</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Zafra</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide text-right">Ha</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide text-right">Costo Est.</th>
              <th className="text-left px-4 py-3 font-bold text-gray-600 text-xs uppercase tracking-wide">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRows.map((r) => (
              <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{r.cliente_nombre}</td>
                <td className="px-4 py-3 text-gray-600">{r.parcela_nombre}</td>
                <td className="px-4 py-3 text-gray-600">{r.zafra_nombre}</td>
                <td className="px-4 py-3 text-right font-mono">{formatDecimal(r.hectares)}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-agro-primary">${formatDecimal(r.costo_estimado)}</td>
                <td className="px-4 py-3">
                  {r.concluido ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">Concluido</span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-agro-primary/10 text-agro-primary uppercase">Em Pista</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    className="text-xs font-bold text-agro-primary hover:underline"
                    onClick={() => setShowDetail(r)}
                  >
                    Ver detalles
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredRows.length === 0 && (
          <div className="py-12 text-center text-gray-400">
            <i className="fas fa-microscope mb-2 text-2xl block" />
            No hay monitoreos registrados.
          </div>
        )}
      </div>

      {/* ── Modal Novo Monitoreo ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-agro-primary/10 text-agro-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-plus text-sm" />
                </div>
                <h3 className="font-bold text-gray-900 text-base">{editPlanificacion ? 'Alterar Planificación' : 'Novo monitoreo – Planificação'}</h3>
              </div>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
                <i className="fas fa-times" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div>
                  <label className={labelCls}>Cliente *</label>
                  <select
                    className={inputCls}
                    value={form.id_cliente}
                    onChange={(e) => setForm({ ...form, id_cliente: e.target.value, id_parcela: "" })}
                    required
                  >
                    <option value="">Seleccione</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Parcela *</label>
                  <select
                    className={inputCls}
                    value={form.id_parcela}
                    onChange={(e) => setForm({ ...form, id_parcela: e.target.value })}
                    required
                    disabled={!form.id_cliente}
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
                <div>
                  <label className={labelCls}>Zafra *</label>
                  <select
                    className={inputCls}
                    value={form.id_zafra}
                    onChange={(e) => setForm({ ...form, id_zafra: e.target.value })}
                    required
                  >
                    <option value="">Seleccione</option>
                    {zafras.map((z) => (
                      <option key={z.id} value={z.id}>{z.nombre_zafra}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Costo est. (USD)</label>
                    <input
                      type="number"
                      step="0.001"
                      className={inputCls}
                      placeholder="0.00"
                      value={form.costo_estimado}
                      onChange={(e) => setForm({ ...form, costo_estimado: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Prod. est. (kg/ha)</label>
                    <input
                      type="number"
                      step="0.001"
                      className={inputCls}
                      placeholder="0.00"
                      value={form.productividad_estimada}
                      onChange={(e) => setForm({ ...form, productividad_estimada: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
                <button type="button" className={btnSecondary} onClick={resetForm}>Cancelar</button>
                <button type="submit" className={btnPrimary} disabled={saving}>
                  {saving ? (
                    <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                  ) : {editPlanificacion ? 'Salvar' : 'Criar monitoreo'}}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Detalhe da Esteira (Pipeline) ── */}
      {showDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-agro-primary/10 text-agro-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-eye text-sm" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 leading-tight">Monitoreo Detalhado</h3>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                    {showDetail.cliente_nombre} / {showDetail.parcela_nombre} / {showDetail.zafra_nombre}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDetail(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                type="button"
              >
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {/* Card de Resumo Planificação */}
              
              <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex justify-between items-center bg-blue-50/50 border-blue-100">
                <div className="flex gap-6">
                  <div>
                    <span className="block text-[10px] uppercase text-gray-400 font-bold mb-0.5">Hectáreas</span>
                    <span className="text-gray-900 font-bold font-mono">{formatDecimal(showDetail.hectares)} ha</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-400 font-bold mb-0.5">Costo est. (USD)</span>
                    <span className="text-agro-primary font-bold font-mono">${formatDecimal(showDetail.costo_estimado)}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase text-gray-400 font-bold mb-0.5">Prod est. (kg/ha)</span>
                    <span className="text-gray-900 font-bold font-mono">{formatDecimal(showDetail.productividad_estimada)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!showDetail.concluido && !showDetail.tiene_siembra && !showDetail.tiene_aplicaciones && !showDetail.tiene_evaluaciones && !showDetail.tiene_cosecha && !showDetail.tiene_rte && (
                    <button type="button" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1" onClick={() => {
                      setForm({
                        id_cliente: showDetail.id_cliente,
                        id_parcela: showDetail.id_parcela,
                        id_zafra: showDetail.id_zafra,
                        costo_estimado: showDetail.costo_estimado ? String(showDetail.costo_estimado) : "",
                        productividad_estimada: showDetail.productividad_estimada ? String(showDetail.productividad_estimada) : "",
                      });
                      setEditPlanificacion(true);
                      setShowModal(true);
                    }}>
                      <i className="fas fa-edit"></i> Alterar Planificación
                    </button>
                  )}
                </div>
              </div>

              const isSiembraTerminada = siembraData?.fecha_termino != null;
                const isCosechaTerminada = cosechaData?.fecha_termino != null;
                const podeConcluir = showDetail.tiene_siembra && showDetail.tiene_aplicaciones && showDetail.tiene_evaluaciones && showDetail.tiene_cosecha && showDetail.tiene_rte && !showDetail.concluido && isSiembraTerminada && isCosechaTerminada;
              }
              {podeConcluir && (
                <div className="pt-4 flex justify-center">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 px-8 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                    onClick={() => handleConcluir(showDetail)}
                  >
                    <i className="fas fa-check-double" />
                    Concluir Monitoreo
                  </button>
                </div>
              )}.then(({ data }) => setAplicacionesList((data as any[]) ?? []));
          }}
        />
      )}

      {cosechaModal && (
        <CosechaModal
          cosechaId={cosechaModal.cosechaId}
          monitoreo={cosechaModal.monitoreo}
          onClose={() => setCosechaModal(null)}
          onSaved={() => { loadMonitoreos(); setCosechaModal(null); }}
        />
      )}

      {rteModal && (
        <RteModal
          rteId={rteModal.rteId}
          monitoreo={rteModal.monitoreo}
          onClose={() => setRteModal(null)}
          onSaved={() => { loadMonitoreos(); setRteModal(null); }}
        />
      )}

      {evaluacionModal && (
        <EvaluacionModal
          evaluacionId={evaluacionModal.evaluacionId}
          monitoreo={evaluacionModal.monitoreo}
          onClose={() => setEvaluacionModal(null)}
          onSaved={() => {
            loadMonitoreos();
            const monId = evaluacionModal.monitoreo.id;
            supabase.from("evaluaciones").select("id, fecha_evaluacion").eq("id_monitoreo", monId).order("fecha_evaluacion", { ascending: false }).then(({ data }) => setEvaluacionesList((data as any[]) ?? []));
          }}
        />
      )}
    </div>
  );
}

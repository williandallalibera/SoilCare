import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { generarPdfEvaluacion } from "./pdfEvaluacion";

export interface MonitoreoForModal {
  id: string;
  id_zafra: string;
  cliente_nombre: string;
  parcela_nombre: string;
  zafra_nombre: string;
}

interface EvaluacionModalProps {
  evaluacionId: string;
  monitoreo: MonitoreoForModal | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400";
const labelCls = "block text-xs font-bold text-gray-600 mb-1";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all";

export function EvaluacionModal({ evaluacionId, monitoreo: monProp, onClose, onSaved }: EvaluacionModalProps) {
  const [monitoreo, setMonitoreo] = useState<MonitoreoForModal | null>(monProp);
  const [fechaEvaluacion, setFechaEvaluacion] = useState("");
  const [fechaProxima, setFechaProxima] = useState("");
  const [idEtapaFenologica, setIdEtapaFenologica] = useState("");
  const [idVigor, setIdVigor] = useState("");
  const [idEstresHidrico, setIdEstresHidrico] = useState("");
  const [idClimaReciente, setIdClimaReciente] = useState("");
  const [descripcionGeneral, setDescripcionGeneral] = useState("");
  const [etapas, setEtapas] = useState<{ id: string; descripcion: string }[]>([]);
  const [vigorList, setVigorList] = useState<{ id: string; descripcion: string }[]>([]);
  const [estresList, setEstresList] = useState<{ id: string; descripcion: string }[]>([]);
  const [climaList, setClimaList] = useState<{ id: string; descripcion: string }[]>([]);
  const [plagas, setPlagas] = useState<{ id: string; descripcion: string }[]>([]);
  const [enfermedades, setEnfermedades] = useState<{ id: string; descripcion: string }[]>([]);
  const [malezas, setMalezas] = useState<{ id: string; descripcion: string }[]>([]);
  const [selectedPlagas, setSelectedPlagas] = useState<string[]>([]);
  const [selectedEnfermedades, setSelectedEnfermedades] = useState<string[]>([]);
  const [selectedMalezas, setSelectedMalezas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    const load = async () => {
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      if (isReviewMode) {
        setFechaEvaluacion(new Date().toISOString().slice(0, 10));
        setVigorList([{ id: "v1", descripcion: "Bueno" }, { id: "v2", descripcion: "Regular" }]);
        setEstresList([{ id: "s1", descripcion: "Ninguno" }, { id: "s2", descripcion: "Leve" }]);
        setClimaList([{ id: "c1", descripcion: "Soleado" }, { id: "c2", descripcion: "Lluvioso" }]);
        setPlagas([{ id: "p1", descripcion: "Oruga" }, { id: "p2", descripcion: "Chinche" }]);
        setEnfermedades([{ id: "e1", descripcion: "Roya" }, { id: "e2", descripcion: "Mancha" }]);
        setMalezas([{ id: "m1", descripcion: "Capín" }, { id: "m2", descripcion: "Maleza X" }]);
        setLoading(false);
        return;
      }
      const { data: ev } = await supabase.from("evaluaciones").select("*").eq("id", evaluacionId).single();
      if (ev) {
        const x = ev as any;
        setFechaEvaluacion(x.fecha_evaluacion ?? "");
        setFechaProxima(x.fecha_proxima_evaluacion ?? "");
        setIdEtapaFenologica(x.id_etapa_fenologica ?? "");
        setIdVigor(x.id_vigor ?? "");
        setIdEstresHidrico(x.id_estres_hidrico ?? "");
        setIdClimaReciente(x.id_clima_reciente ?? "");
        setDescripcionGeneral(x.descripcion_general ?? "");
      }

      if (!monProp && ev) {
        const { data: mon } = await supabase.from("monitoreos").select("id, id_zafra, clientes(nombre), parcelas(nombre_parcela), zafras(nombre_zafra)").eq("id", (ev as any).id_monitoreo).single();
        if (mon) {
          const m = mon as any;
          setMonitoreo({
            id: m.id,
            id_zafra: m.id_zafra,
            cliente_nombre: m.clientes?.nombre ?? "",
            parcela_nombre: m.parcelas?.nombre_parcela ?? "",
            zafra_nombre: m.zafras?.nombre_zafra ?? "",
          });
        }
      } else if (monProp) setMonitoreo(monProp);

      let idZafra = monProp?.id_zafra;
      if (!idZafra && ev) {
        const { data: mz } = await supabase.from("monitoreos").select("id_zafra").eq("id", (ev as any).id_monitoreo).single();
        idZafra = (mz as any)?.id_zafra;
      }
      if (idZafra) {
        const { data: zafra } = await supabase.from("zafras").select("id_cultura").eq("id", idZafra).single();
        const idCultura = (zafra as any)?.id_cultura;
        if (idCultura) {
          const { data: etapasData } = await supabase.from("etapas_fenologicas").select("id, descripcion").eq("id_cultura", idCultura);
          setEtapas((etapasData as any[]) ?? []);
        }
      }

      const [vRes, eRes, cRes, pRes, enRes, mRes] = await Promise.all([
        supabase.from("vigor").select("id, descripcion"),
        supabase.from("estres_hidrico").select("id, descripcion"),
        supabase.from("clima_reciente").select("id, descripcion"),
        supabase.from("plagas").select("id, descripcion"),
        supabase.from("enfermedades").select("id, descripcion"),
        supabase.from("malezas").select("id, descripcion"),
      ]);
      setVigorList((vRes.data as any[]) ?? []);
      setEstresList((eRes.data as any[]) ?? []);
      setClimaList((cRes.data as any[]) ?? []);
      setPlagas((pRes.data as any[]) ?? []);
      setEnfermedades((enRes.data as any[]) ?? []);
      setMalezas((mRes.data as any[]) ?? []);

      const [pEval, eEval, mMval] = await Promise.all([
        supabase.from("evaluacion_plagas").select("id_plaga").eq("id_evaluacion", evaluacionId),
        supabase.from("evaluacion_enfermedades").select("id_enfermedad").eq("id_evaluacion", evaluacionId),
        supabase.from("evaluacion_malezas").select("id_maleza").eq("id_evaluacion", evaluacionId),
      ]);
      setSelectedPlagas((pEval.data as any[])?.map((x) => x.id_plaga) ?? []);
      setSelectedEnfermedades((eEval.data as any[])?.map((x) => x.id_enfermedad) ?? []);
      setSelectedMalezas((mMval.data as any[])?.map((x) => x.id_maleza) ?? []);

      setLoading(false);
    };
    load();
  }, [evaluacionId, monProp?.id]);

  const togglePlaga = (id: string) => {
    setSelectedPlagas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleEnfermedad = (id: string) => {
    setSelectedEnfermedades((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };
  const toggleMaleza = (id: string) => {
    setSelectedMalezas((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("evaluaciones")
      .update({
        fecha_evaluacion: fechaEvaluacion || null,
        fecha_proxima_evaluacion: fechaProxima || null,
        id_etapa_fenologica: idEtapaFenologica || null,
        id_vigor: idVigor || null,
        id_estres_hidrico: idEstresHidrico || null,
        id_clima_reciente: idClimaReciente || null,
        descripcion_general: descripcionGeneral || null,
      })
      .eq("id", evaluacionId);

    await supabase.from("evaluacion_plagas").delete().eq("id_evaluacion", evaluacionId);
    await supabase.from("evaluacion_enfermedades").delete().eq("id_evaluacion", evaluacionId);
    await supabase.from("evaluacion_malezas").delete().eq("id_evaluacion", evaluacionId);
    if (selectedPlagas.length) await supabase.from("evaluacion_plagas").insert(selectedPlagas.map((id_plaga) => ({ id_evaluacion: evaluacionId, id_plaga })));
    if (selectedEnfermedades.length) await supabase.from("evaluacion_enfermedades").insert(selectedEnfermedades.map((id_enfermedad) => ({ id_evaluacion: evaluacionId, id_enfermedad })));
    if (selectedMalezas.length) await supabase.from("evaluacion_malezas").insert(selectedMalezas.map((id_maleza) => ({ id_evaluacion: evaluacionId, id_maleza })));

    setSaving(false);
    onSaved();
    onClose();
  };

  const handlePdf = async () => {
    setGenerandoPdf(true);
    await generarPdfEvaluacion(supabase, evaluacionId);
    setGenerandoPdf(false);
  };

  if (loading || !monitoreo) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
        <i className="fas fa-spinner fa-spin text-agro-primary text-2xl mb-4" />
        <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Cargando...</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-clipboard-list text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight text-base">Registro de Evaluación</h3>
              <p className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">
                {monitoreo.cliente_nombre} / {monitoreo.parcela_nombre} / {monitoreo.zafra_nombre}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <i className="fas fa-times" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-6">
            <div className="grid grid-cols-6 gap-4">
              <div className="col-span-1">
                <label className={labelCls}>Fecha Eval.</label>
                <input type="date" className={inputCls} value={fechaEvaluacion} onChange={(e) => setFechaEvaluacion(e.target.value)} required />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Próx. Visita</label>
                <input type="date" className={inputCls} value={fechaProxima} onChange={(e) => setFechaProxima(e.target.value)} />
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Etapa Fenológica</label>
                <select className={inputCls} value={idEtapaFenologica} onChange={(e) => setIdEtapaFenologica(e.target.value)}>
                  <option value="">Seleccione</option>
                  {etapas.map((t) => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Vigor</label>
                <select className={inputCls} value={idVigor} onChange={(e) => setIdVigor(e.target.value)}>
                  <option value="">Seleccione</option>
                  {vigorList.map((v) => (
                    <option key={v.id} value={v.id}>{v.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Estrés Hídrico</label>
                <select className={inputCls} value={idEstresHidrico} onChange={(e) => setIdEstresHidrico(e.target.value)}>
                  <option value="">Seleccione</option>
                  {estresList.map((s) => (
                    <option key={s.id} value={s.id}>{s.descripcion}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-1">
                <label className={labelCls}>Clima Reciente</label>
                <select className={inputCls} value={idClimaReciente} onChange={(e) => setIdClimaReciente(e.target.value)}>
                  <option value="">Seleccione</option>
                  {climaList.map((c) => (
                    <option key={c.id} value={c.id}>{c.descripcion}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className={labelCls}>Descripción General del Cultivo</label>
              <textarea
                className={`${inputCls} h-20 resize-none`}
                value={descripcionGeneral}
                onChange={(e) => setDescripcionGeneral(e.target.value)}
                placeholder="Detalle el estado general observado..."
              />
            </div>

            <div className="grid grid-cols-3 gap-6">
              {/* Plagas */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-bug text-[10px]" /> Plagas
                </h4>
                <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto bg-gray-50/50 p-2 space-y-1">
                  {plagas.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-agro-primary focus:ring-agro-primary"
                        checked={selectedPlagas.includes(p.id)}
                        onChange={() => togglePlaga(p.id)}
                      />
                      <span className="text-xs text-gray-700 font-medium group-hover:text-gray-900">{p.descripcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Enfermedades */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-microbe text-[10px]" /> Enfermedades
                </h4>
                <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto bg-gray-50/50 p-2 space-y-1">
                  {enfermedades.map((e) => (
                    <label key={e.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-agro-primary focus:ring-agro-primary"
                        checked={selectedEnfermedades.includes(e.id)}
                        onChange={() => toggleEnfermedad(e.id)}
                      />
                      <span className="text-xs text-gray-700 font-medium group-hover:text-gray-900">{e.descripcion}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Malezas */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <i className="fas fa-leaf text-[10px]" /> Malezas
                </h4>
                <div className="border border-gray-100 rounded-xl max-h-48 overflow-y-auto bg-gray-50/50 p-2 space-y-1">
                  {malezas.map((m) => (
                    <label key={m.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white transition-colors cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-agro-primary focus:ring-agro-primary"
                        checked={selectedMalezas.includes(m.id)}
                        onChange={() => toggleMaleza(m.id)}
                      />
                      <span className="text-xs text-gray-700 font-medium group-hover:text-gray-900">{m.descripcion}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50">
            <button
              type="button"
              className="inline-flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-blue-600 text-sm font-bold transition-all"
              onClick={handlePdf}
              disabled={generandoPdf}
            >
              {generandoPdf ? (
                <><i className="fas fa-spinner fa-spin" /> Generando PDF...</>
              ) : (
                <><i className="fas fa-file-pdf" /> Exportar Evaluación PDF</>
              )}
            </button>
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                ) : (
                  <><i className="fas fa-save text-xs" /> Guardar Evaluación</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

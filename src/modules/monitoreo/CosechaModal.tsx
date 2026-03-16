import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";
import { generarPdfCosecha } from "./pdfCosecha";

export interface MonitoreoForModal {
  id: string;
  cliente_nombre: string;
  parcela_nombre: string;
  zafra_nombre: string;
}

interface CosechaModalProps {
  cosechaId: string;
  monitoreo: MonitoreoForModal;
  onClose: () => void;
  onSaved: () => void;
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400";
const labelCls = "block text-xs font-bold text-gray-600 mb-1";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all";

export function CosechaModal({ cosechaId, monitoreo, onClose, onSaved }: CosechaModalProps) {
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [resultadoLiquidoKg, setResultadoLiquidoKg] = useState("");
  const [productividadBolsasAlq, setProductividadBolsasAlq] = useState("");
  const [humedad, setHumedad] = useState("");
  const [costoBolsa, setCostoBolsa] = useState("");
  const [costoTotal, setCostoTotal] = useState("");
  const [idDestino, setIdDestino] = useState("");
  const [destinos, setDestinos] = useState<{ id: string; nombre: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  useEffect(() => {
    const load = async () => {
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      if (isReviewMode) {
        setFechaInicio(new Date().toISOString().slice(0, 10));
        setDestinos([{ id: "d-1", nombre: "Silo Principal" }, { id: "d-2", nombre: "Exportadora ABC" }]);
        setLoading(false);
        return;
      }
      const { data: c } = await supabase.from("cosechas").select("*").eq("id", cosechaId).single();
      if (c) {
        const x = c as any;
        setFechaInicio(x.fecha_inicio ?? "");
        setFechaTermino(x.fecha_termino ?? "");
        setResultadoLiquidoKg(String(x.resultado_liquido_kg ?? ""));
        setProductividadBolsasAlq(String(x.productividad_bolsas_alq ?? ""));
        setHumedad(String(x.humedad ?? ""));
        setCostoBolsa(String(x.costo_bolsa ?? ""));
        setCostoTotal(String(x.costo_total ?? ""));
        setIdDestino(x.id_destino ?? "");
      }
      const { data: d } = await supabase.from("destinos").select("id, nombre");
      setDestinos((d as any[]) ?? []);
      setLoading(false);
    };
    load();
  }, [cosechaId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("cosechas")
      .update({
        fecha_inicio: fechaInicio || null,
        fecha_termino: fechaTermino || null,
        resultado_liquido_kg: resultadoLiquidoKg !== "" ? Number(resultadoLiquidoKg) : null,
        productividad_bolsas_alq: productividadBolsasAlq !== "" ? Number(productividadBolsasAlq) : null,
        humedad: humedad !== "" ? Number(humedad) : null,
        costo_bolsa: costoBolsa !== "" ? Number(costoBolsa) : null,
        costo_total: costoTotal !== "" ? Number(costoTotal) : null,
        id_destino: idDestino || null,
      })
      .eq("id", cosechaId);
    setSaving(false);
    onSaved();
    onClose();
  };

  const handlePdf = async () => {
    setGenerandoPdf(true);
    await generarPdfCosecha(supabase, cosechaId);
    setGenerandoPdf(false);
  };

  if (loading) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl p-8 flex flex-col items-center">
        <i className="fas fa-spinner fa-spin text-agro-primary text-2xl mb-4" />
        <span className="text-gray-500 font-bold uppercase text-xs tracking-widest">Cargando...</span>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 text-amber-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-tractor text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight text-base">Registro de Colheita</h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Fecha Inicio</label>
                <input type="date" className={inputCls} value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Fecha Término</label>
                <input type="date" className={inputCls} value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Resultado Líquido (kg)</label>
                <input type="number" step="0.001" className={inputCls} value={resultadoLiquidoKg} onChange={(e) => setResultadoLiquidoKg(e.target.value)} placeholder="0.000" />
              </div>
              <div>
                <label className={labelCls}>Productividad (bolsas/alq)</label>
                <input type="number" step="0.001" className={`${inputCls} font-bold text-amber-700 bg-amber-50/30`} value={productividadBolsasAlq} onChange={(e) => setProductividadBolsasAlq(e.target.value)} placeholder="0.000" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Humedad (%)</label>
                <input type="number" step="0.001" className={inputCls} value={humedad} onChange={(e) => setHumedad(e.target.value)} placeholder="0.0" />
              </div>
              <div>
                <label className={labelCls}>Costo/Bolsa (USD)</label>
                <input type="number" step="0.001" className={inputCls} value={costoBolsa} onChange={(e) => setCostoBolsa(e.target.value)} placeholder="0.00" />
              </div>
              <div>
                <label className={labelCls}>Costo Total (USD)</label>
                <input type="number" step="0.001" className={`${inputCls} font-bold text-agro-primary bg-green-50/30`} value={costoTotal} onChange={(e) => setCostoTotal(e.target.value)} placeholder="0.00" />
              </div>
            </div>

            <div>
              <label className={labelCls}>Destino de Grãos</label>
              <select className={inputCls} value={idDestino} onChange={(e) => setIdDestino(e.target.value)}>
                <option value="">Seleccione el destino</option>
                {destinos.map((d) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
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
                <><i className="fas fa-file-pdf" /> Exportar PDF Cosecha</>
              )}
            </button>
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                ) : (
                  <><i className="fas fa-save text-xs" /> Guardar Cosecha</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

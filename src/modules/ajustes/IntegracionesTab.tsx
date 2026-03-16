import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Integraciones {
  id: string;
  api_google_maps: string | null;
  api_openai: string | null;
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all";
const labelCls = "block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 px-1";
const btnPrimary = "inline-flex items-center gap-2 px-8 py-3 bg-agro-primary text-white text-sm font-bold rounded-xl shadow-lg shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50";

export function IntegracionesTab() {
  const [record, setRecord] = useState<Integraciones | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    api_google_maps: "",
    api_openai: ""
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      if (isReviewMode) {
        console.log("IntegracionesTab: Review Mode - Injecting mock integrations");
        setRecord({ id: "int-1", api_google_maps: "AIzaSyMockKeyForReviewMode", api_openai: "sk-mock-openai-key" });
        setForm({
          api_google_maps: "AIzaSyMockKeyForReviewMode",
          api_openai: "sk-mock-openai-key"
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("integraciones")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        setRecord(data);
        setForm({
          api_google_maps: data.api_google_maps ?? "",
          api_openai: data.api_openai ?? ""
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (record) {
      const { data } = await supabase
        .from("integraciones")
        .update({
          api_google_maps: form.api_google_maps,
          api_openai: form.api_openai
        })
        .eq("id", record.id)
        .select("*")
        .maybeSingle();
      if (data) {
        setRecord(data);
      }
    } else {
      const { data } = await supabase
        .from("integraciones")
        .insert({
          api_google_maps: form.api_google_maps,
          api_openai: form.api_openai
        })
        .select("*")
        .maybeSingle();
      if (data) {
        setRecord(data);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin mr-2" />Cargando integraciones...
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-12 h-12 bg-agro-primary/10 text-agro-primary rounded-2xl flex items-center justify-center">
          <i className="fas fa-plug text-lg" />
        </div>
        <div>
          <h3 className="font-black text-gray-900 uppercase tracking-tighter text-lg">Conexiones Externas</h3>
          <p className="text-sm text-gray-500">Configura las llaves de acceso para servicios de terceros.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
        <div className="space-y-6">
          <div className="group">
            <label className={labelCls}>API Google Maps</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-300 group-focus-within:text-agro-primary transition-colors">
                <i className="fas fa-map-marked-alt text-sm" />
              </span>
              <input
                className={`${inputCls} pl-12`}
                placeholder="Introduzca su clave de API de Google Maps"
                value={form.api_google_maps}
                onChange={(e) =>
                  setForm({ ...form, api_google_maps: e.target.value })
                }
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400 font-medium px-1 italic">
              * Requerida para visualización de parcelas y geolocalización de campos.
            </p>
          </div>

          <div className="group">
            <label className={labelCls}>OpenAI Secret Key</label>
            <div className="relative">
              <span className="absolute left-4 top-3.5 text-gray-300 group-focus-within:text-agro-primary transition-colors">
                <i className="fas fa-robot text-sm" />
              </span>
              <input
                type="password"
                className={`${inputCls} pl-12 font-mono`}
                placeholder="sk-..."
                value={form.api_openai}
                onChange={(e) => setForm({ ...form, api_openai: e.target.value })}
              />
            </div>
            <p className="mt-2 text-[10px] text-gray-400 font-medium px-1 italic">
              * Usada para análisis inteligente de cultivos y generación de informes (RTE AI).
            </p>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-100 flex justify-end">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? (
              <><i className="fas fa-spinner fa-spin mr-2" /> Guardando...</>
            ) : (
              <><i className="fas fa-sync-alt mr-2" /> Actualizar Conexiones</>
            )}
          </button>
        </div>
      </form>

      <div className="mt-12 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
        <i className="fas fa-info-circle text-blue-400 mt-1" />
        <div>
          <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-1">Seguridad de Datos</h4>
          <p className="text-xs text-blue-700 leading-relaxed">
            Todas las llaves de API se almacenan de forma cifrada en la base de datos de Supabase. Nunca comparta estas llaves con terceros no autorizados.
          </p>
        </div>
      </div>
    </div>
  );
}

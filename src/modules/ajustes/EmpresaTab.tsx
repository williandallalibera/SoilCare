import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Empresa {
  id: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
}

const inputCls = "w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all disabled:bg-gray-50";
const labelCls = "text-sm font-bold text-gray-700 block mb-2";
const btnPrimary = "px-8 py-3 bg-agro-primary text-white font-bold rounded-xl shadow-lg shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50";

export function EmpresaTab() {
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    ruc: "",
    direccion: "",
    telefono: "",
    logo_url: ""
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";

      if (isReviewMode) {
        console.log("EmpresaTab: Review Mode - Injecting mock data");
        const mockData = {
          id: "mock-empresa-id",
          ruc: "80012345-6",
          direccion: "Av. Mariscal López 1234, Asunción",
          telefono: "+595 21 600 000",
          logo_url: "https://cbisa.com.py/logo.png"
        };
        setEmpresa(mockData);
        setForm({
          ruc: mockData.ruc,
          direccion: mockData.direccion,
          telefono: mockData.telefono,
          logo_url: mockData.logo_url
        });
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("empresa")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setEmpresa(data);
        setForm({
          ruc: data.ruc ?? "",
          direccion: data.direccion ?? "",
          telefono: data.telefono ?? "",
          logo_url: data.logo_url ?? ""
        });
      }
      setLoading(false);
    };
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (empresa) {
      const { data } = await supabase
        .from("empresa")
        .update({
          ruc: form.ruc,
          direccion: form.direccion,
          telefono: form.telefono,
          logo_url: form.logo_url
        })
        .eq("id", empresa.id)
        .select("*")
        .maybeSingle();
      if (data) {
        setEmpresa(data);
      }
    } else {
      const { data } = await supabase
        .from("empresa")
        .insert({
          ruc: form.ruc,
          direccion: form.direccion,
          telefono: form.telefono,
          logo_url: form.logo_url
        })
        .select("*")
        .maybeSingle();
      if (data) {
        setEmpresa(data);
      }
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-gray-400">
        <i className="fas fa-spinner fa-spin mr-2" />Cargando datos de la empresa...
      </div>
    );
  }

  return (
    <div className="p-8">
      <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
        <i className="fas fa-building text-agro-primary"></i>
        Datos de la Empresa
      </h3>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className={labelCls}>RUC</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ej: 80000000-0"
              value={form.ruc}
              onChange={(e) => setForm({ ...form, ruc: e.target.value })}
            />
          </div>
          <div>
            <label className={labelCls}>Teléfono</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Ej: +595 900 000000"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Dirección Fiscal</label>
            <input
              type="text"
              className={inputCls}
              placeholder="Calle, Ciudad, Departamento"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
            />
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Logo (URL Storage Supabase)</label>
            <input
              type="text"
              className={inputCls}
              placeholder="https://..."
              value={form.logo_url}
              onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
            />
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex justify-end">
          <button
            type="submit"
            className={btnPrimary}
            disabled={saving}
          >
            {saving ? (
              <><i className="fas fa-spinner fa-spin mr-2" /> Guardando...</>
            ) : (
              <><i className="fas fa-save mr-2" /> Guardar Cambios</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

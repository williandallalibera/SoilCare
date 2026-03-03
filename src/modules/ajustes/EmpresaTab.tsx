import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Empresa {
  id: string;
  ruc: string | null;
  direccion: string | null;
  telefono: string | null;
  logo_url: string | null;
}

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
    return <span>Cargando datos de la empresa...</span>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-row">
        <div className="form-group col-md-3">
          <label>RUC</label>
          <input
            className="form-control"
            placeholder="RUC de la empresa"
            value={form.ruc}
            onChange={(e) => setForm({ ...form, ruc: e.target.value })}
          />
        </div>
        <div className="form-group col-md-5">
          <label>Dirección</label>
          <input
            className="form-control"
            placeholder="Dirección fiscal"
            value={form.direccion}
            onChange={(e) => setForm({ ...form, direccion: e.target.value })}
          />
        </div>
        <div className="form-group col-md-4">
          <label>Teléfono</label>
          <input
            className="form-control"
            placeholder="Teléfono de contacto"
            value={form.telefono}
            onChange={(e) => setForm({ ...form, telefono: e.target.value })}
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group col-md-6">
          <label>Logo (URL)</label>
          <input
            className="form-control"
            placeholder="URL del logo (Storage Supabase)"
            value={form.logo_url}
            onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
          />
        </div>
      </div>
      <button type="submit" className="btn btn-success" disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}


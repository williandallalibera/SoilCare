import { FormEvent, useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";

interface Integraciones {
  id: string;
  api_google_maps: string | null;
  api_openai: string | null;
}

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
    return <span>Cargando integraciones...</span>;
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-group">
        <label>API Google Maps</label>
        <input
          className="form-control"
          placeholder="Clave de la API de Google Maps"
          value={form.api_google_maps}
          onChange={(e) =>
            setForm({ ...form, api_google_maps: e.target.value })
          }
        />
      </div>
      <div className="form-group">
        <label>API OpenAI</label>
        <input
          className="form-control"
          placeholder="Clave de la API de OpenAI (guardada de forma segura)"
          value={form.api_openai}
          onChange={(e) => setForm({ ...form, api_openai: e.target.value })}
        />
      </div>
      <button type="submit" className="btn btn-success" disabled={saving}>
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </form>
  );
}


import { FormEvent, useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";

interface Mensaje {
  id: string;
  role: string;
  contenido: string;
  created_at: string;
}

export function AgenteIAPage() {
  const { perfil } = useAuth();
  const [chatId, setChatId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes]);

  const crearChat = async () => {
    const { data, error: e } = await supabase
      .from("chats")
      .insert({ id_usuario: perfil?.id, titulo: "Chat" })
      .select("id")
      .single();
    if (!e && data) {
      setChatId((data as any).id);
      setMensajes([]);
      return (data as any).id;
    }
    return null;
  };

  const loadMensajes = async (id: string) => {
    const { data } = await supabase
      .from("mensajes")
      .select("id, role, contenido, created_at")
      .eq("id_chat", id)
      .order("created_at", { ascending: true });
    if (data) setMensajes(data as Mensaje[]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const texto = input.trim();
    if (!texto || !perfil?.id) return;
    setInput("");
    setLoading(true);
    setError(null);
    let cid = chatId;
    if (!cid) {
      cid = await crearChat();
      if (!cid) {
        setError("No se pudo crear el chat.");
        setLoading(false);
        return;
      }
    }
    const { data: msgUser } = await supabase
      .from("mensajes")
      .insert({
        id_chat: cid,
        role: "user",
        contenido: texto,
      })
      .select("id, role, contenido, created_at")
      .single();
    if (msgUser) setMensajes((prev) => [...prev, msgUser as Mensaje]);

    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke("agente-ia", {
        body: { message: texto, chatId: cid },
      });
      if (fnError) {
        const fallback = "La función del agente de IA no está disponible. Configure la Edge Function 'agente-ia' en Supabase y la API OpenAI en Ajustes > Integraciones.";
        await supabase.from("mensajes").insert({
          id_chat: cid,
          role: "ia",
          contenido: fallback,
        });
        const { data: msgIa } = await supabase
          .from("mensajes")
          .select("id, role, contenido, created_at")
          .eq("id_chat", cid)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (msgIa) setMensajes((prev) => [...prev, msgIa as Mensaje]);
        setError(fnError.message);
      } else {
        const contenido = (fnData as any)?.response ?? (fnData as any)?.message ?? "Sin respuesta.";
        await supabase.from("mensajes").insert({
          id_chat: cid,
          role: "ia",
          contenido,
        });
        const { data: msgIa } = await supabase
          .from("mensajes")
          .select("id, role, contenido, created_at")
          .eq("id_chat", cid)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (msgIa) setMensajes((prev) => [...prev, msgIa as Mensaje]);
      }
    } catch (err) {
      setError(String(err));
      await supabase.from("mensajes").insert({
        id_chat: cid,
        role: "ia",
        contenido: "Error al conectar con el agente. Verifique que la Edge Function esté desplegada.",
      });
      await loadMensajes(cid);
    }
    setLoading(false);
  };

  const nuevoChat = () => {
    setChatId(null);
    setMensajes([]);
    setError(null);
  };

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white d-flex justify-content-between align-items-center">
            <h3 className="card-title mb-0">Agente de IA</h3>
            <button type="button" className="btn btn-light btn-sm" onClick={nuevoChat}>
              Nuevo chat
            </button>
          </div>
          <div className="card-body">
            <p className="text-muted small">
              Consulte datos del sistema (clientes, propuestas, visitas, etc.) en lenguaje natural.
              La IA utiliza la API de OpenAI configurada en Ajustes &gt; Integraciones.
            </p>
            {error && (
              <div className="alert alert-warning small">
                {error}
              </div>
            )}
            <div
              style={{
                minHeight: "400px",
                maxHeight: "60vh",
                overflowY: "auto",
                border: "1px solid #dee2e6",
                borderRadius: "4px",
                padding: "1rem",
                backgroundColor: "#f8f9fa",
              }}
            >
              {mensajes.length === 0 && !loading && (
                <p className="text-muted text-center mt-4">
                  Escriba una pregunta, por ejemplo: &quot;¿Cuántos clientes activos hay?&quot; o &quot;Total de propuestas tipo venta hoy&quot;
                </p>
              )}
              {mensajes.map((m) => (
                <div
                  key={m.id}
                  className={`mb-3 ${m.role === "user" ? "text-right" : ""}`}
                >
                  <span
                    className={`badge ${m.role === "user" ? "badge-primary" : "badge-success"} mb-1`}
                  >
                    {m.role === "user" ? "Usted" : "IA"}
                  </span>
                  <div
                    className={`d-inline-block text-left p-2 rounded ${
                      m.role === "user"
                        ? "bg-primary text-white"
                        : "bg-white border"
                    }`}
                    style={{ maxWidth: "85%" }}
                  >
                    {m.contenido}
                  </div>
                  <div className="small text-muted">
                    {new Date(m.created_at).toLocaleTimeString("es-PY")}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="text-muted">
                  <span className="spinner-border spinner-border-sm mr-2" />
                  Esperando respuesta...
                </div>
              )}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSubmit} className="mt-3">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Escriba su consulta..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={loading}
                />
                <div className="input-group-append">
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={loading || !input.trim()}
                  >
                    Enviar
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

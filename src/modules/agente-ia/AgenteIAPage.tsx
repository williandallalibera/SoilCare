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
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) {
      const mockId = "mock-chat-" + Date.now();
      setChatId(mockId);
      setMensajes([]);
      return mockId;
    }
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
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
    if (isReviewMode) return;
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
    const isReviewMode = localStorage.getItem("forceAuthReview") === "true";

    let cid = chatId;
    if (!cid) {
      cid = await crearChat();
      if (!cid) {
        setError("No se pudo crear el chat.");
        setLoading(false);
        return;
      }
    }

    const newUserMsg = {
      id: "m-" + Date.now(),
      role: "user",
      contenido: texto,
      created_at: new Date().toISOString()
    };

    if (!isReviewMode) {
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
    } else {
      setMensajes((prev) => [...prev, newUserMsg]);
    }

    try {
      let contenido = "";
      if (isReviewMode) {
        // Fallback: Intent Detection logic for review mode
        const lower = texto.toLowerCase();
        if (lower.includes("cliente") && (lower.includes("cuanto") || lower.includes("total"))) {
          contenido = "Actualmente hay 4 clientes activos registrados en el sistema (Modo Review).";
        }
        else if (lower.includes("propuesta") || lower.includes("venta") || lower.includes("presupuesto")) {
          contenido = "Para hoy hay 2 propuestas con un valor total de 20.900,00 USD (Modo Review).";
        }
        else if (lower.includes("visita") || lower.includes("evalua")) {
          contenido = "Hay 0 evaluaciones programadas para la fecha de hoy (Modo Review).";
        }
        else if (lower.includes("vou") || lower.includes("pendien")) {
          contenido = "El valor acumulado de vouchers pendientes de liberación es de 32.000,00 USD (Modo Review).";
        }
        else {
          contenido = "Lo siento, soy un simulador en modo Prueba. Puedo darte datos sobre clientes, propuestas o vouchers si usas esas palabras.";
        }
      } else {
        const { data: fnData, error: fnError } = await supabase.functions.invoke("agente-ia", {
          body: { message: texto, chatId: cid },
        });

        if (fnError) {
          // Fallback logic for production if Edge Function fails...
          console.log("AI Edge Function error, falling back to local intent logic...");
          const lower = texto.toLowerCase();

          if (lower.includes("cliente") && (lower.includes("cuanto") || lower.includes("total"))) {
            const { count } = await supabase.from("clientes").select("*", { count: 'exact', head: true }).eq("estado", "activo");
            contenido = `Actualmente hay ${count ?? 0} clientes activos registrados en el sistema.`;
          }
          else if (lower.includes("propuesta") || lower.includes("venta") || lower.includes("presupuesto")) {
            const { data: props } = await supabase.from("propuestas").select("total_general").eq("fecha", new Date().toISOString().slice(0, 10));
            const total = props?.reduce((acc, p) => acc + (p.total_general ?? 0), 0) ?? 0;
            contenido = `Para hoy hay ${props?.length ?? 0} propuestas con um valor total de ${total.toLocaleString('es-PY', { minimumFractionDigits: 2 })} USD.`;
          }
          else if (lower.includes("visita") || lower.includes("evalua")) {
            const { count } = await supabase.from("evaluaciones").select("*", { count: 'exact', head: true }).eq("fecha_proxima_evaluacion", new Date().toISOString().slice(0, 10));
            contenido = `Hay ${count ?? 0} evaluaciones programadas para la fecha de hoy.`;
          }
          else if (lower.includes("vou") || lower.includes("pendien")) {
            const { data: v } = await supabase.from("vouchers").select("valor_restante");
            const total = v?.reduce((acc, x) => acc + (x.valor_restante ?? 0), 0) ?? 0;
            contenido = `El valor acumulado de vouchers pendientes de liberación es de ${total.toLocaleString('es-PY', { minimumFractionDigits: 2 })} USD.`;
          }
          else {
            contenido = "Lo siento, la función de IA avanzada no está configurada, pero puedo ayudarte con consultas sobre clientes, propuestas o visitas si usas esas palabras clave.";
          }
        } else {
          contenido = (fnData as any)?.response ?? (fnData as any)?.message ?? "Sin respuesta.";
        }
      }

      const iaMsg = {
        id: "ia-" + Date.now(),
        role: "ia",
        contenido,
        created_at: new Date().toISOString()
      };

      if (!isReviewMode) {
        await supabase.from("mensajes").insert({ id_chat: cid, role: "ia", contenido });
        const { data: msgIa } = await supabase
          .from("mensajes")
          .select("id, role, contenido, created_at")
          .eq("id_chat", cid)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();
        if (msgIa) setMensajes((prev) => [...prev, msgIa as Mensaje]);
      } else {
        setMensajes((prev) => [...prev, iaMsg]);
      }

    } catch (err) {
      setError(String(err));
      if (!isReviewMode) await loadMensajes(cid);
    }
    setLoading(false);
  };

  const nuevoChat = () => {
    setChatId(null);
    setMensajes([]);
    setError(null);
  };

  return (
    <div className="p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-10rem)]">
        <div className="bg-agro-primary px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white mb-0">Agente de IA</h3>
          <button
            type="button"
            className="px-4 py-1.5 bg-white text-agro-primary rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors"
            onClick={nuevoChat}
          >
            Nuevo chat
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col min-h-0 bg-gray-50/50">
          <p className="text-gray-500 text-sm mb-4 font-medium italic">
            Consulte datos del sistema (clientes, propuestas, visitas, etc.) en lenguaje natural.
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200 text-orange-700 text-xs shadow-sm">
              <i className="fas fa-exclamation-triangle mr-2"></i>
              {error}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {mensajes.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-50">
                <i className="fas fa-robot text-4xl text-gray-300"></i>
                <p className="text-gray-400 max-w-xs">
                  Escriba una pregunta, por ejemplo: <br />
                  <span className="text-xs italic font-semibold">"¿Cuántos clientes activos hay?"</span>
                </p>
              </div>
            )}

            {mensajes.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] px-4 py-3 rounded-2xl shadow-sm ${m.role === "user"
                    ? "bg-agro-primary text-white rounded-tr-none"
                    : "bg-white border border-gray-100 text-gray-800 rounded-tl-none"
                    }`}
                >
                  <p className="text-sm leading-relaxed">{m.contenido}</p>
                </div>
                <span className="text-[10px] text-gray-400 mt-1 font-medium italic">
                  {new Date(m.created_at).toLocaleTimeString("es-PY")}
                </span>
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-agro-primary animate-pulse">
                <div className="flex space-x-1">
                  <div className="w-1.5 h-1.5 bg-agro-primary rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-agro-primary rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 bg-agro-primary rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                </div>
                <span className="text-xs font-bold italic">Buscando datos...</span>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSubmit} className="mt-6 flex gap-3">
            <input
              type="text"
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-agro-primary/20 focus:border-agro-primary outline-none transition-all text-sm shadow-sm"
              placeholder="Escriba su consulta..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
            />
            <button
              type="submit"
              className="px-6 py-3 bg-agro-primary text-white rounded-xl shadow-md font-bold hover:bg-agro-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              disabled={loading || !input.trim()}
            >
              <i className="fas fa-paper-plane mr-2"></i>
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

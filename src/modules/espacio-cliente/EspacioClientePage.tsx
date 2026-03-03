import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { useAuth } from "../auth/AuthContext";
import { formatDecimal } from "../productos/utils";

interface Resumen {
  parcelas: { id: string; nombre_parcela: string; localidad: string | null; area_real_ha: number | null }[];
  propuestas: { id: string; fecha: string; total_general: number | null; tipo: string }[];
  monitoreos: { id: string; parcela_nombre: string; zafra_nombre: string; concluido: boolean }[];
  evaluacionesProximas: { fecha_proxima_evaluacion: string; parcela_nombre: string }[];
}

export function EspacioClientePage() {
  const { perfil } = useAuth();
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!perfil?.id) {
        setLoading(false);
        return;
      }
      const { data: cliente } = await supabase
        .from("clientes")
        .select("id")
        .eq("id_usuario_auth", perfil.id)
        .maybeSingle();
      const cid = (cliente as any)?.id ?? null;
      setClienteId(cid);
      if (!cid) {
        setLoading(false);
        return;
      }
      const [parcelasRes, propuestasRes, monitoreosRes, evaluacionesRes] = await Promise.all([
        supabase.from("parcelas").select("id, nombre_parcela, localidad, area_real_ha").eq("id_cliente", cid).eq("estado", "activo").order("nombre_parcela"),
        supabase.from("propuestas").select("id, fecha, total_general, id_tipo_propuesta").eq("id_cliente", cid).order("fecha", { ascending: false }).limit(20),
        supabase.from("monitoreos").select("id, id_parcela, id_zafra, concluido").eq("id_cliente", cid).order("created_at", { ascending: false }),
        supabase.from("evaluaciones").select("id_monitoreo, fecha_proxima_evaluacion").gte("fecha_proxima_evaluacion", new Date().toISOString().slice(0, 10)).order("fecha_proxima_evaluacion").limit(20),
      ]);
      const parcelas = (parcelasRes.data ?? []) as any[];
      const propuestas = (propuestasRes.data ?? []) as any[];
      const monitoreosRaw = (monitoreosRes.data ?? []) as any[];
      const evaluacionesRaw = (evaluacionesRes.data ?? []) as any[];

      const pIds = [...new Set(monitoreosRaw.map((m) => m.id_parcela))];
      const zIds = [...new Set(monitoreosRaw.map((m) => m.id_zafra))];
      const monIds = evaluacionesRaw.map((e) => e.id_monitoreo);
      let pMap: Record<string, string> = {};
      let zMap: Record<string, string> = {};
      let monMap: Record<string, { id_parcela: string }> = {};
      if (pIds.length) {
        const { data: p } = await supabase.from("parcelas").select("id, nombre_parcela").in("id", pIds);
        if (p) pMap = Object.fromEntries((p as any[]).map((x) => [x.id, x.nombre_parcela]));
      }
      if (zIds.length) {
        const { data: z } = await supabase.from("zafras").select("id, nombre_zafra").in("id", zIds);
        if (z) zMap = Object.fromEntries((z as any[]).map((x) => [x.id, x.nombre_zafra]));
      }
      if (monIds.length) {
        const { data: mon } = await supabase.from("monitoreos").select("id, id_parcela").in("id", monIds);
        if (mon) monMap = Object.fromEntries((mon as any[]).map((m) => [m.id, { id_parcela: m.id_parcela }]));
      }

      const tipoMap: Record<string, string> = {};
      const tipoIds = [...new Set(propuestas.map((p) => p.id_tipo_propuesta).filter(Boolean))];
      if (tipoIds.length) {
        const { data: t } = await supabase.from("tipo_propuesta").select("id, codigo").in("id", tipoIds);
        if (t) Object.assign(tipoMap, Object.fromEntries((t as any[]).map((x) => [x.id, x.codigo === "venta" ? "Venta" : "Presupuesto"])));
      }

      setResumen({
        parcelas,
        propuestas: propuestas.map((p) => ({
          id: p.id,
          fecha: p.fecha,
          total_general: p.total_general,
          tipo: p.id_tipo_propuesta ? tipoMap[p.id_tipo_propuesta] ?? "" : "",
        })),
        monitoreos: monitoreosRaw.map((m) => ({
          id: m.id,
          parcela_nombre: pMap[m.id_parcela] ?? "",
          zafra_nombre: zMap[m.id_zafra] ?? "",
          concluido: m.concluido ?? false,
        })),
        evaluacionesProximas: evaluacionesRaw.map((e) => ({
          fecha_proxima_evaluacion: e.fecha_proxima_evaluacion,
          parcela_nombre: monMap[e.id_monitoreo] ? pMap[monMap[e.id_monitoreo].id_parcela] ?? "" : "",
        })),
      });
      setLoading(false);
    };
    load();
  }, [perfil?.id]);

  if (loading) {
    return (
      <section className="content">
        <div className="container-fluid">
          <p>Cargando su espacio...</p>
        </div>
      </section>
    );
  }

  if (!clienteId) {
    return (
      <section className="content">
        <div className="container-fluid">
          <div className="alert alert-info">
            No se encontró un cliente asociado a su usuario. Contacte al administrador.
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="content">
      <div className="container-fluid">
        <div className="card">
          <div className="card-header bg-success text-white">
            <h3 className="card-title mb-0">Espacio del Cliente</h3>
          </div>
          <div className="card-body">
            <p className="text-muted">
              Aquí puede acompañar sus parcelas, propuestas, monitoreos y próximas visitas.
            </p>

            <h5 className="mt-4 border-bottom pb-1">Parcelas</h5>
            {resumen && resumen.parcelas.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Localidad</th>
                      <th>Área real (ha)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.parcelas.map((p) => (
                      <tr key={p.id}>
                        <td>{p.nombre_parcela}</td>
                        <td>{p.localidad ?? "-"}</td>
                        <td>{formatDecimal(p.area_real_ha)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No tiene parcelas registradas.</p>
            )}

            <h5 className="mt-4 border-bottom pb-1">Propuestas recientes</h5>
            {resumen && resumen.propuestas.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Total (USD)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.propuestas.map((p) => (
                      <tr key={p.id}>
                        <td>{p.fecha}</td>
                        <td>{p.tipo}</td>
                        <td>{formatDecimal(p.total_general)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No hay propuestas.</p>
            )}

            <h5 className="mt-4 border-bottom pb-1">Monitoreos</h5>
            {resumen && resumen.monitoreos.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Parcela</th>
                      <th>Zafra</th>
                      <th>Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.monitoreos.map((m) => (
                      <tr key={m.id}>
                        <td>{m.parcela_nombre}</td>
                        <td>{m.zafra_nombre}</td>
                        <td>{m.concluido ? "Concluido" : "En curso"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No hay monitoreos.</p>
            )}

            <h5 className="mt-4 border-bottom pb-1">Próximas evaluaciones / visitas</h5>
            {resumen && resumen.evaluacionesProximas.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm table-striped">
                  <thead>
                    <tr>
                      <th>Fecha próxima</th>
                      <th>Parcela</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.evaluacionesProximas.map((e, i) => (
                      <tr key={i}>
                        <td>{e.fecha_proxima_evaluacion}</td>
                        <td>{e.parcela_nombre}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted">No hay próximas evaluaciones programadas.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

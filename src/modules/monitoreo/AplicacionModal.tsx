import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { formatDecimal } from "../productos/utils";
import { generarPdfAplicacion } from "./pdfAplicacion";

export interface MonitoreoForModal {
  id: string;
  id_zafra: string;
  hectares: number | null;
  parcela_nombre: string;
  zafra_nombre: string;
  cliente_nombre: string;
}

interface ProductoOption {
  id: string;
  nombre: string;
  contenido_empaque: number | null;
  precio_venta: number | null;
  culturas: string[] | null;
}

interface AplicacionLine {
  id_producto: string;
  nombre: string;
  dosis_ha: string;
  cantidad: number;
  importe_total: number;
  costo_ha: number;
  contenido_empaque: number | null;
  precio_venta: number | null;
}

interface AplicacionModalProps {
  aplicacionId: string;
  monitoreo: MonitoreoForModal | null;
  areaHa: number | null;
  onClose: () => void;
  onSaved: () => void;
}

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-gray-200 bg-white focus:border-agro-primary focus:ring-2 focus:ring-agro-primary/20 outline-none transition-all disabled:bg-gray-50 disabled:text-gray-400";
const labelCls = "block text-xs font-bold text-gray-600 mb-1";
const btnPrimary = "inline-flex items-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100";
const btnSecondary = "inline-flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all";

export function AplicacionModal({ aplicacionId, monitoreo: monitoreoProp, areaHa, onClose, onSaved }: AplicacionModalProps) {
  const [monitoreo, setMonitoreo] = useState<MonitoreoForModal | null>(monitoreoProp);
  const [fechaAplicacion, setFechaAplicacion] = useState("");
  const [idTipoAplicacion, setIdTipoAplicacion] = useState("");
  const [rendimientoTanqueHa, setRendimientoTanqueHa] = useState("");
  const [tiposAplicacion, setTiposAplicacion] = useState<{ id: string; descripcion: string }[]>([]);
  const [productos, setProductos] = useState<ProductoOption[]>([]);
  const [lines, setLines] = useState<AplicacionLine[]>([]);
  const [productoAdd, setProductoAdd] = useState("");
  const [dosisAdd, setDosisAdd] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);

  const area = areaHa ?? 0;
  const areaValid = area > 0 || (monitoreo?.hectares && monitoreo.hectares > 0);
  const currentArea = area > 0 ? area : (monitoreo?.hectares ?? 0);

  useEffect(() => {
    const load = async () => {
      const isReviewMode = localStorage.getItem("forceAuthReview") === "true";
      if (isReviewMode) {
        setFechaAplicacion(new Date().toISOString().slice(0, 10));
        setTiposAplicacion([
          { id: "t-1", descripcion: "Terrestre" },
          { id: "t-2", descripcion: "Aérea" }
        ]);
        setProductos([
          { id: "mock-a1", nombre: "Glifosato 48%", contenido_empaque: 20, precio_venta: 85, culturas: [] },
          { id: "mock-a2", nombre: "Insecticida X", contenido_empaque: 5, precio_venta: 150, culturas: [] }
        ]);
        setLoading(false);
        return;
      }

      const { data: apl } = await supabase
        .from("aplicaciones")
        .select("id_monitoreo, fecha_aplicacion, id_tipo_aplicacion, rendimiento_tanque_ha")
        .eq("id", aplicacionId)
        .single();

      let monRef: MonitoreoForModal | null = monitoreoProp;
      if (apl && !monitoreoProp) {
        const { data: mon } = await supabase
          .from("monitoreos")
          .select("id, id_cliente, id_parcela, id_zafra, hectares, parcelas(nombre_parcela), zafras(nombre_zafra), clientes(nombre)")
          .eq("id", (apl as any).id_monitoreo)
          .single();
        if (mon) {
          const m = mon as any;
          monRef = {
            id: m.id,
            id_zafra: m.id_zafra,
            hectares: m.hectares,
            parcela_nombre: m.parcelas?.nombre_parcela ?? "",
            zafra_nombre: m.zafras?.nombre_zafra ?? "",
            cliente_nombre: m.clientes?.nombre ?? "",
          };
          setMonitoreo(monRef);
        }
      } else if (monitoreoProp) {
        setMonitoreo(monitoreoProp);
      }

      if (apl) {
        setFechaAplicacion((apl as any).fecha_aplicacion ?? "");
        setIdTipoAplicacion((apl as any).id_tipo_aplicacion ?? "");
        setRendimientoTanqueHa(String((apl as any).rendimiento_tanque_ha ?? ""));
      }

      const { data: tipos } = await supabase.from("tipo_aplicacion").select("id, descripcion");
      setTiposAplicacion((tipos as any[]) ?? []);

      let idZafra = monRef?.id_zafra;
      if (!idZafra && apl) {
        const { data: monZ } = await supabase.from("monitoreos").select("id_zafra").eq("id", (apl as any).id_monitoreo).single();
        idZafra = (monZ as any)?.id_zafra;
      }
      if (idZafra) {
        const { data: zafra } = await supabase.from("zafras").select("id_cultura").eq("id", idZafra).single();
        const idCultura = (zafra as any)?.id_cultura;
        let q = supabase.from("productos").select("id, nombre, contenido_empaque, precio_venta, culturas").eq("estado", "activo");
        if (idCultura) q = q.contains("culturas", [idCultura]);
        const { data: prods } = await q;
        setProductos((prods as ProductoOption[]) ?? []);
      }

      const { data: items } = await supabase
        .from("aplicacion_productos")
        .select("*, productos(nombre, contenido_empaque, precio_venta)")
        .eq("id_aplicacion", aplicacionId)
        .order("created_at", { ascending: true });

      if (items?.length && apl) {
        const mId = (apl as any).id_monitoreo;
        let areaVal = currentArea;
        if (!areaVal && mId) {
          const { data: monVal } = await supabase.from("monitoreos").select("hectares").eq("id", mId).single();
          areaVal = (monVal as any)?.hectares ?? 0;
        }
        const areaOk = areaVal > 0;
        setLines(
          (items as any[]).map((it) => {
            const p = it.productos ?? {};
            const cant = Number(it.cantidad) || 0;
            const imp = Number(it.importe_total) || 0;
            const costoHa = areaOk ? imp / areaVal : 0;
            return {
              id_producto: it.id_producto,
              nombre: p.nombre ?? "-",
              dosis_ha: String(it.dosis_ha ?? ""),
              cantidad: cant,
              importe_total: imp,
              costo_ha: costoHa,
              contenido_empaque: p.contenido_empaque ?? null,
              precio_venta: p.precio_venta ?? null,
            };
          })
        );
      }
      setLoading(false);
    };
    load();
  }, [aplicacionId, areaHa, monitoreoProp?.id, currentArea]);

  const addLine = () => {
    const prod = productos.find((p) => p.id === productoAdd);
    if (!prod || !dosisAdd.trim() || !areaValid) return;
    const dosis = Number(dosisAdd.replace(",", ".")) || 0;
    const conteúdo = Number(prod.contenido_empaque) || 1;
    const quantidade = (currentArea * dosis) / conteúdo;
    const precio = Number(prod.precio_venta) || 0;
    const importe_total = quantidade * precio;
    const costo_ha = currentArea > 0 ? importe_total / currentArea : 0;
    if (lines.some((l) => l.id_producto === prod.id)) return;
    setLines((prev) => [
      ...prev,
      {
        id_producto: prod.id,
        nombre: prod.nombre,
        dosis_ha: dosisAdd,
        cantidad: quantidade,
        importe_total,
        costo_ha,
        contenido_empaque: prod.contenido_empaque,
        precio_venta: prod.precio_venta,
      },
    ]);
    setProductoAdd("");
    setDosisAdd("");
  };

  const removeLine = (idProducto: string) => {
    setLines((prev) => prev.filter((l) => l.id_producto !== idProducto));
  };

  const updateDosis = (idProducto: string, dosisHa: string) => {
    const dosis = Number(dosisHa.replace(",", ".")) || 0;
    setLines((prev) =>
      prev.map((l) => {
        if (l.id_producto !== idProducto) return l;
        const conteúdo = l.contenido_empaque ?? 1;
        const quantidade = (currentArea * dosis) / conteúdo;
        const importe_total = quantidade * (l.precio_venta ?? 0);
        const costo_ha = currentArea > 0 ? importe_total / currentArea : 0;
        return { ...l, dosis_ha: dosisHa, quantidade, importe_total, costo_ha };
      })
    );
  };

  const totals = useMemo(() => {
    const total = lines.reduce((s, l) => s + l.importe_total, 0);
    const costoHa = currentArea > 0 && total > 0 ? total / currentArea : 0;
    return { total, costoHa };
  }, [lines, currentArea]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await supabase
      .from("aplicaciones")
      .update({
        fecha_aplicacion: fechaAplicacion || null,
        id_tipo_aplicacion: idTipoAplicacion || null,
        rendimiento_tanque_ha: rendimientoTanqueHa !== "" ? Number(rendimientoTanqueHa) : null,
        costo_total: totals.total,
        costo_ha: totals.costoHa,
      })
      .eq("id", aplicacionId);

    await supabase.from("aplicacion_productos").delete().eq("id_aplicacion", aplicacionId);
    if (lines.length > 0) {
      await supabase.from("aplicacion_productos").insert(
        lines.map((l) => ({
          id_aplicacion: aplicacionId,
          id_producto: l.id_producto,
          categoria: null,
          cantidad: l.cantidad,
          dosis_ha: Number(l.dosis_ha.replace(",", ".")) || 0,
          importe_total: l.importe_total,
          costo_ha: l.costo_ha,
        }))
      );
    }
    setSaving(false);
    onSaved();
    onClose();
  };

  const handlePdf = async () => {
    setGenerandoPdf(true);
    await generarPdfAplicacion(supabase, aplicacionId);
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
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <i className="fas fa-spray-can text-sm" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900 leading-tight text-base">Registro de Aplicación</h3>
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
            {!areaValid && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-xs flex items-center gap-3">
                <i className="fas fa-exclamation-triangle text-amber-500" />
                Configure el área (ha) para calcular cantidades.
              </div>
            )}

            <div className="grid grid-cols-4 gap-4">
              <div>
                <label className={labelCls}>Fecha aplicación</label>
                <input
                  type="date"
                  className={inputCls}
                  value={fechaAplicacion}
                  onChange={(e) => setFechaAplicacion(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Tipo aplicación</label>
                <select
                  className={inputCls}
                  value={idTipoAplicacion}
                  onChange={(e) => setIdTipoAplicacion(e.target.value)}
                >
                  <option value="">Seleccione</option>
                  {tiposAplicacion.map((t) => (
                    <option key={t.id} value={t.id}>{t.descripcion}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Rend. tanque/ha</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="0.00"
                  value={rendimientoTanqueHa}
                  onChange={(e) => setRendimientoTanqueHa(e.target.value)}
                />
              </div>
              <div>
                <label className={labelCls}>Área (ha)</label>
                <input
                  type="text"
                  className={`${inputCls} bg-gray-50 font-mono`}
                  value={formatDecimal(currentArea) || "-"}
                  readOnly
                />
              </div>
            </div>

            {/* Insumos Section */}
            <div className="p-5 border border-gray-100 rounded-2xl bg-gray-50/50 space-y-4">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <i className="fas fa-flask text-[10px]" /> Productos Aplicados
              </h4>
              <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-7">
                  <label className={labelCls}>Producto (Filtrado por Cultura)</label>
                  <select
                    className={inputCls}
                    value={productoAdd}
                    onChange={(e) => setProductoAdd(e.target.value)}
                  >
                    <option value="">Seleccione un producto</option>
                    {productos
                      .filter((p) => !lines.some((l) => l.id_producto === p.id))
                      .map((p) => (
                        <option key={p.id} value={p.id}>{p.nombre}</option>
                      ))}
                  </select>
                </div>
                <div className="col-span-6 md:col-span-3">
                  <label className={labelCls}>Dosis/ha</label>
                  <input
                    type="text"
                    className={inputCls}
                    placeholder="0.00"
                    value={dosisAdd}
                    onChange={(e) => setDosisAdd(e.target.value)}
                  />
                </div>
                <div className="col-span-6 md:col-span-2">
                  <button
                    type="button"
                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-agro-primary text-white text-sm font-bold rounded-xl shadow shadow-agro-primary/20 hover:opacity-90 transition-all active:scale-95 disabled:opacity-50"
                    onClick={addLine}
                    disabled={!productoAdd || !dosisAdd.trim() || !areaValid}
                  >
                    <i className="fas fa-plus text-xs" /> Agregar
                  </button>
                </div>
              </div>

              {/* Tabela de Linhas */}
              {lines.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm mt-4">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="text-left px-3 py-2.5 font-bold text-gray-500">Producto</th>
                        <th className="text-left px-3 py-2.5 font-bold text-gray-500 w-24">Dosis/ha</th>
                        <th className="text-right px-3 py-2.5 font-bold text-gray-500">Quantidade</th>
                        <th className="text-right px-3 py-2.5 font-bold text-gray-500">Costo/ha</th>
                        <th className="text-right px-3 py-2.5 font-bold text-gray-500">Total USD</th>
                        <th className="w-10 px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((l) => (
                        <tr key={l.id_producto} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="px-3 py-2 font-bold text-gray-800">{l.nombre}</td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              className="w-full px-2 py-1 text-xs rounded-lg border border-gray-200 bg-white focus:border-agro-primary outline-none transition-all"
                              value={l.dosis_ha}
                              onChange={(e) => updateDosis(l.id_producto, e.target.value)}
                            />
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">{formatDecimal(l.cantidad)}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-600">${formatDecimal(l.costo_ha)}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-agro-primary">${formatDecimal(l.importe_total)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              className="w-6 h-6 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all"
                              onClick={() => removeLine(l.id_producto)}
                            >
                              <i className="fas fa-trash-alt text-[10px]" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50/80 font-black border-t-2 border-gray-200">
                        <td colSpan={3} className="px-3 py-3 text-right uppercase tracking-wider text-[10px] text-gray-400">Totales Aplicación:</td>
                        <td className="px-3 py-3 text-right font-mono text-agro-primary underline decoration-2 underline-offset-4">${formatDecimal(totals.costoHa)}/ha</td>
                        <td className="px-3 py-3 text-right font-mono text-lg text-agro-primary">${formatDecimal(totals.total)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
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
                <><i className="fas fa-file-pdf" /> Exportar Aplicación PDF</>
              )}
            </button>
            <div className="flex gap-3">
              <button type="button" className={btnSecondary} onClick={onClose}>Cancelar</button>
              <button type="submit" className={btnPrimary} disabled={saving}>
                {saving ? (
                  <><i className="fas fa-spinner fa-spin text-xs" /> Guardando...</>
                ) : (
                  <><i className="fas fa-save text-xs" /> Guardar Aplicación</>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

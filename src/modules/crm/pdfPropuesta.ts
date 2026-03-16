import { jsPDF } from "jspdf";
import type { SupabaseClient } from "@supabase/supabase-js";

function formatNum(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "-";
  return Number(n).toFixed(3);
}

export async function generarPdfPropuesta(
  supabase: SupabaseClient,
  propuestaId: string,
  conMargenYCosto: boolean
): Promise<void> {
  const { data: prop } = await supabase
    .from("propuestas")
    .select(
      "id, sku, fecha, total_general, total_voucher, total_items, id_cliente, clientes(nombre)"
    )
    .eq("id", propuestaId)
    .single();
  if (!prop) return;

  const { data: items } = await supabase
    .from("productos_propuesta")
    .select("*, productos(nombre)")
    .eq("id_propuesta", propuestaId)
    .order("created_at", { ascending: true });

  const { data: emp } = await supabase
    .from("empresa")
    .select("ruc, direccion, telefono")
    .limit(1)
    .maybeSingle();

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = (doc.internal.pageSize as any).getWidth() as number;
  let y = 18;

  const empresa = emp as { ruc?: string; direccion?: string; telefono?: string } | null;
  doc.setFontSize(14);
  doc.setTextColor(46, 125, 50);
  doc.text("Primesoft CBISA", 14, y);
  y += 6;
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  if (empresa?.ruc) doc.text(`RUC: ${empresa.ruc}`, 14, y);
  if (empresa?.direccion) doc.text(empresa.direccion, 14, y + 4);
  if (empresa?.telefono) doc.text(`Tel: ${empresa.telefono}`, 14, y + 8);
  y += 14;

  doc.setFontSize(12);
  doc.text(conMargenYCosto ? "Propuesta (con composición de precio)" : "Propuesta", 14, y);
  y += 8;

  const clienteNombre = (prop as any).clientes?.nombre ?? "";
  doc.setFontSize(10);
  doc.text(`Cliente: ${clienteNombre}`, 14, y);
  y += 5;
  doc.text(`Fecha: ${(prop as any).fecha}`, 14, y);
  y += 5;
  if ((prop as any).sku) {
    doc.text(`SKU: ${(prop as any).sku}`, 14, y);
    y += 5;
  }
  y += 4;

  const productos = (items ?? []) as any[];
  const colWidths = conMargenYCosto
    ? [40, 18, 15, 18, 18, 22, 22, 22]
    : [55, 22, 18, 22, 25, 28];
  const headers = conMargenYCosto
    ? ["Producto", "Cant.", "Dosis/ha", "Área trat.", "Costo/ha", "Importe", "P. compra", "Margen"]
    : ["Producto", "Cantidad", "Dosis/ha", "Área tratada", "Costo/ha", "Importe total"];

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  let x = 14;
  headers.forEach((h, i) => {
    doc.text(h.substring(0, 12), x, y);
    x += colWidths[i];
  });
  y += 6;
  doc.setFont("helvetica", "normal");

  productos.forEach((it) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    x = 14;
    const nombreProducto = (it as any).productos?.nombre ?? (it as any).nombre ?? "-";
    const row = conMargenYCosto
      ? [
        nombreProducto.substring(0, 20),
        formatNum(it.cantidad),
        formatNum(it.dosis_ha),
        formatNum(it.area_tratada),
        formatNum(it.costo_ha),
        formatNum(it.importe_total),
        formatNum(it.precio_compra_base),
        formatNum(it.margen_base),
      ]
      : [
        nombreProducto.substring(0, 28),
        formatNum(it.cantidad),
        formatNum(it.dosis_ha),
        formatNum(it.area_tratada),
        formatNum(it.costo_ha),
        formatNum(it.importe_total),
      ];
    const colW = conMargenYCosto ? colWidths : colWidths;
    row.forEach((cell, i) => {
      doc.text(String(cell).substring(0, 14), x, y);
      x += colW[i];
    });
    y += 5;
  });

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text(`Total ítems: ${(prop as any).total_items ?? 0}`, 14, y);
  y += 5;
  doc.text(`Total general (USD): ${formatNum((prop as any).total_general)}`, 14, y);
  if ((prop as any).total_voucher) {
    y += 5;
    doc.text(`Total voucher (USD): ${formatNum((prop as any).total_voucher)}`, 14, y);
  }
  doc.setFont("helvetica", "normal");

  doc.save(
    `propuesta_${(prop as any).fecha}_${clienteNombre.substring(0, 20).replace(/\s/g, "_")}.pdf`
  );
}

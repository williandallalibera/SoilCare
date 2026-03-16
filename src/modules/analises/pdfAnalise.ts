import { jsPDF } from "jspdf";
import brandLogo from "../../assets/soil-care-brand.svg";
import type { Locale } from "../i18n/I18nContext";
import type { AnaliseSolo } from "../soil-analysis/types";
import { formatDate, formatNumber } from "../soil-analysis/utils";

type PartialAnalise = Pick<AnaliseSolo, "id" | "input" | "resultado" | "created_at" | "updated_at">;

interface AnalisePdfPayload {
  analise: PartialAnalise;
  clienteNome: string;
  areaNome: string;
  locale?: Locale;
}

type PdfColumn = {
  header: string;
  width: number;
  align?: "left" | "right";
};

const PRIMARY: [number, number, number] = [78, 52, 46];
const PRIMARY_SOFT: [number, number, number] = [239, 231, 228];
const PRIMARY_SOFT_ALT: [number, number, number] = [248, 243, 241];
const BORDER: [number, number, number] = [214, 204, 199];
const TEXT: [number, number, number] = [38, 38, 38];
const MUTED: [number, number, number] = [117, 117, 117];
const WARNING: [number, number, number] = [180, 83, 9];

const SUBSCRIPT_MAP: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
};

const SUPERSCRIPT_MAP: Record<string, string> = {
  "⁰": "0",
  "¹": "1",
  "²": "2",
  "³": "3",
  "⁴": "4",
  "⁵": "5",
  "⁶": "6",
  "⁷": "7",
  "⁸": "8",
  "⁹": "9",
  "⁺": "+",
  "⁻": "-",
};

type PdfCopy = {
  tagline: string;
  generatedAt: string;
  headerReport: string;
  title: string;
  intro: string;
  docTitle: string;
  docSubject: string;
  docKeywords: string;
  sectionIdentification: string;
  labelClient: string;
  labelArea: string;
  labelAnalysisCode: string;
  labelTargetProduction: string;
  labelAnalysisDate: string;
  labelPdfDate: string;
  sectionFinalRecommendation: string;
  sectionFinalRecommendationSubtitle: string;
  labelStatus: string;
  statusMaintenance: string;
  statusCorrection: string;
  labelFormula: string;
  labelDose: string;
  labelSeparated: string;
  sectionAlerts: string;
  sectionBalance: string;
  sectionBalanceSubtitle: string;
  headerNutrient: string;
  headerCurrent: string;
  headerIdeal: string;
  headerNeed: string;
  headerTechnicalNote: string;
  sectionLiming: string;
  labelTotalLimestone: string;
  labelType: string;
  labelRelationCaMg: string;
  labelLimestoneForCa: string;
  labelLimestoneForMg: string;
  labelPartCaCtc: string;
  labelPartMgCtc: string;
  limestoneTypeCalcitic: string;
  limestoneTypeDolomitic: string;
  sectionExtraction: string;
  sectionExtractionSubtitle: string;
  headerSoilReserve: string;
  headerNeedPerBag: string;
  headerTotalNeed: string;
  headerResult: string;
  headerProduct: string;
  sectionObservations: string;
  sectionClosing: string;
  closingNote: string;
  footerTitle: string;
  pageLabel: string;
  filePrefix: string;
};

const PDF_COPY: Record<Locale, PdfCopy> = {
  pt: {
    tagline: "Damos vida ao solo",
    generatedAt: "Gerado em",
    headerReport: "Relatorio tecnico de analise de solo",
    title: "Analise de Solo e Recomendacao",
    intro:
      "Relatorio consolidado com a leitura final da analise e a recomendacao gerada pelo sistema.",
    docTitle: "Soil Care - Analise de Solo",
    docSubject: "Relatorio da analise",
    docKeywords: "solo, analise, recomendacao, fertilidade",
    sectionIdentification: "Identificacao da Analise",
    labelClient: "Cliente",
    labelArea: "Parcela / Area",
    labelAnalysisCode: "Codigo da analise",
    labelTargetProduction: "Producao desejada",
    labelAnalysisDate: "Data da analise no sistema",
    labelPdfDate: "Data de geracao do PDF",
    sectionFinalRecommendation: "Recomendacao Final",
    sectionFinalRecommendationSubtitle:
      "Leitura principal da recomendacao gerada, no mesmo formato de decisao usado na tela.",
    labelStatus: "Status",
    statusMaintenance: "Manutencao",
    statusCorrection: "Correcao",
    labelFormula: "Formula",
    labelDose: "Dose",
    labelSeparated: "Separada",
    sectionAlerts: "Alertas e Observacoes do Sistema",
    sectionBalance: "Equilibrio Nutricional",
    sectionBalanceSubtitle:
      "Leitura instantanea do que esta adequado e do que precisa correcao.",
    headerNutrient: "Nutriente",
    headerCurrent: "Atual",
    headerIdeal: "Ideal",
    headerNeed: "Necessidade",
    headerTechnicalNote: "Nota tecnica",
    sectionLiming: "Calagem",
    labelTotalLimestone: "Total Calcario",
    labelType: "Tipo",
    labelRelationCaMg: "Relacao Ca/Mg",
    labelLimestoneForCa: "Calcario p/ Ca",
    labelLimestoneForMg: "Calcario p/ Mg",
    labelPartCaCtc: "Part. Ca CTC",
    labelPartMgCtc: "Part. Mg CTC",
    limestoneTypeCalcitic: "Calcitico",
    limestoneTypeDolomitic: "Dolomitico",
    sectionExtraction: "Extracao x Producao",
    sectionExtractionSubtitle:
      "Leitura final de reserva, necessidade e produto recomendado por nutriente.",
    headerSoilReserve: "Reserva Solo",
    headerNeedPerBag: "Necessidade/Bolsa",
    headerTotalNeed: "Total Necessario",
    headerResult: "Resultado",
    headerProduct: "Produto",
    sectionObservations: "Observacoes registradas na analise",
    sectionClosing: "Fechamento",
    closingNote:
      "Este PDF foi gerado automaticamente pelo Soil Care com base nos dados cadastrados no sistema e no resultado salvo da analise. Recomenda-se validar a recomendacao com o responsavel tecnico antes da aplicacao em campo.",
    footerTitle: "Soil Care - Relatorio completo de analise de solo",
    pageLabel: "Pagina",
    filePrefix: "analise_solo",
  },
  es: {
    tagline: "Damos vida al suelo",
    generatedAt: "Generado el",
    headerReport: "Informe tecnico de analisis de suelo",
    title: "Analisis de Suelo y Recomendacion",
    intro:
      "Informe consolidado con la lectura final del analisis y la recomendacion generada por el sistema.",
    docTitle: "Soil Care - Analisis de Suelo",
    docSubject: "Informe del analisis",
    docKeywords: "suelo, analisis, recomendacion, fertilidad",
    sectionIdentification: "Identificacion del Analisis",
    labelClient: "Cliente",
    labelArea: "Parcela / Area",
    labelAnalysisCode: "Codigo del analisis",
    labelTargetProduction: "Produccion deseada",
    labelAnalysisDate: "Fecha del analisis en el sistema",
    labelPdfDate: "Fecha de generacion del PDF",
    sectionFinalRecommendation: "Recomendacion Final",
    sectionFinalRecommendationSubtitle:
      "Lectura principal de la recomendacion generada, con el mismo formato de decision usado en pantalla.",
    labelStatus: "Estado",
    statusMaintenance: "Mantenimiento",
    statusCorrection: "Correccion",
    labelFormula: "Formula",
    labelDose: "Dosis",
    labelSeparated: "Separada",
    sectionAlerts: "Alertas y Observaciones del Sistema",
    sectionBalance: "Equilibrio Nutricional",
    sectionBalanceSubtitle:
      "Lectura inmediata de lo que esta adecuado y de lo que necesita correccion.",
    headerNutrient: "Nutriente",
    headerCurrent: "Actual",
    headerIdeal: "Ideal",
    headerNeed: "Necesidad",
    headerTechnicalNote: "Nota tecnica",
    sectionLiming: "Encalado",
    labelTotalLimestone: "Total de Calcario",
    labelType: "Tipo",
    labelRelationCaMg: "Relacion Ca/Mg",
    labelLimestoneForCa: "Calcario p/ Ca",
    labelLimestoneForMg: "Calcario p/ Mg",
    labelPartCaCtc: "Part. Ca CTC",
    labelPartMgCtc: "Part. Mg CTC",
    limestoneTypeCalcitic: "Calcitico",
    limestoneTypeDolomitic: "Dolomitico",
    sectionExtraction: "Extraccion x Produccion",
    sectionExtractionSubtitle:
      "Lectura final de reserva, necesidad y producto recomendado por nutriente.",
    headerSoilReserve: "Reserva del suelo",
    headerNeedPerBag: "Necesidad/Bolsa",
    headerTotalNeed: "Total necesario",
    headerResult: "Resultado",
    headerProduct: "Producto",
    sectionObservations: "Observaciones registradas en el analisis",
    sectionClosing: "Cierre",
    closingNote:
      "Este PDF fue generado automaticamente por Soil Care con base en los datos cargados en el sistema y en el resultado guardado del analisis. Se recomienda validar la recomendacion con el responsable tecnico antes de la aplicacion en campo.",
    footerTitle: "Soil Care - Informe completo de analisis de suelo",
    pageLabel: "Pagina",
    filePrefix: "analisis_suelo",
  },
};

function formatValue(value: number | null | undefined, digits = 2, unit?: string): string {
  const formatted = formatNumber(value, digits);
  if (formatted === "-") return formatted;
  return unit ? `${formatted} ${unit}` : formatted;
}

function formatSignedValue(value: number | null | undefined, digits = 2, unit?: string): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatNumber(value, digits)}${unit ? ` ${unit}` : ""}`;
}

function normalizePdfText(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "-";

  return String(value)
    .replace(/SO₄²⁻/g, "SO4")
    .replace(/P₂O₅/g, "P2O5")
    .replace(/K₂O/g, "K2O")
    .replace(/[₀-₉]/g, (char) => SUBSCRIPT_MAP[char] ?? char)
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]/g, (char) => SUPERSCRIPT_MAP[char] ?? char)
    .replace(/[•·]/g, " - ")
    .replace(/[–—]/g, "-")
    .replace(/\u00A0/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .replace(/\s+\|\s+/g, " | ")
    .trim();
}

function translatePdfDynamicText(value: string, locale: Locale): string {
  if (locale !== "es") return value;

  const replacements: Array<[RegExp, string]> = [
    [/Potássio/g, "Potasio"],
    [/Cálcio/g, "Calcio"],
    [/Magnésio/g, "Magnesio"],
    [/Fósforo/g, "Fosforo"],
    [/Enxofre/g, "Azufre"],
    [/Manganês/g, "Manganeso"],
    [/Adequado/g, "Adecuado"],
    [/Excesso/g, "Exceso"],
    [/Crítico/g, "Critico"],
    [/Correção/g, "Correccion"],
    [/correção/g, "correccion"],
    [/manutenção/g, "mantenimiento"],
    [/Manutenção/g, "Mantenimiento"],
    [/Participação CTC/g, "Participacion CTC"],
    [/Faixa ideal/g, "Rango ideal"],
    [/Produto comercial/g, "Producto comercial"],
    [/abaixo do ideal/g, "por debajo del ideal"],
    [/precisa correção/g, "necesita correccion"],
    [/Os nutrientes principais já estão acima do nível mínimo de correção\./g, "Los nutrientes principales ya estan por encima del nivel minimo de correccion."],
    [/Risco de salinidade/g, "Riesgo de salinidad"],
    [/Apenas manutenção/g, "Solo mantenimiento"],
  ];

  return replacements.reduce(
    (current, [pattern, replacement]) => current.replace(pattern, replacement),
    value
  );
}

function sanitizeFileName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function loadLogoDataUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      const targetHeight = 220;
      const scale = targetHeight / image.naturalHeight;
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = targetHeight;

      const context = canvas.getContext("2d");
      if (!context) {
        resolve(null);
        return;
      }

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = () => resolve(null);
    image.src = brandLogo;
  });
}

export async function gerarPdfAnaliseSolo({
  analise,
  clienteNome,
  areaNome,
  locale = "pt",
}: AnalisePdfPayload): Promise<void> {
  const logoDataUrl = await loadLogoDataUrl();
  const generatedAt = new Date();
  const input = analise.input;
  const resultado = analise.resultado;
  const copy = PDF_COPY[locale];
  const dateLocale = locale === "es" ? "es-ES" : "pt-BR";

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  const bottomLimit = pageHeight - 18;
  const rowGap = 3;
  let cursorY = 0;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);

  const localizePdfText = (value: string | number | null | undefined) =>
    normalizePdfText(
      typeof value === "string" ? translatePdfDynamicText(value, locale) : value
    );

  const drawPageHeader = () => {
    doc.setFillColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.rect(0, 0, pageWidth, 20, "F");

    if (logoDataUrl) {
      doc.addImage(logoDataUrl, "PNG", margin, 3.2, 13, 13);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(255, 255, 255);
    doc.text("Soil Care", logoDataUrl ? margin + 16.5 : margin, 9.5);
    doc.setFontSize(8);
    doc.text(copy.tagline, logoDataUrl ? margin + 16.5 : margin, 14.4);
    doc.setFontSize(8.5);
    doc.text(
      `${copy.generatedAt} ${generatedAt.toLocaleString(dateLocale)}`,
      pageWidth - margin,
      9.5,
      { align: "right" }
    );
    doc.text(copy.headerReport, pageWidth - margin, 14.4, {
      align: "right",
    });

    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    cursorY = 29;
    doc.text(copy.title, margin, cursorY);
    cursorY += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(copy.intro, margin, cursorY);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    cursorY += 6;
  };

  const addPage = () => {
    doc.addPage();
    drawPageHeader();
  };

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY + heightNeeded <= bottomLimit) return;
    addPage();
  };

  const addSectionTitle = (title: string, subtitle?: string) => {
    ensureSpace(subtitle ? 16 : 10);
    const safeTitle = localizePdfText(title);
    const safeSubtitle = subtitle ? localizePdfText(subtitle) : undefined;
    doc.setFillColor(PRIMARY_SOFT[0], PRIMARY_SOFT[1], PRIMARY_SOFT[2]);
    doc.roundedRect(margin, cursorY, contentWidth, 8, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
    doc.text(safeTitle, margin + 3, cursorY + 5.2);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    cursorY += 10;

    if (safeSubtitle) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
      const lines = doc.splitTextToSize(safeSubtitle, contentWidth);
      ensureSpace(lines.length * 4 + 1);
      doc.text(lines, margin, cursorY);
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      cursorY += lines.length * 4 + 2;
    }
  };

  const addInfoGrid = (items: Array<{ label: string; value: string }>, columns = 2) => {
    const gap = 4;
    const boxWidth = (contentWidth - gap * (columns - 1)) / columns;

    for (let index = 0; index < items.length; index += columns) {
      const rowItems = items.slice(index, index + columns);
      const rowHeights = rowItems.map((item) => {
        const labelLines = doc.splitTextToSize(localizePdfText(item.label), boxWidth - 6);
        const valueLines = doc.splitTextToSize(localizePdfText(item.value), boxWidth - 6);
        return 8 + labelLines.length * 3.2 + valueLines.length * 4.2;
      });
      const rowHeight = Math.max(...rowHeights, 18);

      ensureSpace(rowHeight + rowGap);

      rowItems.forEach((item, rowIndex) => {
        const x = margin + rowIndex * (boxWidth + gap);
        const y = cursorY;
        const labelLines = doc.splitTextToSize(localizePdfText(item.label), boxWidth - 6);
        const valueLines = doc.splitTextToSize(localizePdfText(item.value), boxWidth - 6);

        doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
        doc.setFillColor(PRIMARY_SOFT_ALT[0], PRIMARY_SOFT_ALT[1], PRIMARY_SOFT_ALT[2]);
        doc.roundedRect(x, y, boxWidth, rowHeight, 2, 2, "FD");

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
        doc.text(labelLines, x + 3, y + 5);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
        doc.text(valueLines, x + 3, y + 9 + labelLines.length * 3.2);
      });

      cursorY += rowHeight + rowGap;
    }
  };

  const addParagraph = (text: string, color: [number, number, number] = TEXT) => {
    if (!text) return;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(color[0], color[1], color[2]);
    const lines = doc.splitTextToSize(localizePdfText(text), contentWidth);
    ensureSpace(lines.length * 4 + 2);
    doc.text(lines, margin, cursorY);
    doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
    cursorY += lines.length * 4 + 2;
  };

  const addTable = (
    title: string,
    columns: PdfColumn[],
    rows: string[][],
    subtitle?: string
  ) => {
    addSectionTitle(title, subtitle);
    const widths = columns.map((column) => column.width * contentWidth);

    const drawHeaderRow = () => {
      ensureSpace(10);
      let x = margin;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setFillColor(PRIMARY_SOFT[0], PRIMARY_SOFT[1], PRIMARY_SOFT[2]);
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);

      columns.forEach((column, index) => {
        doc.rect(x, cursorY, widths[index], 8, "FD");
        doc.setTextColor(PRIMARY[0], PRIMARY[1], PRIMARY[2]);
        const lines = doc.splitTextToSize(localizePdfText(column.header), widths[index] - 4);
        if (column.align === "right") {
          lines.forEach((line, lineIndex) => {
            doc.text(line, x + widths[index] - 2, cursorY + 4.5 + lineIndex * 3.3, {
              align: "right",
            });
          });
        } else {
          doc.text(lines, x + 2, cursorY + 4.5);
        }
        x += widths[index];
      });

      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      cursorY += 8;
    };

    drawHeaderRow();

    rows.forEach((row) => {
      const cellLines = row.map((cell, index) =>
        doc.splitTextToSize(localizePdfText(cell), widths[index] - 4)
      );
      const rowHeight = Math.max(
        8,
        ...cellLines.map((lines) => lines.length * 3.8 + 3)
      );

      if (cursorY + rowHeight > bottomLimit) {
        addPage();
        drawHeaderRow();
      }

      let x = margin;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.4);
      doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);

      cellLines.forEach((lines, index) => {
        doc.rect(x, cursorY, widths[index], rowHeight);
        if (columns[index].align === "right") {
          lines.forEach((line, lineIndex) => {
            doc.text(line, x + widths[index] - 2, cursorY + 4.5 + lineIndex * 3.8, {
              align: "right",
            });
          });
        } else {
          doc.text(lines, x + 2, cursorY + 4.5);
        }
        x += widths[index];
      });

      cursorY += rowHeight;
    });

    cursorY += 4;
  };

  drawPageHeader();

  doc.setDocumentProperties({
    title: copy.docTitle,
    subject: `${copy.docSubject} ${input.controle_laboratorio || input.codigo_analise}`,
    author: "Soil Care",
    creator: "Soil Care",
    keywords: copy.docKeywords,
  });

  addSectionTitle(copy.sectionIdentification);
  addInfoGrid(
    [
      { label: copy.labelClient, value: clienteNome || "-" },
      { label: copy.labelArea, value: areaNome || "-" },
      {
        label: copy.labelAnalysisCode,
        value: input.codigo_analise || input.controle_laboratorio || "-",
      },
      {
        label: copy.labelTargetProduction,
        value: formatValue(input.productividad_objetivo_bolsas_ha, 0, "bolsas/ha"),
      },
    ],
    2
  );

  addParagraph(
    `${copy.labelAnalysisDate}: ${formatDate(analise.created_at)}   |   ${copy.labelPdfDate}: ${generatedAt.toLocaleString(
      dateLocale
    )}`,
    MUTED
  );

  addSectionTitle(
    copy.sectionFinalRecommendation,
    copy.sectionFinalRecommendationSubtitle
  );
  addInfoGrid(
    [
      {
        label: copy.labelStatus,
        value: resultado.recomendacao_final.manutencao_apenas
          ? copy.statusMaintenance
          : copy.statusCorrection,
      },
      {
        label: "K2O",
        value: formatValue(
          resultado.recomendacao_final.necessidade_fertilizante.k2o_kg_ha,
          1,
          "kg/ha"
        ),
      },
      {
        label: "P2O5",
        value: formatValue(
          resultado.recomendacao_final.necessidade_fertilizante.p2o5_kg_ha,
          1,
          "kg/ha"
        ),
      },
      {
        label: "S",
        value: formatValue(
          resultado.recomendacao_final.necessidade_fertilizante.so4_kg_ha,
          1,
          "kg/ha"
        ),
      },
      {
        label: copy.labelFormula,
        value: resultado.recomendacao_final.formula_sugerida?.nome ?? copy.labelSeparated,
      },
      {
        label: copy.labelDose,
        value: resultado.recomendacao_final.formula_sugerida
          ? formatValue(
              resultado.recomendacao_final.formula_sugerida.dose_kg_ha,
              0,
              "kg/ha"
            )
          : "-",
      },
    ],
    3
  );

  if (resultado.alertas.length > 0) {
    addSectionTitle(copy.sectionAlerts);
    resultado.alertas.forEach((alerta) => {
      ensureSpace(16);
      const color = alerta.tipo === "warning" ? WARNING : PRIMARY;
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setFillColor(
        alerta.tipo === "warning" ? 255 : PRIMARY_SOFT_ALT[0],
        alerta.tipo === "warning" ? 247 : PRIMARY_SOFT_ALT[1],
        alerta.tipo === "warning" ? 237 : PRIMARY_SOFT_ALT[2]
      );
      doc.roundedRect(margin, cursorY, contentWidth, 14, 2, 2, "FD");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(localizePdfText(alerta.titulo), margin + 3, cursorY + 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const lines = doc.splitTextToSize(localizePdfText(alerta.mensagem), contentWidth - 6);
      doc.text(lines, margin + 3, cursorY + 9);
      doc.setTextColor(TEXT[0], TEXT[1], TEXT[2]);
      cursorY += Math.max(16, 8 + lines.length * 4);
    });
    cursorY += 2;
  }

  addTable(
    copy.sectionBalance,
    [
      { header: copy.headerNutrient, width: 0.16 },
      { header: copy.headerCurrent, width: 0.13, align: "right" },
      { header: copy.headerIdeal, width: 0.13, align: "right" },
      { header: copy.headerNeed, width: 0.16, align: "right" },
      { header: copy.labelStatus, width: 0.14 },
      { header: copy.headerTechnicalNote, width: 0.28 },
    ],
    resultado.equilibrio_nutricional.map((card) => [
      `${card.titulo} (${card.simbolo})`,
      `${formatNumber(card.atual, 1)} ${card.unidade_atual}`,
      `${formatNumber(card.ideal, 1)} ${card.unidade_ideal}`,
      `${formatNumber(card.necessidade, 1)} ${card.unidade_necessidade}`,
      card.status,
      card.nota,
    ]),
    copy.sectionBalanceSubtitle
  );

  addSectionTitle(copy.sectionLiming);
  addInfoGrid(
    [
      [
        { label: copy.labelTotalLimestone, value: formatValue(resultado.calagem_resumo.total_calcario_kg_ha, 2, "kg/ha") },
        {
          label: copy.labelType,
          value:
            resultado.calagem_resumo.tipo === "calcitico"
              ? copy.limestoneTypeCalcitic
              : copy.limestoneTypeDolomitic,
        },
        {
          label: copy.labelRelationCaMg,
          value: formatValue(resultado.calagem_resumo.relacao_ca_mg, 1),
        },
        {
          label: copy.labelLimestoneForCa,
          value: formatValue(resultado.calcio.calcario_kg_ha, 2, "kg"),
        },
        {
          label: copy.labelLimestoneForMg,
          value: formatValue(resultado.magnesio.recomendacao_produto_kg_ha, 2, "kg"),
        },
        {
          label: copy.labelPartCaCtc,
          value: formatValue(resultado.calagem_resumo.participacao_ca_ctc_percent, 2, "%"),
        },
        {
          label: copy.labelPartMgCtc,
          value: formatValue(resultado.magnesio.participacao_pos_correcao, 2, "%"),
        },
      ],
    ]
      .flat(),
    3
  );

  addTable(
    `${copy.sectionExtraction} (${formatNumber(input.productividad_objetivo_bolsas_ha, 0)} bolsas/ha)`,
    [
      { header: copy.headerNutrient, width: 0.18 },
      { header: copy.headerSoilReserve, width: 0.16, align: "right" },
      { header: copy.headerNeedPerBag, width: 0.18, align: "right" },
      { header: copy.headerTotalNeed, width: 0.16, align: "right" },
      { header: copy.headerResult, width: 0.14, align: "right" },
      { header: copy.headerProduct, width: 0.18, align: "right" },
    ],
    resultado.extracao_producao.linhas.map((row) => [
      row.nutriente,
      formatValue(row.reserva_solo_kg, 1, "kg"),
      formatValue(row.necessidade_por_bolsa_kg, 2, "kg"),
      formatValue(row.total_necessario_kg, 1, "kg"),
      formatSignedValue(row.saldo_kg_ha, 1, "kg/ha"),
      row.produto_kg_ha > 0 ? formatValue(row.produto_kg_ha, 1, "kg/ha") : "-",
    ]),
    copy.sectionExtractionSubtitle
  );

  if (input.observaciones) {
    addSectionTitle(copy.sectionObservations);
    addParagraph(input.observaciones);
  }

  addSectionTitle(copy.sectionClosing);
  addParagraph(copy.closingNote, MUTED);

  const totalPages = doc.getNumberOfPages();
  for (let pageIndex = 1; pageIndex <= totalPages; pageIndex += 1) {
    doc.setPage(pageIndex);
    doc.setDrawColor(BORDER[0], BORDER[1], BORDER[2]);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2]);
    doc.text(copy.footerTitle, margin, pageHeight - 7);
    doc.text(`${copy.pageLabel} ${pageIndex} de ${totalPages}`, pageWidth - margin, pageHeight - 7, {
      align: "right",
    });
  }

  const safeClient = sanitizeFileName(clienteNome || "cliente");
  const safeArea = sanitizeFileName(areaNome || "area");
  const safeCode = sanitizeFileName(input.controle_laboratorio || input.codigo_analise || "analise");
  doc.save(`${copy.filePrefix}_${safeClient}_${safeArea}_${safeCode}.pdf`);
}

import ExcelJS from 'exceljs';
import type { BusinessSettings } from '@kort/shared';
import { getBusinessSettings } from '../business-settings/business-settings.service.js';

const dateTimeFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

// Colores fijos de marca del reporte (independientes del tema configurable
// del negocio, que esta pensado para la landing publica): un reporte formal
// necesita contraste estable en pantalla e impreso, sin depender de que el
// usuario haya elegido colores legibles para su sitio web.
export const REPORT_COLORS = {
  headerFill: '1E3A5F',
  headerText: 'FFFFFF',
  zebraFill: 'F2F5F8',
  border: 'C7D2DB',
  textMuted: '667085',
  ok: '158A4B',
  bajo: 'B45309',
  critico: 'C0261F',
};

// El logo se guarda como URL (disco local o Supabase Storage, ver
// storageService.ts); pdfkit/exceljs necesitan el buffer de la imagen para
// embeberla, asi que hay que descargarla. Si falla (URL caida, timeout, red),
// el reporte se genera igual sin logo en vez de romper la exportacion.
async function fetchLogoBuffer(url: string | undefined | null): Promise<Buffer | null> {
  if (!url) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return null;
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

export interface ReportBranding {
  settings: BusinessSettings;
  logoBuffer: Buffer | null;
}

export async function loadReportBranding(): Promise<ReportBranding> {
  const settings = await getBusinessSettings();
  const logoBuffer = await fetchLogoBuffer(settings.logoUrl);
  return { settings, logoBuffer };
}

function contactLine(settings: BusinessSettings): string {
  const parts = [
    settings.contact.address,
    settings.contact.phone,
    settings.contact.email,
    settings.contact.taxId ? `CUIT ${settings.contact.taxId}` : undefined,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join('  ·  ');
}

// Dibuja el encabezado de marca (logo, nombre, contacto) y el titulo del
// reporte en la pagina actual del doc. Devuelve el Y donde puede empezar el
// contenido, para que cada builder de PDF sepa desde donde dibujar su tabla.
export function drawPdfHeader(
  doc: PDFKit.PDFDocument,
  branding: ReportBranding,
  title: string,
  subtitle?: string
): number {
  const { settings, logoBuffer } = branding;
  const left = doc.page.margins.left;
  const top = doc.page.margins.top;
  const right = doc.page.width - doc.page.margins.right;
  const logoSize = 46;
  const textLeft = logoBuffer ? left + logoSize + 12 : left;

  if (logoBuffer) {
    try {
      doc.image(logoBuffer, left, top, { fit: [logoSize, logoSize] });
    } catch {
      // Imagen corrupta o formato no soportado por pdfkit: se ignora y el
      // reporte sigue sin logo en vez de tirar la generacion entera.
    }
  }

  doc
    .fillColor('#111111')
    .font('Helvetica-Bold')
    .fontSize(15)
    .text(settings.name, textLeft, top, { width: right - textLeft });

  let y = doc.y;
  if (settings.tagline) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(`#${REPORT_COLORS.textMuted}`)
      .text(settings.tagline, textLeft, y, { width: right - textLeft });
    y = doc.y;
  }

  const contact = contactLine(settings);
  if (contact) {
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(`#${REPORT_COLORS.textMuted}`)
      .text(contact, textLeft, y, { width: right - textLeft });
    y = doc.y;
  }

  const headerBottom = Math.max(y, top + logoSize) + 10;
  doc
    .moveTo(left, headerBottom)
    .lineTo(right, headerBottom)
    .lineWidth(1)
    .strokeColor(`#${REPORT_COLORS.border}`)
    .stroke();

  let cursorY = headerBottom + 14;
  doc.fillColor('#111111').font('Helvetica-Bold').fontSize(14).text(title, left, cursorY);
  cursorY = doc.y;

  if (subtitle) {
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor(`#${REPORT_COLORS.textMuted}`)
      .text(subtitle, left, cursorY + 2);
    cursorY = doc.y;
  }

  doc
    .font('Helvetica')
    .fontSize(8)
    .fillColor(`#${REPORT_COLORS.textMuted}`)
    .text(`Generado el ${dateTimeFormatter.format(new Date())}`, left, cursorY + 2);

  doc.fillColor('#111111').font('Helvetica').fontSize(10);
  return doc.y + 12;
}

// pdfkit no numera paginas solo: hay que generar el doc con bufferPages y,
// al final, recorrer todas las paginas ya bufferizadas para estampar
// "Pagina X de N" (recien ahi se sabe el total).
export function stampPageNumbers(doc: PDFKit.PDFDocument): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const bottom = doc.page.height - doc.page.margins.bottom + 16;
    // Escribir dentro del margen inferior dispara la paginacion automatica
    // de pdfkit (interpreta que el contenido no entra y agrega una pagina
    // en blanco) - se anula el margen momentaneamente para evitarlo.
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(`#${REPORT_COLORS.textMuted}`)
      .text(`Pagina ${i + 1} de ${range.count}`, doc.page.margins.left, bottom, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center',
      });
    doc.page.margins.bottom = originalBottomMargin;
  }
}

export interface PdfTableColumn {
  header: string;
  width: number;
  align?: 'left' | 'right' | 'center';
}

// pdfkit no trae tabla nativa: esto dibuja el header con fondo solido y
// texto blanco, filas cebra para lectura facil, y agrega paginas nuevas
// (repitiendo el header de columnas) cuando el contenido no entra.
export function drawPdfTable(
  doc: PDFKit.PDFDocument,
  columns: PdfTableColumn[],
  rows: string[][],
  startY: number,
  options?: {
    rowColor?: (rowIndex: number) => string | undefined;
    cellTextColor?: (rowIndex: number, cellIndex: number, value: string) => string | undefined;
  }
): void {
  const left = doc.page.margins.left;
  const rowHeight = 20;
  const headerHeight = 22;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;

  function drawHeaderRow(y: number): number {
    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    doc.rect(left, y, tableWidth, headerHeight).fill(`#${REPORT_COLORS.headerFill}`);
    let x = left;
    doc.font('Helvetica-Bold').fontSize(9).fillColor(`#${REPORT_COLORS.headerText}`);
    for (const col of columns) {
      doc.text(col.header, x + 6, y + 6, { width: col.width - 12, align: col.align ?? 'left' });
      x += col.width;
    }
    return y + headerHeight;
  }

  let y = drawHeaderRow(startY);

  doc.font('Helvetica').fontSize(9);
  rows.forEach((row, index) => {
    if (y + rowHeight > bottomLimit) {
      doc.addPage();
      y = drawHeaderRow(doc.page.margins.top);
      doc.font('Helvetica').fontSize(9);
    }

    const tableWidth = columns.reduce((sum, col) => sum + col.width, 0);
    const fill = options?.rowColor?.(index) ?? (index % 2 === 1 ? `#${REPORT_COLORS.zebraFill}` : undefined);
    if (fill) {
      doc.rect(left, y, tableWidth, rowHeight).fill(fill);
    }

    let x = left;
    row.forEach((cell, cellIndex) => {
      const col = columns[cellIndex];
      doc.fillColor(options?.cellTextColor?.(index, cellIndex, cell) ?? '#111111');
      doc.text(cell, x + 6, y + 5, { width: col.width - 12, align: col.align ?? 'left' });
      x += col.width;
    });
    y += rowHeight;
  });

  doc
    .rect(left, startY, columns.reduce((sum, col) => sum + col.width, 0), y - startY)
    .lineWidth(0.5)
    .strokeColor(`#${REPORT_COLORS.border}`)
    .stroke();

  doc.y = y + 12;
}

// Inserta 3 filas de branding arriba de la tabla (nombre del negocio,
// contacto/CUIT, titulo del reporte + fecha) y deja el header de columnas
// en headerRowNumber para que el caller le aplique estilo de tabla encima.
export function applyExcelBranding(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  branding: ReportBranding,
  title: string,
  columnCount: number
): { headerRowNumber: number } {
  const { settings, logoBuffer } = branding;
  const lastCol = String.fromCharCode('A'.charCodeAt(0) + columnCount - 1);

  sheet.spliceRows(1, 0, [], [], [], []);

  sheet.mergeCells(`A1:${lastCol}1`);
  const nameCell = sheet.getCell('A1');
  nameCell.value = settings.name;
  nameCell.font = { bold: true, size: 14 };
  sheet.getRow(1).height = 22;

  const contact = contactLine(settings);
  sheet.mergeCells(`A2:${lastCol}2`);
  const contactCell = sheet.getCell('A2');
  contactCell.value = [settings.tagline, contact].filter(Boolean).join('  ·  ');
  contactCell.font = { size: 9, color: { argb: `FF${REPORT_COLORS.textMuted}` } };

  sheet.mergeCells(`A3:${lastCol}3`);
  const titleCell = sheet.getCell('A3');
  titleCell.value = `${title}  —  Generado el ${dateTimeFormatter.format(new Date())}`;
  titleCell.font = { bold: true, size: 11 };
  sheet.getRow(3).height = 18;

  if (logoBuffer) {
    try {
      const extension = detectImageExtension(logoBuffer);
      if (extension) {
        // exceljs resuelve su tipo Buffer contra un @types/node anidado
        // distinto al de la app (mismo conflicto de tipos, no de runtime,
        // que documenta sendXlsx en reports.controller.ts).
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const imageId = workbook.addImage({ buffer: logoBuffer as any, extension });
        sheet.addImage(imageId, {
          tl: { col: 0, row: 0 },
          ext: { width: 60, height: 60 },
        });
        sheet.getRow(1).height = 45;
      }
    } catch {
      // Igual que en el PDF: un logo que no se puede decodificar no debe
      // romper la exportacion del reporte.
    }
  }

  return { headerRowNumber: 5 };
}

function detectImageExtension(buffer: Buffer): 'png' | 'jpeg' | 'gif' | null {
  if (buffer.length < 4) return null;
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return 'png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'jpeg';
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return 'gif';
  return null;
}

// Aplica el look formal (fondo solido + texto blanco en negrita, bordes,
// cebra, autofiltro y freeze) a la fila que ya tiene los titulos de columna.
export function styleExcelTable(sheet: ExcelJS.Worksheet, headerRowNumber: number, columnCount: number): void {
  const headerRow = sheet.getRow(headerRowNumber);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: `FF${REPORT_COLORS.headerText}` } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${REPORT_COLORS.headerFill}` } };
    cell.alignment = { vertical: 'middle' };
    cell.border = borderStyle();
  });
  headerRow.height = 20;

  const lastCol = String.fromCharCode('A'.charCodeAt(0) + columnCount - 1);
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: headerRowNumber, column: columnCount },
  };
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const isZebra = (rowNumber - headerRowNumber) % 2 === 0;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      if (colNumber > columnCount) return;
      cell.border = borderStyle();
      if (isZebra) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${REPORT_COLORS.zebraFill}` } };
      }
    });
  }

  void lastCol;
}

function borderStyle(): Partial<ExcelJS.Borders> {
  const style: ExcelJS.BorderStyle = 'thin';
  const color = { argb: `FF${REPORT_COLORS.border}` };
  return {
    top: { style, color },
    left: { style, color },
    bottom: { style, color },
    right: { style, color },
  };
}

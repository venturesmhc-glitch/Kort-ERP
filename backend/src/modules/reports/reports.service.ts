import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma.js';
import type { DateRangeQuery, StockReportQuery, VentasCortesQuery } from './reports.schema.js';
import {
  applyExcelBranding,
  drawPdfHeader,
  drawPdfTable,
  loadReportBranding,
  REPORT_COLORS,
  stampPageNumbers,
  styleExcelTable,
  type PdfTableColumn,
} from './report-branding.js';

const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0,
});

function parseLocalDate(iso: string, endOfDay = false) {
  return new Date(`${iso}T${endOfDay ? '23:59:59.999' : '00:00:00'}`);
}

function renderPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    stampPageNumbers(doc);
    doc.end();
  });
}

function nivelColor(nivel: 'ok' | 'bajo' | 'critico'): string {
  return `#${REPORT_COLORS[nivel]}`;
}

const STOCK_INCLUDE = {
  tipoProducto: { select: { id: true, name: true } },
} satisfies Prisma.ArticleInclude;

function nivelStock(article: {
  stock: number;
  stockMinimo: number | null;
  stockCritico: number | null;
}): 'ok' | 'bajo' | 'critico' {
  if (article.stockCritico !== null && article.stock <= article.stockCritico) return 'critico';
  if (article.stockMinimo !== null && article.stock <= article.stockMinimo) return 'bajo';
  return 'ok';
}

export async function getStockReport(query: StockReportQuery) {
  const articles = await prisma.article.findMany({
    where: { active: true, tipoProductoId: query.tipoProductoId },
    include: STOCK_INCLUDE,
    orderBy: { name: 'asc' },
  });
  const withNivel = articles.map((article) => ({ ...article, nivelStock: nivelStock(article) }));
  return query.estado ? withNivel.filter((article) => article.nivelStock === query.estado) : withNivel;
}

export async function buildStockExcel(query: StockReportQuery) {
  const [articles, branding] = await Promise.all([getStockReport(query), loadReportBranding()]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');
  const columns: { header: string; key: string; width: number }[] = [
    { header: 'Articulo', key: 'name', width: 30 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Stock actual', key: 'stock', width: 14 },
    { header: 'Stock minimo', key: 'stockMinimo', width: 14 },
    { header: 'Stock critico', key: 'stockCritico', width: 14 },
    { header: 'Estado', key: 'nivelStock', width: 12 },
    { header: 'Precio', key: 'price', width: 14 },
  ];
  sheet.columns = columns;

  for (const article of articles) {
    sheet.addRow({
      name: article.name,
      categoria: article.tipoProducto.name,
      stock: article.stock,
      stockMinimo: article.stockMinimo ?? '-',
      stockCritico: article.stockCritico ?? '-',
      nivelStock: article.nivelStock.toUpperCase(),
      price: article.price,
    });
  }

  const priceColumn = sheet.getColumn('price');
  priceColumn.numFmt = '"$"#,##0';

  const { headerRowNumber } = applyExcelBranding(workbook, sheet, branding, 'Listado de stock', columns.length);
  styleExcelTable(sheet, headerRowNumber, columns.length);

  const estadoColIndex = columns.findIndex((col) => col.key === 'nivelStock') + 1;
  for (let rowNumber = headerRowNumber + 1; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const cell = sheet.getRow(rowNumber).getCell(estadoColIndex);
    const nivel = String(cell.value).toLowerCase() as 'ok' | 'bajo' | 'critico';
    cell.font = { bold: true, color: { argb: `FF${REPORT_COLORS[nivel] ?? '111111'}` } };
  }

  return workbook.xlsx.writeBuffer();
}

const STOCK_PDF_COLUMNS: PdfTableColumn[] = [
  { header: 'Articulo', width: 140 },
  { header: 'Categoria', width: 90 },
  { header: 'Stock', width: 50, align: 'right' },
  { header: 'Minimo', width: 50, align: 'right' },
  { header: 'Critico', width: 50, align: 'right' },
  { header: 'Estado', width: 60 },
  { header: 'Precio', width: 75, align: 'right' },
];

export async function buildStockPdf(query: StockReportQuery) {
  const [articles, branding] = await Promise.all([getStockReport(query), loadReportBranding()]);

  return renderPdf((doc) => {
    const startY = drawPdfHeader(doc, branding, 'Listado de stock');

    if (articles.length === 0) {
      doc
        .fontSize(10)
        .fillColor('#111111')
        .text('No hay articulos que coincidan con el filtro.', doc.page.margins.left, startY);
      return;
    }

    const rows = articles.map((article) => [
      article.name,
      article.tipoProducto.name,
      String(article.stock),
      article.stockMinimo?.toString() ?? '-',
      article.stockCritico?.toString() ?? '-',
      article.nivelStock.toUpperCase(),
      currencyFormatter.format(article.price),
    ]);

    drawPdfTable(doc, STOCK_PDF_COLUMNS, rows, startY, {
      cellTextColor: (rowIndex, cellIndex) =>
        cellIndex === 5 ? nivelColor(articles[rowIndex].nivelStock) : undefined,
    });
  });
}

// Columnas pensadas para uso contable: la app no modela metodo de pago ni
// IVA en ningun lado hoy, asi que el export se limita a lo que TreasuryEntry
// realmente tiene mas el saldo acumulado calculado.
export async function buildContableExcel(query: DateRangeQuery) {
  const [entries, branding] = await Promise.all([
    prisma.treasuryEntry.findMany({
      where: {
        entryDate: {
          gte: query.dateFrom ? parseLocalDate(query.dateFrom) : undefined,
          lte: query.dateTo ? parseLocalDate(query.dateTo, true) : undefined,
        },
      },
      include: { category: { select: { name: true } } },
      orderBy: { entryDate: 'asc' },
    }),
    loadReportBranding(),
  ]);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Movimientos');
  const columns: { header: string; key: string; width: number }[] = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Categoria', key: 'categoria', width: 22 },
    { header: 'Concepto', key: 'concepto', width: 32 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Saldo acumulado', key: 'saldo', width: 16 },
  ];
  sheet.columns = columns;

  let saldo = 0;
  for (const entry of entries) {
    saldo += entry.type === 'INCOME' ? entry.amount : -entry.amount;
    sheet.addRow({
      fecha: entry.entryDate.toISOString().slice(0, 10),
      tipo: entry.type === 'INCOME' ? 'Ingreso' : 'Egreso',
      categoria: entry.category.name,
      concepto: entry.description ?? '-',
      monto: entry.amount,
      saldo,
    });
  }

  sheet.getColumn('monto').numFmt = '"$"#,##0';
  sheet.getColumn('saldo').numFmt = '"$"#,##0';

  const { headerRowNumber } = applyExcelBranding(workbook, sheet, branding, 'Reporte contable', columns.length);
  styleExcelTable(sheet, headerRowNumber, columns.length);

  return workbook.xlsx.writeBuffer();
}

const VENTAS_CORTES_PDF_COLUMNS: PdfTableColumn[] = [
  { header: 'Barbero', width: 245 },
  { header: 'Cortes', width: 90, align: 'right' },
  { header: 'Monto', width: 180, align: 'right' },
];

export async function buildVentasCortesPdf(query: VentasCortesQuery) {
  const from = query.dateFrom ? parseLocalDate(query.dateFrom) : undefined;
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : undefined;

  const [sales, cuts, branding] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to }, sellerId: query.barberoId },
    }),
    prisma.cut.findMany({
      where: { cutAt: { gte: from, lte: to }, barberoId: query.barberoId },
      include: { barbero: { select: { firstName: true, lastName: true } } },
    }),
    loadReportBranding(),
  ]);

  const totalVentas = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
  const totalCortes = cuts.reduce((sum, cut) => sum + cut.price, 0);

  const porBarbero = new Map<string, { cortes: number; montoCortes: number }>();
  for (const cut of cuts) {
    const nombre = `${cut.barbero.firstName} ${cut.barbero.lastName}`;
    const bucket = porBarbero.get(nombre) ?? { cortes: 0, montoCortes: 0 };
    bucket.cortes += 1;
    bucket.montoCortes += cut.price;
    porBarbero.set(nombre, bucket);
  }

  return renderPdf((doc) => {
    const periodo = `Periodo: ${query.dateFrom ?? 'inicio'} a ${query.dateTo ?? 'hoy'}`;
    let y = drawPdfHeader(doc, branding, 'Ventas y cortes', periodo);

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111111')
      .text(
        `Total ventas: ${currencyFormatter.format(totalVentas)} (${sales.length})   ·   ` +
          `Total cortes: ${currencyFormatter.format(totalCortes)} (${cuts.length})`,
        doc.page.margins.left,
        y
      );
    y = doc.y + 14;

    doc.font('Helvetica-Bold').fontSize(11).text('Por barbero', doc.page.margins.left, y);
    y = doc.y + 6;

    if (porBarbero.size === 0) {
      doc
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#111111')
        .text('No hay cortes registrados en el periodo.', doc.page.margins.left, y);
      return;
    }

    const rows = [...porBarbero.entries()].map(([nombre, data]) => [
      nombre,
      String(data.cortes),
      currencyFormatter.format(data.montoCortes),
    ]);
    drawPdfTable(doc, VENTAS_CORTES_PDF_COLUMNS, rows, y);
  });
}

import { Prisma } from '@prisma/client';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { prisma } from '../../lib/prisma.js';
import type { DateRangeQuery, StockReportQuery, VentasCortesQuery } from './reports.schema.js';

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
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk as Buffer));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    draw(doc);
    doc.end();
  });
}

const STOCK_INCLUDE = {
  tipoProducto: { select: { id: true, name: true } },
} satisfies Prisma.ArticleInclude;

function nivelStock(article: { stock: number; stockMinimo: number | null; stockCritico: number | null }) {
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
  const articles = await getStockReport(query);

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Stock');
  sheet.columns = [
    { header: 'Articulo', key: 'name', width: 30 },
    { header: 'Categoria', key: 'categoria', width: 20 },
    { header: 'Stock actual', key: 'stock', width: 14 },
    { header: 'Stock minimo', key: 'stockMinimo', width: 14 },
    { header: 'Stock critico', key: 'stockCritico', width: 14 },
    { header: 'Estado', key: 'nivelStock', width: 12 },
    { header: 'Precio', key: 'price', width: 14 },
  ];
  sheet.getRow(1).font = { bold: true };

  for (const article of articles) {
    sheet.addRow({
      name: article.name,
      categoria: article.tipoProducto.name,
      stock: article.stock,
      stockMinimo: article.stockMinimo ?? '-',
      stockCritico: article.stockCritico ?? '-',
      nivelStock: article.nivelStock,
      price: article.price,
    });
  }

  return workbook.xlsx.writeBuffer();
}

export async function buildStockPdf(query: StockReportQuery) {
  const articles = await getStockReport(query);

  return renderPdf((doc) => {
    doc.fontSize(16).text('Listado de stock', { align: 'center' });
    doc.moveDown();
    doc.fontSize(10);
    if (articles.length === 0) {
      doc.text('No hay articulos que coincidan con el filtro.');
      return;
    }
    for (const article of articles) {
      doc.text(
        `${article.name} (${article.tipoProducto.name}) — stock: ${article.stock} ` +
          `(min ${article.stockMinimo ?? '-'}, critico ${article.stockCritico ?? '-'}) — ` +
          `${article.nivelStock.toUpperCase()}`
      );
    }
  });
}

// Columnas pensadas para uso contable: la app no modela metodo de pago ni
// IVA en ningun lado hoy, asi que el export se limita a lo que TreasuryEntry
// realmente tiene mas el saldo acumulado calculado.
export async function buildContableExcel(query: DateRangeQuery) {
  const entries = await prisma.treasuryEntry.findMany({
    where: {
      entryDate: {
        gte: query.dateFrom ? parseLocalDate(query.dateFrom) : undefined,
        lte: query.dateTo ? parseLocalDate(query.dateTo, true) : undefined,
      },
    },
    include: { category: { select: { name: true } } },
    orderBy: { entryDate: 'asc' },
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Movimientos');
  sheet.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Categoria', key: 'categoria', width: 22 },
    { header: 'Concepto', key: 'concepto', width: 32 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Saldo acumulado', key: 'saldo', width: 16 },
  ];
  sheet.getRow(1).font = { bold: true };

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

  return workbook.xlsx.writeBuffer();
}

export async function buildVentasCortesPdf(query: VentasCortesQuery) {
  const from = query.dateFrom ? parseLocalDate(query.dateFrom) : undefined;
  const to = query.dateTo ? parseLocalDate(query.dateTo, true) : undefined;

  const [sales, cuts] = await Promise.all([
    prisma.sale.findMany({
      where: { createdAt: { gte: from, lte: to }, sellerId: query.barberoId },
    }),
    prisma.cut.findMany({
      where: { cutAt: { gte: from, lte: to }, barberoId: query.barberoId },
      include: { barbero: { select: { firstName: true, lastName: true } } },
    }),
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
    doc.fontSize(16).text('Ventas y cortes', { align: 'center' });
    doc.moveDown();
    doc.fontSize(11).text(`Periodo: ${query.dateFrom ?? 'inicio'} a ${query.dateTo ?? 'hoy'}`);
    doc.moveDown();
    doc.text(`Total ventas: ${currencyFormatter.format(totalVentas)} (${sales.length} ventas)`);
    doc.text(`Total cortes: ${currencyFormatter.format(totalCortes)} (${cuts.length} cortes)`);
    doc.moveDown();
    doc.fontSize(13).text('Por barbero');
    doc.fontSize(10);
    if (porBarbero.size === 0) {
      doc.text('No hay cortes registrados en el periodo.');
    }
    for (const [nombre, data] of porBarbero) {
      doc.text(`${nombre}: ${data.cortes} cortes — ${currencyFormatter.format(data.montoCortes)}`);
    }
  });
}

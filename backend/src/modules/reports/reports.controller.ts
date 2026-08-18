import type { Request, Response } from 'express';
import {
  dateRangeQuerySchema,
  stockReportQuerySchema,
  ventasCortesQuerySchema,
} from './reports.schema.js';
import * as reportsService from './reports.service.js';

// El tipo Buffer que devuelve ExcelJS.Workbook.xlsx.writeBuffer() resuelve,
// via su dependencia interna @fast-csv, contra un @types/node anidado
// distinto al de la app (conflicto de versiones de tipos, no de runtime) -
// de ahi el ArrayBufferLike laxo en vez de Buffer/Uint8Array estricto.
function sendXlsx(res: Response, filename: string, buffer: ArrayBufferLike) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(Buffer.from(buffer as ArrayBuffer));
}

function sendPdf(res: Response, filename: string, buffer: Buffer) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}

export async function getStockReportHandler(req: Request, res: Response) {
  const query = stockReportQuerySchema.parse(req.query);
  res.json(await reportsService.getStockReport(query));
}

export async function exportStockReportHandler(req: Request, res: Response) {
  const query = stockReportQuerySchema.parse(req.query);
  if (query.format === 'pdf') {
    sendPdf(res, 'listado-stock.pdf', await reportsService.buildStockPdf(query));
    return;
  }
  sendXlsx(res, 'listado-stock.xlsx', await reportsService.buildStockExcel(query));
}

export async function exportContableReportHandler(req: Request, res: Response) {
  const query = dateRangeQuerySchema.parse(req.query);
  sendXlsx(res, 'reporte-contable.xlsx', await reportsService.buildContableExcel(query));
}

export async function exportVentasCortesReportHandler(req: Request, res: Response) {
  const query = ventasCortesQuerySchema.parse(req.query);
  sendPdf(res, 'ventas-y-cortes.pdf', await reportsService.buildVentasCortesPdf(query));
}

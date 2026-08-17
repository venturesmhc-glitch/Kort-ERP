import type { Request, Response } from 'express';
import { workedHoursQuerySchema } from './workshifts.schema.js';
import { getWorkedHoursReport } from './workshifts.service.js';

export async function getWorkedHoursHandler(req: Request, res: Response) {
  const query = workedHoursQuerySchema.parse(req.query);
  const report = await getWorkedHoursReport(query);
  res.json(report);
}

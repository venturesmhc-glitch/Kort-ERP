import type { Request, Response } from 'express';
import { commissionsQuerySchema } from './commissions.schema.js';
import { getCommissionsReport } from './commissions.service.js';

export async function getCommissionsHandler(req: Request, res: Response) {
  const query = commissionsQuerySchema.parse(req.query);
  const report = await getCommissionsReport(query);
  res.json(report);
}

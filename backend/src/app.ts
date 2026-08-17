import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { catalogsRouter, publicCatalogsRouter } from './modules/catalogs/catalogs.routes.js';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/catalogs', catalogsRouter);
app.use('/api/public/catalogs', publicCatalogsRouter);

// Modulos futuros (dashboard, users, appointments, cuts, inventory, sales,
// treasury, workshifts, stats, settings, merch) se montan aca a medida que se implementen.

app.use(errorHandler);

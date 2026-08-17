import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { clientsRouter } from './modules/clients/clients.routes.js';
import { catalogsRouter, publicCatalogsRouter } from './modules/catalogs/catalogs.routes.js';
import { usersRouter, publicUsersRouter } from './modules/users/users.routes.js';
import {
  appointmentsRouter,
  publicAppointmentsRouter,
} from './modules/appointments/appointments.routes.js';
import { cutsRouter } from './modules/cuts/cuts.routes.js';
import { articlesRouter, publicArticlesRouter } from './modules/articles/articles.routes.js';
import { salesRouter } from './modules/sales/sales.routes.js';
import { treasuryRouter } from './modules/treasury/treasury.routes.js';
import { workshiftsRouter } from './modules/workshifts/workshifts.routes.js';
import { statsRouter } from './modules/stats/stats.routes.js';
import { merchRouter, publicMerchRouter } from './modules/merch/merch.routes.js';

export const app = express();

app.use(cors({ origin: env.corsOrigin }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRouter);
app.use('/api/clients', clientsRouter);
app.use('/api/catalogs', catalogsRouter);
app.use('/api/public/catalogs', publicCatalogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/public', publicUsersRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/public/appointments', publicAppointmentsRouter);
app.use('/api/cuts', cutsRouter);
app.use('/api/articles', articlesRouter);
app.use('/api/public/articles', publicArticlesRouter);
app.use('/api/sales', salesRouter);
app.use('/api/treasury', treasuryRouter);
app.use('/api/workshifts', workshiftsRouter);
app.use('/api/stats', statsRouter);
app.use('/api/merch', merchRouter);
app.use('/api/public/merch', publicMerchRouter);

// Modulos futuros (dashboard, settings) se montan aca a medida que se
// implementen.

app.use(errorHandler);

import { app } from './app.js';
import { env } from './config/env.js';
import { startReminderScheduler } from './modules/notifications/scheduler.service.js';

app.listen(env.port, () => {
  console.log(`Kort backend escuchando en http://localhost:${env.port}`);
});

startReminderScheduler();

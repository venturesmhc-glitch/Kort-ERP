import { app } from './app.js';
import { env } from './config/env.js';
import { startReminderScheduler } from './modules/notifications/scheduler.service.js';
import { startClientMessageScheduler } from './modules/notifications/clientMessages.service.js';

app.listen(env.port, () => {
  console.log(`Kort backend escuchando en http://localhost:${env.port}`);
});

startReminderScheduler();
startClientMessageScheduler();

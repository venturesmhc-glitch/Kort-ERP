import { app } from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`Kort backend escuchando en http://localhost:${env.port}`);
});

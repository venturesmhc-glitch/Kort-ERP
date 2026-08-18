import type { Request, Response } from 'express';
import { UnauthorizedError } from '../../utils/errors.js';
import { listNotifications } from './notifications.service.js';

export async function listNotificationsHandler(req: Request, res: Response) {
  if (!req.user) {
    throw new UnauthorizedError();
  }
  const notifications = await listNotifications(req.user);
  res.json(notifications);
}

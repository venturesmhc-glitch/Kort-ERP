import type { Request, Response } from 'express';
import { createClientSchema, listClientsQuerySchema, updateClientSchema } from './clients.schema.js';
import * as clientsService from './clients.service.js';

export async function listClientsHandler(req: Request, res: Response) {
  const query = listClientsQuerySchema.parse(req.query);
  const clients = await clientsService.listClients(query);
  res.json(clients);
}

export async function getClientHandler(req: Request, res: Response) {
  const client = await clientsService.getClient(req.params.id);
  res.json(client);
}

export async function createClientHandler(req: Request, res: Response) {
  const input = createClientSchema.parse(req.body);
  const client = await clientsService.createClient(input);
  res.status(201).json(client);
}

export async function updateClientHandler(req: Request, res: Response) {
  const input = updateClientSchema.parse(req.body);
  const client = await clientsService.updateClient(req.params.id, input);
  res.json(client);
}

export async function deleteClientHandler(req: Request, res: Response) {
  await clientsService.deleteClient(req.params.id);
  res.status(204).send();
}

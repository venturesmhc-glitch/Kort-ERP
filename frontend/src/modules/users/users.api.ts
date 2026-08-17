import { createMockCollection } from '../../lib/mockStore';
import type { AppUser, UserInput } from './users.types';

const seed: AppUser[] = [
  {
    id: 'seed-dev',
    firstName: 'Dev',
    lastName: 'Kort',
    email: 'dev@kort.local',
    role: 'DEV',
    active: true,
  },
  {
    id: 'seed-encargado',
    firstName: 'Martina',
    lastName: 'Godoy',
    email: 'martina@kort.local',
    role: 'ENCARGADO',
    phone: '11-5555-0101',
    active: true,
  },
  {
    id: 'seed-barbero-1',
    firstName: 'Lucas',
    lastName: 'Ferreyra',
    email: 'lucas@kort.local',
    role: 'BARBERO',
    phone: '11-5555-0102',
    active: true,
  },
  {
    id: 'seed-barbero-2',
    firstName: 'Nahuel',
    lastName: 'Ibarra',
    email: 'nahuel@kort.local',
    role: 'BARBERO',
    phone: '11-5555-0103',
    active: true,
  },
];

const collection = createMockCollection<AppUser>('users', seed);

export const listUsersRequest = () => collection.list();
export const createUserRequest = (input: UserInput) => collection.create(input);
export const updateUserRequest = (id: string, input: UserInput) => collection.update(id, input);
export const deleteUserRequest = (id: string) => collection.remove(id);

export async function listBarberosRequest(): Promise<AppUser[]> {
  const users = await collection.list();
  return users.filter((user) => user.role === 'BARBERO' && user.active);
}

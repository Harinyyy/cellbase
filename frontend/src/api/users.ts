import { apiRequest } from './client';
import type { User, UserRole } from '../types';

export function listUsers(): Promise<{ users: User[] }> {
  return apiRequest('/users');
}

export function createUser(input: {
  full_name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ user: User }> {
  return apiRequest('/users', { method: 'POST', body: input });
}

export function deleteUser(id: number): Promise<void> {
  return apiRequest(`/users/${id}`, { method: 'DELETE' });
}

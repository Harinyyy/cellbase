import { apiRequest } from './client';
import type { User } from '../types';

export function login(email: string, password: string): Promise<{ user: User; token: string }> {
  return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
}

export function register(
  full_name: string,
  email: string,
  password: string,
): Promise<{ user: User }> {
  return apiRequest('/auth/register', { method: 'POST', body: { full_name, email, password } });
}

export function fetchMe(): Promise<{ user: User }> {
  return apiRequest('/auth/me');
}

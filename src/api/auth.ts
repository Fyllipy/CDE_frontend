import { api } from './client';
import type { ApiUser } from '../types/api';

type AuthResponse = {
  token: string;
  user: ApiUser;
};

type LoginPayload = {
  email: string;
  password: string;
};

type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/login', payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>('/auth/register', payload);
  return response.data;
}

export async function fetchCurrentUser(): Promise<ApiUser> {
  const response = await api.get<{ user: ApiUser }>('/auth/me');
  return response.data.user;
}

import { request } from '@/utils/request';

export interface LoginPayload {
  username: string;
  password: string;
}

export const authApi = {
  login: (payload: LoginPayload) => request.post('/auth/login', payload),
  me: () => request.get('/auth/me')
};

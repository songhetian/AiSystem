import axios, { AxiosResponse, AxiosRequestConfig } from 'axios';

// 扩展 Axios 模块以支持拦截器解包后的类型
declare module 'axios' {
  interface AxiosInstance {
    (config: AxiosRequestConfig): Promise<any>;
    <T = any>(config: AxiosRequestConfig): Promise<T>;
    get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    head<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    options<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
    post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
    patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T>;
  }
}

export const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

request.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 为写操作自动注入幂等 Key，防止重复提交
  const method = config.method?.toUpperCase();
  if (method && ['POST', 'PATCH', 'DELETE'].includes(method) && !config.headers['x-idempotency-key']) {
    const scope = config.url?.replace(/\//g, '-').replace(/^-/, '') || 'global';
    config.headers['x-idempotency-key'] = `${scope}-${Date.now()}`;
  }

  return config;
});

request.interceptors.response.use(
  (response: AxiosResponse) => {
    return response.data;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function createIdempotencyKey(scope: string) {
  return `${scope}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

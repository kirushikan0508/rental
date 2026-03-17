/**
 * @file frontend/src/services/api.ts
 * @description Axios instance configured with base URL, interceptors
 * for JWT injection, token refresh, and error handling.
 */

import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

/** Pre-configured Axios instance for all API requests */
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — attach JWT ───────────────────────
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor — handle 401 / refresh ────────────
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    // TODO: Implement token refresh on 401
    return Promise.reject(error);
  },
);

export default api;

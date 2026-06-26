import axios from 'axios';

function getEnv(key: string, fallback: string): string {
  if (typeof window !== 'undefined') {
    const runtimeEnv = (window as any).__ENV__;
    if (runtimeEnv?.[key] !== undefined && runtimeEnv?.[key] !== '') {
      return runtimeEnv[key];
    }
  }
  return process.env[key] || fallback;
}

const apiBase = getEnv('NEXT_PUBLIC_API_URL', '');
const baseURL = typeof window !== 'undefined'
  ? (apiBase ? `${apiBase}/api/v1` : '/api/v1')
  : '/api/v1';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const selectedWabaId = localStorage.getItem('bizlinbox:waba');
      if (selectedWabaId) {
        config.headers = config.headers || {};
        config.headers['x-waba-account-id'] = selectedWabaId;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

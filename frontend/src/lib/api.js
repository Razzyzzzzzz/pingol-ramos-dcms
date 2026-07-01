import axios from 'axios';

// Base URL comes from Vite env; falls back to a local XAMPP path.
const baseURL =
  import.meta.env.VITE_API_URL ||
  'http://localhost/pingol-ramos-dcms/backend/api';

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
});

const TOKEN_KEY = 'prdcms_token';

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// A single place to react to auth failures. When the token is rejected we
// clear it and bounce to /login (unless we're already on an auth screen).
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error?.response?.status;
    if (status === 401) {
      tokenStore.clear();
      if (onUnauthorized) onUnauthorized();
    }
    return Promise.reject(error);
  }
);

// Normalise the API's { success, message, data } envelope into a thrown error
// on failure, or the raw payload on success.
export const unwrap = (promise) =>
  promise.then((res) => {
    const body = res.data;
    if (body && body.success === false) {
      const err = new Error(body.message || 'Request failed');
      err.payload = body;
      throw err;
    }
    return body;
  });

export const getMessage = (error, fallback = 'Something went wrong') =>
  error?.response?.data?.message || error?.message || fallback;

export default api;

import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // The API returns `message` as an array so it can carry several validation
    // problems at once. Components render it directly, and React concatenates a
    // string array with no separator, so it is joined into readable prose here
    // rather than at every call site. The original list stays on `messages`.
    const data = error.response?.data;
    if (data && Array.isArray(data.message)) {
      data.messages = data.message;
      data.message = data.message.join(' ');
    }

    // Rate limited. Surface something a user can act on rather than a bare 429.
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers?.['retry-after'];
      error.message = retryAfter
        ? 'Too many requests. Try again in ' + retryAfter + ' seconds.'
        : 'Too many requests. Please slow down and try again shortly.';
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refresh_token: refreshToken,
        });

        const { access_token } = response.data;
        localStorage.setItem('access_token', access_token);

        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_URL = 'https://server.kvartirabar.uz/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обработка ошибок и обновление токена
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          await SecureStore.setItemAsync('accessToken', response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        await SecureStore.deleteItemAsync('accessToken');
        await SecureStore.deleteItemAsync('refreshToken');
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (phone, password) => api.post('/users/login/', { phone, password }),
  register: (data) => api.post('/users/register/', data),
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.patch('/users/profile/', data),
};

// Properties API
export const propertiesAPI = {
  getAll: (params) => api.get('/properties/', { params }),
  getOne: (id) => api.get(`/properties/${id}/`),
  create: (data) => api.post('/properties/', data),
  update: (id, data) => api.patch(`/properties/${id}/`, data),
  delete: (id) => api.delete(`/properties/${id}/`),
  getMy: () => api.get('/properties/my/'),
  getFavorites: () => api.get('/properties/favorites/'),
  addToFavorites: (id) => api.post(`/properties/${id}/favorite/`),
  removeFromFavorites: (id) => api.delete(`/properties/${id}/unfavorite/`),
  aiSearch: (query) => api.post('/properties/ai-search/', { query }),
};

// Auctions API
export const auctionsAPI = {
  getAll: (params) => api.get('/auctions/', { params }),
  getOne: (id) => api.get(`/auctions/${id}/`),
  placeBid: (id, amount) => api.post(`/auctions/${id}/bid/`, { amount }),
};

export default api;

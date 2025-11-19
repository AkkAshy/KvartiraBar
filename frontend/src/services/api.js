import axios from 'axios';

// По умолчанию используем относительный путь к /api — nginx будет проксировать его к бэкенду
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к каждому запросу (если есть)
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

// Обработка ошибок авторизации
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если токен истек, пробуем обновить
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (!refreshToken) {
          return Promise.reject(error);
        }

        const response = await axios.post(`${API_URL}/auth/login/refresh/`, {
          refresh: refreshToken,
        });

        const { access } = response.data;
        localStorage.setItem('access_token', access);

        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (data) => api.post('/auth/login/', data),
  logout: (refreshToken) => api.post('/auth/logout/', { refresh_token: refreshToken }),
  getProfile: () => api.get('/auth/me/'),
};

// Properties API
export const propertiesAPI = {
  getAll: (params) => api.get('/properties/', { params }),
  getById: (id) => api.get(`/properties/${id}/`),
  create: (data) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return api.post('/properties/', data, config);
  },
  update: (id, data) => {
    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };
    return api.put(`/properties/${id}/`, data, config);
  },
  delete: (id) => api.delete(`/properties/${id}/`),
  deleteImage: (propertyId, imageId) => api.delete(`/properties/${propertyId}/images/${imageId}/`),
  getMy: () => api.get('/properties/my/'),
  contactOwner: (id, message) => api.post(`/properties/${id}/contact/`, { message }),
  getContactRequests: () => api.get('/properties/contact-requests/'),
  updateContactStatus: (id, status) => api.patch(`/properties/contact-requests/${id}/status/`, { status }),
  getFavorites: () => api.get('/properties/favorites/'),
  addToFavorites: (propertyId) => api.post('/properties/favorites/', { property: propertyId }),
  removeFromFavorites: (propertyId) => api.delete(`/properties/${propertyId}/favorite/`),
  geocode: (address) => api.post('/properties/geocode/', { address }),
  suggestAddresses: (query) => api.get('/properties/suggest/', { params: { query } }),
  reverseGeocode: (lat, lon) => api.post('/properties/reverse-geocode/', { lat, lon }),
  aiSearch: (query) => api.post('/properties/ai-search/', { query }),
  nearbySearch: (lat, lng, radius, type) => api.get('/properties/nearby/', { params: { lat, lng, radius, type } }),
};

// Auctions API
export const auctionsAPI = {
  getAll: (params) => api.get('/auctions/', { params }),
  getById: (id) => api.get(`/auctions/${id}/`),
  create: (data) => api.post('/auctions/', data),
  update: (id, data) => api.put(`/auctions/${id}/`, data),
  delete: (id) => api.delete(`/auctions/${id}/`),
  placeBid: (id, amount) => api.post(`/auctions/${id}/bid/`, { amount }),
  initiatePayment: (id) => api.post(`/auctions/${id}/initiate-payment/`),
};

// Mortgages API
export const mortgagesAPI = {
  getAll: () => api.get('/mortgages/'),
  getById: (id) => api.get(`/mortgages/${id}/`),
  create: (data) => api.post('/mortgages/', data),
  update: (id, data) => api.put(`/mortgages/${id}/`, data),
};

// Contracts API
export const contractsAPI = {
  getAll: () => api.get('/contracts/'),
  getById: (id) => api.get(`/contracts/${id}/`),
  create: (data) => api.post('/contracts/', data),
  sign: (id) => api.post(`/contracts/${id}/sign/`),
};

// Advertisements API
export const adsAPI = {
  getAll: (params) => api.get('/ads/', { params }),
  getById: (id) => api.get(`/ads/${id}/`),
  create: (data) => api.post('/ads/', data),
  activate: (id) => api.post(`/ads/${id}/activate/`),
  getStats: () => api.get('/ads/stats/'),
};

export default api;
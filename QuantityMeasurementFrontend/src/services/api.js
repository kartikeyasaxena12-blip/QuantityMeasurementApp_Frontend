import axios from 'axios';
import { getToken, logout } from './auth';

const API_BASE_URL = 'http://localhost:5000/api/v1/quantities';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Request interceptor: attach JWT token to every request
apiClient.interceptors.request.use(
  (config) => {
    const token = getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: on 401, logout and reload to show login screen
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

function formatPayload(type, unit1, val1, unit2, val2 = 0) {
  return {
    thisQuantityDto: {
      value: val1,
      unit: unit1.toUpperCase(),
      measurementType: type,
    },
    thatQuantityDto: {
      value: val2,
      unit: unit2.toUpperCase(),
      measurementType: type,
    },
  };
}

export const compareQuantities = async (type, unit1, val1, unit2, val2) => {
  const payload = formatPayload(type, unit1, val1, unit2, val2);
  const response = await apiClient.post('/compare', payload);
  return response.data;
};

export const convertQuantity = async (type, unit1, val1, unit2) => {
  const payload = formatPayload(type, unit1, val1, unit2, 0);
  const response = await apiClient.post('/convert', payload);
  return response.data;
};

export const operateQuantities = async (op, type, unit1, val1, unit2, val2) => {
  const payload = formatPayload(type, unit1, val1, unit2, val2);
  const response = await apiClient.post(`/${op}`, payload);
  return response.data;
};

export const getHistoryByOperation = async (operation) => {
  const response = await apiClient.get(`/history/operation/${operation}`);
  return response.data;
};

export const getHistoryByMeasurementType = async (type) => {
  const response = await apiClient.get(`/history/type/${type}`);
  return response.data;
};

export const getErrorHistory = async () => {
  const response = await apiClient.get('/history/errored');
  return response.data;
};

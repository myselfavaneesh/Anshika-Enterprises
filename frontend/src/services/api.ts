import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: 'https://anshika-enterprises.onrender.com/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isInvalidToken = error.response?.status === 400 && error.response?.data?.error === 'Invalid token.';
    const isUnauthorized = error.response?.status === 401;
    
    if (isInvalidToken || isUnauthorized) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Global Error Catcher
    const errorMessage = error.response?.data?.error || error.message || 'An unexpected error occurred';
    toast.error(`API Error: ${errorMessage}`);

    return Promise.reject(error);
  }
);

export default api;

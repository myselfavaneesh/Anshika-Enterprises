import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Replace with your actual backend URL or read from environment variables
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://anshika-enterprises.onrender.com/api';

/**
 * Centralized API client configured with the base URL and standard headers.
 */
export const apiClient = axios.create({
  baseURL: API_BASE_URL,  
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // You can attach auth tokens here
    // const token = await getAuthToken();
    // if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Global error handling (e.g., triggering a sign-out on 401)
    if (error.response?.status === 401) {
      console.error('Unauthorized! Please log in again.');
      // Handle logout/redirect logic here
    }
    return Promise.reject(error);
  }
);

/**
 * Generic utility for API calls with strict try/catch blocks
 */
export async function fetchFromApi<T>(
  request: Promise<AxiosResponse<T>>
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await request;
    return { data: response.data, error: null };
  } catch (error) {
    let errorMessage = 'An unexpected error occurred';
    if (axios.isAxiosError(error)) {
      errorMessage = error.response?.data?.message || error.message;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    return { data: null, error: errorMessage };
  }
}

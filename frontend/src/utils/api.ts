import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const tokensStr = localStorage.getItem('auth_tokens')
    if (tokensStr) {
      try {
        const tokens = JSON.parse(tokensStr)
        config.headers.Authorization = `Bearer ${tokens.access}`
      } catch {
        // Invalid tokens in storage
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      const tokensStr = localStorage.getItem('auth_tokens')
      if (tokensStr) {
        try {
          const tokens = JSON.parse(tokensStr)
          const response = await axios.post(`${API_URL}/auth/token/refresh/`, {
            refresh: tokens.refresh,
          })

          const newTokens = {
            access: response.data.access,
            refresh: response.data.refresh || tokens.refresh,
          }

          useAuthStore.getState().setTokens(newTokens)
          originalRequest.headers.Authorization = `Bearer ${newTokens.access}`
          return api(originalRequest)
        } catch {
          // Refresh failed, logout
          useAuthStore.getState().logout()
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api

// Auth API functions
export const authApi = {
  login: (username: string, password: string) =>
    api.post('/auth/login/', { username, password }),

  register: (data: {
    username: string
    email: string
    password: string
    password_confirm: string
    first_name?: string
    last_name?: string
    role?: string
    phone?: string
    department?: string
  }) => api.post('/auth/register/', data),

  getMe: () => api.get('/auth/me/'),

  updateProfile: (data: {
    email?: string
    first_name?: string
    last_name?: string
    phone?: string
    department?: string
  }) => api.patch('/auth/profile/', data),

  changePassword: (data: {
    current_password: string
    new_password: string
    new_password_confirm: string
  }) => api.post('/auth/change-password/', data),

  listUsers: () => api.get('/auth/users/'),

  updateUserRole: (userId: number, role: string) =>
    api.patch(`/auth/users/${userId}/role/`, { role }),
}

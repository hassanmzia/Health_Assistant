import { create } from 'zustand'
import { AuthUser, AuthTokens } from '../types'

interface AuthState {
  user: AuthUser | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean

  setAuth: (user: AuthUser, tokens: AuthTokens) => void
  setUser: (user: AuthUser) => void
  setTokens: (tokens: AuthTokens) => void
  setLoading: (loading: boolean) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, tokens) => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user, tokens, isAuthenticated: true, isLoading: false })
  },

  setUser: (user) => {
    localStorage.setItem('auth_user', JSON.stringify(user))
    set({ user })
  },

  setTokens: (tokens) => {
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    set({ tokens })
  },

  setLoading: (loading) => set({ isLoading: loading }),

  logout: () => {
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
    set({ user: null, tokens: null, isAuthenticated: false, isLoading: false })
  },

  loadFromStorage: () => {
    try {
      const tokensStr = localStorage.getItem('auth_tokens')
      const userStr = localStorage.getItem('auth_user')
      if (tokensStr && userStr) {
        const tokens = JSON.parse(tokensStr)
        const user = JSON.parse(userStr)
        set({ user, tokens, isAuthenticated: true, isLoading: false })
      } else {
        set({ isLoading: false })
      }
    } catch {
      localStorage.removeItem('auth_tokens')
      localStorage.removeItem('auth_user')
      set({ isLoading: false })
    }
  },
}))

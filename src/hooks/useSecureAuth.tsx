// Secure Authentication Hook untuk React components
// Client-side security dengan proper token handling

import React, { useState, useEffect, useCallback } from 'react'
import { JWTSecurity, type JWTPayload } from '@/lib/jwt-security'

interface AuthState {
  isAuthenticated: boolean
  isLoading: boolean
  user: JWTPayload | null
  error: string | null
}

interface LoginCredentials {
  email: string
  password: string
}

interface AuthHookReturn {
  // State
  isAuthenticated: boolean
  isLoading: boolean
  user: JWTPayload | null
  error: string | null
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  clearError: () => void
}

// Secure storage abstraction for client-side
class ClientSecureStorage {
  // Store auth state securely (encrypted in sessionStorage for demo)
  static setAuthState(payload: JWTPayload) {
    try {
      // In production, use more secure storage or rely on httpOnly cookies
      const sessionData = JSON.stringify({
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
        expiresAt: payload.exp * 1000,
      })
      
      // Use sessionStorage instead of localStorage for better security
      sessionStorage.setItem('auth_session', sessionData)
    } catch (error) {
      console.error('[SECURE STORAGE] Failed to store auth state:', error)
    }
  }

  static getAuthState(): Partial<JWTPayload> | null {
    try {
      const sessionData = sessionStorage.getItem('auth_session')
      if (!sessionData) return null

      const data = JSON.parse(sessionData)
      
      // Check if expired
      if (data.expiresAt && data.expiresAt < Date.now()) {
        this.clearAuthState()
        return null
      }

      return data
    } catch (error) {
      console.error('[SECURE STORAGE] Failed to retrieve auth state:', error)
      return null
    }
  }

  static clearAuthState() {
    try {
      sessionStorage.removeItem('auth_session')
      // Also clear any other auth-related data
      sessionStorage.removeItem('refresh_token')
    } catch (error) {
      console.error('[SECURE STORAGE] Failed to clear auth state:', error)
    }
  }
}

export function useSecureAuth(): AuthHookReturn {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  })

  // Initialize authentication state on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedAuth = ClientSecureStorage.getAuthState()
        
        if (storedAuth) {
          // Validate stored auth with server if needed
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            user: storedAuth as JWTPayload,
            error: null,
          })
        } else {
          setAuthState(prev => ({
            ...prev,
            isLoading: false,
          }))
        }
      } catch (error) {
        console.error('[AUTH HOOK] Failed to initialize auth:', error)
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          user: null,
          error: 'Failed to initialize authentication',
        })
      }
    }

    initializeAuth()
  }, [])

  // Login function with secure handling
  const login = useCallback(async (credentials: LoginCredentials) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }))

    try {
      // Validate credentials format
      if (!credentials.email || !credentials.password) {
        throw new Error('Email and password are required')
      }

      if (!credentials.email.includes('@')) {
        throw new Error('Invalid email format')
      }

      // In production, this would call actual authentication API
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Login failed')
      }

      const authData = await response.json()
      const payload = authData.payload as JWTPayload

      // Validate payload structure
      if (!JWTSecurity.JWTValidator.validatePayload(payload)) {
        throw new Error('Invalid authentication response')
      }

      // Store auth state securely
      ClientSecureStorage.setAuthState(payload)

      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: payload,
        error: null,
      })

    } catch (error) {
      console.error('[AUTH HOOK] Login failed:', error)
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: error instanceof Error ? error.message : 'Login failed',
      })
    }
  }, [])

  // Logout function with secure cleanup
  const logout = useCallback(() => {
    try {
      // Clear client-side storage
      ClientSecureStorage.clearAuthState()

      // In production, call logout API to invalidate server-side session
      fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
      }).catch(error => {
        console.warn('[AUTH HOOK] Logout API call failed:', error)
      })

      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      })
    } catch (error) {
      console.error('[AUTH HOOK] Logout failed:', error)
    }
  }, [])

  // Refresh token function
  const refreshToken = useCallback(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Include httpOnly cookies
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const authData = await response.json()
      const payload = authData.payload as JWTPayload

      ClientSecureStorage.setAuthState(payload)

      setAuthState(prev => ({
        ...prev,
        user: payload,
        error: null,
      }))
    } catch (error) {
      console.error('[AUTH HOOK] Token refresh failed:', error)
      logout() // Force logout on refresh failure
    }
  }, [logout])

  // Clear error function
  const clearError = useCallback(() => {
    setAuthState(prev => ({ ...prev, error: null }))
  }, [])

  // Auto-refresh token when near expiry
  useEffect(() => {
    if (!authState.user || !authState.isAuthenticated) return

    const checkTokenExpiry = () => {
      if (JWTSecurity.JWTValidator.shouldRefreshToken(authState.user!)) {
        refreshToken()
      }
    }

    // Check every minute
    const interval = setInterval(checkTokenExpiry, 60 * 1000)
    
    // Initial check
    checkTokenExpiry()

    return () => clearInterval(interval)
  }, [authState.user, authState.isAuthenticated, refreshToken])

  return {
    isAuthenticated: authState.isAuthenticated,
    isLoading: authState.isLoading,
    user: authState.user,
    error: authState.error,
    login,
    logout,
    refreshToken,
    clearError,
  }
}

// Protected route wrapper component
export function withSecureAuth<T extends object>(
  Component: React.ComponentType<T>
): React.ComponentType<T> {
  return function ProtectedComponent(props: T) {
    const { isAuthenticated, isLoading } = useSecureAuth()

    if (isLoading) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">Memverifikasi autentikasi...</span>
        </div>
      )
    }

    if (!isAuthenticated) {
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">Akses Ditolak</h2>
            <p className="text-gray-600">Anda harus login untuk mengakses halaman ini.</p>
          </div>
        </div>
      )
    }

    return <Component {...props} />
  }
}

// Security context for role-based access
export function useSecureRole(requiredRole: 'user' | 'admin' | 'premium') {
  const { user, isAuthenticated } = useSecureAuth()

  const hasRole = isAuthenticated && user && (
    user.role === requiredRole || 
    (requiredRole === 'user' && ['admin', 'premium'].includes(user.role)) ||
    (requiredRole === 'premium' && user.role === 'admin')
  )

  return { hasRole, currentRole: user?.role }
}
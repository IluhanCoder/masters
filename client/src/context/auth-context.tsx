import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'

import { authService } from '../features/auth/auth-service'
import type { AuthResponse } from '../features/auth/auth-types'

const STORAGE_KEY = 'recruiting_auth'

interface AuthContextValue {
  authData: AuthResponse | null
  isInitializing: boolean
  setSession(data: AuthResponse): void
  clearSession(): void
    apiFetch(input: string, init?: RequestInit): Promise<Response>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const loadStoredAuth = (): AuthResponse | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AuthResponse) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [authData, setAuthData] = useState<AuthResponse | null>(loadStoredAuth)
  const [isInitializing, setIsInitializing] = useState<boolean>(() => loadStoredAuth() !== null)

  const authDataRef = useRef(authData)
  authDataRef.current = authData

  const setSession = useCallback((data: AuthResponse) => {
    setAuthData(data)
    authDataRef.current = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [])

  const clearSession = useCallback(() => {
    setAuthData(null)
    authDataRef.current = null
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  useEffect(() => {
    const stored = loadStoredAuth()
    if (!stored) {
      setIsInitializing(false)
      return
    }

    authService
      .me(stored.tokens.accessToken)
      .then(() => {

      })
      .catch(async () => {
        try {
          const refreshed = await authService.refresh(stored.tokens.refreshToken)
          setSession(refreshed)
        } catch {
          clearSession()
        }
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [])

    const apiFetch = useCallback(async (input: string, init: RequestInit = {}): Promise<Response> => {
    const current = authDataRef.current

    const doFetch = (token: string) =>
      fetch(input, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
          Authorization: `Bearer ${token}`,
        },
      })

    if (!current) return doFetch('')

    const response = await doFetch(current.tokens.accessToken)

    if (response.status !== 401) return response

    try {
      const refreshed = await authService.refresh(current.tokens.refreshToken)
      setSession(refreshed)
      return doFetch(refreshed.tokens.accessToken)
    } catch {
      clearSession()
      return response
    }
  }, [setSession, clearSession])

  return (
    <AuthContext.Provider value={{ authData, isInitializing, setSession, clearSession, apiFetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

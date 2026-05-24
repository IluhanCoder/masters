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
  const refreshInFlightRef = useRef<Promise<AuthResponse> | null>(null)
  authDataRef.current = authData

  const parseAccessTokenExpiry = (accessToken: string): number | null => {
    try {
      const payloadPart = accessToken.split('.')[1]
      if (!payloadPart) return null

      const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/')
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
      const payload = JSON.parse(atob(padded)) as { exp?: number }

      return typeof payload.exp === 'number' ? payload.exp : null
    } catch {
      return null
    }
  }

  const setSession = useCallback((data: AuthResponse) => {
    setAuthData(data)
    authDataRef.current = data
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [])

  const clearSession = useCallback(() => {
    setAuthData(null)
    authDataRef.current = null
    refreshInFlightRef.current = null
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const refreshSession = useCallback(async (refreshToken: string): Promise<AuthResponse> => {
    const inFlight = refreshInFlightRef.current
    if (inFlight) {
      return inFlight
    }

    const request = authService
      .refresh(refreshToken)
      .then((nextSession) => {
        setSession(nextSession)
        return nextSession
      })
      .finally(() => {
        refreshInFlightRef.current = null
      })

    refreshInFlightRef.current = request
    return request
  }, [setSession])

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
          await refreshSession(stored.tokens.refreshToken)
        } catch {
          clearSession()
        }
      })
      .finally(() => {
        setIsInitializing(false)
      })
  }, [clearSession, refreshSession])

  useEffect(() => {
    if (!authData) {
      return
    }

    const expiresAt = parseAccessTokenExpiry(authData.tokens.accessToken)
    if (!expiresAt) {
      return
    }

    const refreshAt = expiresAt * 1000 - 60_000
    const delay = Math.max(refreshAt - Date.now(), 0)

    const timeoutId = window.setTimeout(() => {
      void refreshSession(authData.tokens.refreshToken).catch(() => {
        clearSession()
      })
    }, delay)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [authData, clearSession, refreshSession])

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
      const refreshed = await refreshSession(current.tokens.refreshToken)
      return doFetch(refreshed.tokens.accessToken)
    } catch {
      clearSession()
      return response
    }
  }, [clearSession, refreshSession])

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

import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { authService } from './auth-service'
import type { RegisterPayload } from './auth-types'
import { RegisterForm } from './register-form'

export const RegisterPage = () => {
  const { setSession } = useAuth()
  const navigate = useNavigate()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (payload: RegisterPayload) => {
    setError(null)
    setIsLoading(true)
    try {
      const result = await authService.register(payload)
      setSession(result)
      void navigate('/masters')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Помилка реєстрації')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,_rgba(14,165,233,0.22),_transparent_40%),linear-gradient(145deg,_#f8fafc_0%,_#e2e8f0_100%)] px-6 py-10">
      <section className="w-full max-w-md space-y-5">
        <div className="rounded-3xl border border-white/70 bg-white/70 p-6 shadow-lg backdrop-blur">
          <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Marketplace of Masters</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-950">Реєстрація</h1>
          {error ? (
            <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <RegisterForm onSubmit={handleSubmit} isLoading={isLoading} />
          <p className="mt-5 text-center text-sm text-slate-600">
            Вже є акаунт?{' '}
            <Link to="/login" className="font-semibold text-sky-600 hover:underline">
              Увійти
            </Link>
          </p>
        </div>
      </section>
    </main>
  )
}

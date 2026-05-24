import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { AppNav } from '../../shared/app-nav'
import { bookingService } from './booking-service'
import { candidateService } from '../candidate/candidate-service'
import type { CandidateSummary } from '../candidate/candidate-types'
import { positionService } from '../position/position-service'
import type { PositionSummary } from '../position/position-types'

const formatAvailabilityTerm = (candidate: CandidateSummary) => {
  const from = new Date(candidate.availableFrom).toLocaleDateString('uk-UA')
  if (candidate.isOpenEndedAvailability) {
    return `Доступний з ${from}, без кінцевої дати`
  }
  if (!candidate.availableTo) {
    return `Доступний з ${from}`
  }
  const to = new Date(candidate.availableTo).toLocaleDateString('uk-UA')
  return `Доступний: ${from} - ${to}`
}

export const BookingPage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const { candidateId } = useParams<{ candidateId: string }>()
  const { role } = authData!.user
  const accessToken = authData!.tokens.accessToken

  const [candidate, setCandidate] = useState<CandidateSummary | null>(null)
  const [positions, setPositions] = useState<PositionSummary[]>([])
  const [positionId, setPositionId] = useState('')
  const [requestedFrom, setRequestedFrom] = useState('')
  const [requestedTo, setRequestedTo] = useState('')
  const [weeklyHours, setWeeklyHours] = useState('40')
  const [comment, setComment] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadBookingData = useCallback(async () => {
    if (!candidateId) {
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const [candidateResponse, positionsResponse] = await Promise.all([
        candidateService.getById(candidateId, accessToken),
        positionService.listAll(accessToken),
      ])

      setCandidate(candidateResponse.candidate)
      setRequestedFrom(new Date(candidateResponse.candidate.availableFrom).toISOString().slice(0, 10))
      if (candidateResponse.candidate.availableTo) {
        setRequestedTo(new Date(candidateResponse.candidate.availableTo).toISOString().slice(0, 10))
      }

      const availablePositions = positionsResponse.positions.filter((position) => position.status !== 'closed')
      setPositions(availablePositions)
      setPositionId((currentPositionId) => currentPositionId || availablePositions[0]?.id || '')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження даних для бронювання')
    } finally {
      setIsLoading(false)
    }
  }, [candidateId, accessToken])

  useEffect(() => {
    void loadBookingData()
  }, [loadBookingData])

  const requestedFromMin = useMemo(
    () => (candidate ? new Date(candidate.availableFrom).toISOString().slice(0, 10) : undefined),
    [candidate],
  )

  const requestedToMax = useMemo(
    () =>
      candidate?.isOpenEndedAvailability || !candidate?.availableTo
        ? undefined
        : new Date(candidate.availableTo).toISOString().slice(0, 10),
    [candidate],
  )

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!candidate) {
      return
    }

    setError(null)
    setSuccessMessage(null)

    const from = new Date(requestedFrom)
    const to = new Date(requestedTo)
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
      setError('Вкажіть коректні дати бронювання')
      return
    }

    if (to.getTime() < from.getTime()) {
      setError('Дата завершення не може бути раніше дати початку')
      return
    }

    const candidateFrom = new Date(candidate.availableFrom)
    const candidateTo = candidate.isOpenEndedAvailability || !candidate.availableTo ? undefined : new Date(candidate.availableTo)
    const candidateEnd = candidateTo?.getTime() ?? Number.POSITIVE_INFINITY
    if (from.getTime() < candidateFrom.getTime() || to.getTime() > candidateEnd) {
      setError('Кандидат недоступний у вибрані дати')
      return
    }

    const hours = Number(weeklyHours)
    if (!Number.isFinite(hours) || hours <= 0 || hours > 168) {
      setError('Кількість годин на тиждень має бути від 1 до 168')
      return
    }

    if (!positionId) {
      setError('Оберіть посаду для бронювання')
      return
    }

    setIsSubmitting(true)
    try {
      await bookingService.create(
        {
          candidateId: candidate.id,
          positionId,
          requestedFrom,
          requestedTo,
          weeklyHours: hours,
          comment: comment.trim() || undefined,
        },
        accessToken,
      )
      setSuccessMessage('Запит на бронювання створено')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка створення бронювання')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!candidateId) {
    return <Navigate to="/masters" replace />
  }

  if (role !== 'client') {
    return <Navigate to={`/masters/${candidateId}`} replace />
  }

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-6">
        <AppNav
          title={candidate ? `Нове замовлення: ${candidate.fullName}` : 'Нове замовлення'}
          actions={
            <button
              type="button"
              onClick={() => void navigate(candidateId ? `/masters/${candidateId}` : '/masters')}
              className="rounded-xl border border-[#d9d3c5] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#5d5348] transition hover:bg-[#f7efdd]"
            >
              Назад до майстра
            </button>
          }
        />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {successMessage ? (
          <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{successMessage}</p>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Завантажуємо кандидата...</p>
          </div>
        ) : candidate ? (
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Інформація про майстра</h2>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Майстер</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{candidate.fullName}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Статус</p>
                <p className="mt-1 text-sm text-slate-900">{candidate.availability === 'available' ? 'Вільний' : 'Недоступний'}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Доступність</p>
                <p className="mt-1 text-sm text-slate-900">{formatAvailabilityTerm(candidate)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Доступні категорії для замовлення</p>
                <p className="mt-1 text-sm text-slate-900">{positions.length > 0 ? positions.length : 'Немає активних посад'}</p>
              </div>
            </section>

            <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Форма замовлення</h2>
              <p className="text-sm text-slate-500">Вкажіть період, навантаження та деталі замовлення для майстра.</p>

              <label className="block space-y-1">
                <span className="text-sm text-slate-600">Посада</span>
                <select
                  required
                  value={positionId}
                  onChange={(event) => setPositionId(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                  disabled={isSubmitting || candidate.availability !== 'available' || positions.length === 0}
                >
                  <option value="" disabled>
                    {positions.length === 0 ? 'Немає доступних категорій' : 'Оберіть категорію'}
                  </option>
                  {positions.map((position) => (
                    <option key={position.id} value={position.id}>
                      {position.title} ({position.seniority})
                    </option>
                  ))}
                </select>
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Дата початку</span>
                  <input
                    required
                    type="date"
                    value={requestedFrom}
                    min={requestedFromMin}
                    max={requestedToMax}
                    onChange={(event) => setRequestedFrom(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    disabled={isSubmitting || candidate.availability !== 'available'}
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-sm text-slate-600">Дата завершення</span>
                  <input
                    required
                    type="date"
                    value={requestedTo}
                    min={requestedFrom || requestedFromMin}
                    max={requestedToMax}
                    onChange={(event) => setRequestedTo(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                    disabled={isSubmitting || candidate.availability !== 'available'}
                  />
                </label>
              </div>

              <label className="block space-y-1">
                <span className="text-sm text-slate-600">Робочих годин на тиждень</span>
                <input
                  required
                  type="number"
                  min={1}
                  max={168}
                  value={weeklyHours}
                  onChange={(event) => setWeeklyHours(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                  disabled={isSubmitting || candidate.availability !== 'available'}
                />
              </label>

              <label className="block space-y-1">
                <span className="text-sm text-slate-600">Коментар</span>
                <textarea
                  rows={5}
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
                  placeholder="Опишіть деталі замовлення"
                  disabled={isSubmitting || candidate.availability !== 'available'}
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting || candidate.availability !== 'available' || positions.length === 0}
                className="w-full rounded-xl bg-slate-950 px-4 py-2 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-500"
              >
                {isSubmitting ? 'Створюємо замовлення...' : 'Створити замовлення'}
              </button>
            </form>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">Кандидата не знайдено.</p>
          </div>
        )}
      </section>
    </main>
  )
}

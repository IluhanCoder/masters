import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { AppNav } from '../../shared/app-nav'
import { bookingService } from './booking-service'
import type { BookingStatus, CandidateBookingDetails } from './booking-types'

const STATUS_LABEL: Record<BookingStatus, string> = {
  new: 'Новий',
  approved: 'Затверджено',
  rejected: 'Відхилено',
  cancelled: 'Скасовано',
  client_rejected: 'Відхилено клієнтом',
  completed: 'Завершено',
}

const STATUS_STYLE: Record<BookingStatus, string> = {
  new: 'border-sky-200 bg-sky-50 text-sky-700',
  approved: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  client_rejected: 'border-orange-200 bg-orange-50 text-orange-700',
  completed: 'border-slate-200 bg-slate-100 text-slate-500',
}

const SENIORITY_LABEL: Record<string, string> = {
  junior: 'Junior',
  middle: 'Middle',
  senior: 'Senior',
}

const STATUS_FILTERS: { key: BookingStatus | 'all'; label: string }[] = [
  { key: 'all', label: 'Всі' },
  { key: 'new', label: 'Нові' },
  { key: 'approved', label: 'Затверджені' },
  { key: 'completed', label: 'Завершені' },
  { key: 'rejected', label: 'Відхилені' },
  { key: 'client_rejected', label: 'Відхилено мною' },
  { key: 'cancelled', label: 'Скасовані' },
]

const hasSuggestion = (booking: CandidateBookingDetails) =>
  !!booking.originalCandidateId && booking.originalCandidateId !== booking.candidateId

export const MyBookingsPage = () => {
  const { authData } = useAuth()
  const accessToken = authData!.tokens.accessToken

  const [bookings, setBookings] = useState<CandidateBookingDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [respondingId, setRespondingId] = useState<string | null>(null)
  const [ratingBookingId, setRatingBookingId] = useState<string | null>(null)
  const [respondError, setRespondError] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const response = await bookingService.listMine(accessToken)
      setBookings(response.bookings)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження запитів')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const handleRespond = async (bookingId: string, action: 'accept' | 'reject') => {
    setRespondError(null)
    setRespondingId(bookingId)
    try {
      const result = await bookingService.respond(bookingId, { action }, accessToken)
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                status: result.booking.status,
                originalCandidateId: action === 'accept' ? undefined : b.originalCandidateId,
                originalCandidateName: action === 'accept' ? undefined : b.originalCandidateName,
              }
            : b,
        ),
      )
    } catch (requestError) {
      setRespondError(requestError instanceof Error ? requestError.message : 'Помилка відповіді')
    } finally {
      setRespondingId(null)
    }
  }

  const handleRate = async (bookingId: string, rating: number) => {
    setRespondError(null)
    setRatingBookingId(bookingId)
    try {
      const result = await bookingService.rate(bookingId, { rating }, accessToken)
      setBookings((prev) =>
        prev.map((b) =>
          b.id === bookingId
            ? {
                ...b,
                serviceRating: result.booking.serviceRating,
                serviceReview: result.booking.serviceReview,
                ratedAt: result.booking.ratedAt,
                ratedById: result.booking.ratedById,
                status: result.booking.status,
              }
            : b,
        ),
      )
    } catch (requestError) {
      setRespondError(requestError instanceof Error ? requestError.message : 'Помилка оцінювання')
    } finally {
      setRatingBookingId(null)
    }
  }

  const filtered =
    filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter)

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-4xl space-y-6">
        <AppNav title="Мої замовлення" />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {respondError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {respondError}
          </p>
        ) : null}

        {}
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === key ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              <span className="ml-1.5 text-xs opacity-70">
                ({key === 'all' ? bookings.length : bookings.filter((b) => b.status === key).length})
              </span>
            </button>
          ))}
        </div>

        {}
        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Завантажуємо замовлення...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              {filter === 'all' ? 'Замовлень ще немає.' : 'Немає замовлень з таким статусом.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <article
                key={booking.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>Послуга:</span>
                      <span className="font-medium text-slate-900">
                        {booking.positionTitle}
                        {booking.positionSeniority
                          ? ` (${SENIORITY_LABEL[booking.positionSeniority] ?? booking.positionSeniority})`
                          : ''}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>Клієнтська компанія:</span>
                      <Link
                        to={`/companies/${booking.companyId}`}
                        className="font-semibold text-sky-600 hover:underline"
                      >
                        {booking.companyName}
                      </Link>
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[booking.status]}`}
                  >
                    {STATUS_LABEL[booking.status]}
                  </span>
                </div>

                <div className="mt-4 space-y-2">
                  {hasSuggestion(booking) ? (
                    <>
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-500">
                          Зустрічна пропозиція від менеджера
                        </p>
                        <div className="flex flex-wrap items-center gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Ви запитували: </span>
                            <Link
                              to={`/masters/${booking.originalCandidateId}`}
                              className="font-semibold text-slate-700 hover:underline line-through decoration-slate-400"
                            >
                              {booking.originalCandidateName}
                            </Link>
                          </div>
                          <span className="text-slate-400">→</span>
                          <div>
                            <span className="text-slate-500">Пропонується: </span>
                            <Link
                              to={`/masters/${booking.candidateId}`}
                              className="font-semibold text-amber-700 hover:underline"
                            >
                              {booking.candidateName}
                            </Link>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            disabled={respondingId === booking.id}
                            onClick={() => void handleRespond(booking.id, 'accept')}
                            className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            {respondingId === booking.id ? 'Зберігаємо...' : 'Погодитись'}
                          </button>
                          <button
                            type="button"
                            disabled={respondingId === booking.id}
                            onClick={() => void handleRespond(booking.id, 'reject')}
                            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            Відхилити
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>Майстер:</span>
                      <Link
                        to={`/masters/${booking.candidateId}`}
                        className="font-semibold text-sky-600 hover:underline"
                      >
                        {booking.candidateName}
                      </Link>
                    </div>
                  )}
                </div>

                {}
                <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
                  <span>
                    <span className="text-slate-400">Дати: </span>
                    {new Date(booking.requestedFrom).toLocaleDateString('uk-UA')}
                    {' — '}
                    {new Date(booking.requestedTo).toLocaleDateString('uk-UA')}
                  </span>
                  <span>
                    <span className="text-slate-400">Год/тиж: </span>
                    {booking.weeklyHours}
                  </span>
                  <span className="text-slate-400">
                    Подано: {new Date(booking.createdAt).toLocaleDateString('uk-UA')}
                  </span>
                </div>

                {}
                {booking.comment ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Ваш коментар
                    </p>
                    {booking.comment}
                  </div>
                ) : null}

                {}
                {booking.managerComment ? (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-400">
                      Коментар менеджера
                    </p>
                    {booking.managerComment}
                  </div>
                ) : null}

                {(booking.status === 'completed' || booking.status === 'approved') ? (
                  <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                      Оцінка виконаної послуги
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      {[1, 2, 3, 4, 5].map((value) => {
                        const currentRating = booking.serviceRating ?? 0
                        const isActive = currentRating >= value
                        return (
                          <button
                            key={`${booking.id}-client-rating-${value}`}
                            type="button"
                            onClick={() => void handleRate(booking.id, value)}
                            disabled={ratingBookingId === booking.id}
                            className={`rounded-lg border px-2 py-1 text-xs font-semibold transition ${
                              isActive
                                ? 'border-amber-400 bg-amber-200 text-amber-900'
                                : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-100'
                            } disabled:opacity-60`}
                          >
                            {value}
                          </button>
                        )
                      })}
                      <span className="ml-1 text-sm font-semibold text-amber-900">
                        {(booking.serviceRating ?? 0).toFixed(1)} / 5
                      </span>
                    </div>
                    {booking.ratedAt ? (
                      <p className="mt-2 text-xs text-amber-800">
                        Останнє оновлення оцінки: {new Date(booking.ratedAt).toLocaleDateString('uk-UA')}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

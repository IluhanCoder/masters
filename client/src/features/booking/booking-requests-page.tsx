import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { API_BASE } from '../../shared/api-base'
import { AppNav } from '../../shared/app-nav'
import { Modal } from '../../shared/modal'
import { candidateService } from '../candidate/candidate-service'
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
  { key: 'client_rejected', label: 'Відхилено клієнтом' },
  { key: 'cancelled', label: 'Скасовані' },
]

type ActionType = 'approve' | 'reject'

export const BookingRequestsPage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const accessToken = authData!.tokens.accessToken

  const [bookings, setBookings] = useState<CandidateBookingDetails[]>([])
  const [ratingsByCandidateId, setRatingsByCandidateId] = useState<Record<string, number>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all')
  const [search, setSearch] = useState('')

  const [actionType, setActionType] = useState<ActionType | null>(null)
  const [actionBookingId, setActionBookingId] = useState<string | null>(null)
  const [managerComment, setManagerComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadBookings = useCallback(async () => {
    setError(null)
    setIsLoading(true)
    try {
      const [bookingResponse, candidateResponse] = await Promise.all([
        bookingService.list(accessToken),
        candidateService.list(accessToken),
      ])
      setBookings(bookingResponse.bookings)
      setRatingsByCandidateId(
        Object.fromEntries(candidateResponse.candidates.map((candidate) => [candidate.id, candidate.rating])),
      )
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження запитів')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadBookings()
  }, [loadBookings])

  const openActionModal = (type: ActionType, bookingId: string) => {
    setActionType(type)
    setActionBookingId(bookingId)
    setManagerComment('')
    setActionError(null)
  }

  const closeActionModal = () => {
    setActionType(null)
    setActionBookingId(null)
    setManagerComment('')
    setActionError(null)
  }

  const handleActionSubmit = async () => {
    if (!actionType || !actionBookingId) return

    setActionError(null)
    setIsSubmitting(true)
    try {
      const updated = await bookingService.update(
        actionBookingId,
        { action: actionType, managerComment: managerComment.trim() || undefined },
        accessToken,
      )
      setBookings((previous) =>
        previous.map((booking) =>
          booking.id === actionBookingId
            ? {
                ...booking,
                status: updated.booking.status,
                managerComment: updated.booking.managerComment,
              }
            : booking,
        ),
      )
      closeActionModal()
    } catch (requestError) {
      setActionError(requestError instanceof Error ? requestError.message : 'Помилка виконання дії')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSuggestAnother = (bookingId: string, candidateId: string) => {
    void navigate(`/masters?suggestFor=${bookingId}&excludeCandidate=${candidateId}`)
  }

  const [isExpiring, setIsExpiring] = useState(false)
  const handleDevExpire = async () => {
    setIsExpiring(true)
    try {
      const res = await fetch(`${API_BASE}/api/dev/expire-bookings`, { method: 'POST' })
      const data: unknown = await res.json()
      console.log('[DEV] expire-bookings →', data)
      await loadBookings()
    } catch (err) {
      console.error('[DEV] expire-bookings failed:', err)
    } finally {
      setIsExpiring(false)
    }
  }

  const byStatus =
    filter === 'all' ? bookings : bookings.filter((booking) => booking.status === filter)

  const query = search.trim().toLowerCase()
  const filtered = query
    ? byStatus.filter(
        (b) =>
          b.candidateName.toLowerCase().includes(query) ||
          b.positionTitle.toLowerCase().includes(query) ||
          b.companyName.toLowerCase().includes(query),
      )
    : byStatus

  const actionBooking = bookings.find((b) => b.id === actionBookingId)

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <AppNav title="Менеджер співпраці" />

        <div className="rounded-2xl border border-[#e6dcc8] bg-[linear-gradient(120deg,_#fff6e8_0%,_#fffdfa_100%)] px-5 py-4 text-sm text-[#6b5e4d] shadow-sm">
          Панель для поєднання клієнтських замовлень з майстрами: керуйте статусами і контролюйте рейтинг, який формується з оцінок клієнтів за завершені послуги.
        </div>

        {import.meta.env.DEV ? (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-amber-300 bg-amber-50 px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-amber-500">DEV</span>
            <span className="text-sm text-amber-700">Симулювати закінчення термінів</span>
            <button
              type="button"
              onClick={() => void handleDevExpire()}
              disabled={isExpiring}
              className="ml-auto rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
            >
              {isExpiring ? 'Запуск...' : 'Запустити'}
            </button>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        {}
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 shadow-sm">
          <svg className="h-4 w-4 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            placeholder="Пошук за майстром, послугою або клієнтом..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
          />
          {search ? (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="shrink-0 text-slate-400 hover:text-slate-600"
              aria-label="Очистити пошук"
            >
              ✕
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {STATUS_FILTERS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                filter === key
                  ? 'bg-slate-950 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {label}
              {key !== 'all' ? (
                <span className="ml-1.5 text-xs opacity-70">
                  ({bookings.filter((b) => b.status === key).length})
                </span>
              ) : (
                <span className="ml-1.5 text-xs opacity-70">({bookings.length})</span>
              )}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Завантажуємо замовлення...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
            <p className="text-slate-500">
              {query
                ? `Нічого не знайдено за запитом «${search.trim()}».`
                : filter === 'all'
                  ? 'Карток замовлень ще немає.'
                  : 'Немає замовлень з таким статусом.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((booking) => (
              <article
                key={booking.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                      <span>Майстер:</span>
                      <Link
                        to={`/masters/${booking.candidateId}`}
                        className="font-semibold text-sky-600 hover:underline"
                      >
                        {booking.candidateName}
                      </Link>
                    </div>
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
                      <span>Клієнт:</span>
                      <Link
                        to={`/companies/${booking.companyId}`}
                        className="font-semibold text-sky-600 hover:underline"
                      >
                        {booking.companyName}
                      </Link>
                    </div>
                  </div>

                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-semibold ${STATUS_STYLE[booking.status]}`}
                  >
                    {STATUS_LABEL[booking.status]}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600">
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

                {booking.comment ? (
                  <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Коментар клієнта
                    </p>
                    {booking.comment}
                  </div>
                ) : null}

                {booking.managerComment ? (
                  <div className="mt-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-sky-400">
                      Коментар менеджера
                    </p>
                    {booking.managerComment}
                  </div>
                ) : null}

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Рейтинг майстра
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg border border-amber-200 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                      Формується з оцінок клієнтів
                    </span>
                    <span className="ml-1 text-sm font-semibold text-slate-700">
                      {(ratingsByCandidateId[booking.candidateId] ?? 0).toFixed(1)} / 5
                    </span>
                  </div>
                </div>

                {booking.status === 'new' ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                    {booking.originalCandidateId ? (
                      <p className="w-full rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-700">
                        Очікується підтвердження від клієнта щодо запропонованого кандидата
                      </p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openActionModal('approve', booking.id)}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
                      >
                        Затвердити
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openActionModal('reject', booking.id)}
                      className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-500"
                    >
                      Відхилити
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSuggestAnother(booking.id, booking.candidateId)}
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                    >
                      Запропонувати іншого майстра
                    </button>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <Modal
        isOpen={actionType !== null}
        onClose={closeActionModal}
        title={
          actionType === 'approve'
            ? `Підтвердити замовлення — ${actionBooking?.candidateName ?? ''}`
            : `Відхилити замовлення — ${actionBooking?.candidateName ?? ''}`
        }
      >
        <div className="space-y-4">
          {actionError ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}

          <label className="block space-y-1">
            <span className="text-sm text-slate-600">Коментар менеджера (необов'язково)</span>
            <textarea
              rows={4}
              value={managerComment}
              onChange={(event) => setManagerComment(event.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 outline-none ring-sky-300 transition focus:ring"
              placeholder="Додайте пояснення або деталі"
              disabled={isSubmitting}
            />
          </label>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => void handleActionSubmit()}
              disabled={isSubmitting}
              className={`flex-1 rounded-xl px-4 py-2 font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-60 ${
                actionType === 'approve'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-red-600 hover:bg-red-500'
              }`}
            >
              {isSubmitting
                ? 'Збережаємо...'
                : actionType === 'approve'
                  ? 'Затвердити'
                  : 'Відхилити'}
            </button>
            <button
              type="button"
              onClick={closeActionModal}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
            >
              Скасувати
            </button>
          </div>
        </div>
      </Modal>
    </main>
  )
}

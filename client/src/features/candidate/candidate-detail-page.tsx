import { useCallback, useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { AppNav } from '../../shared/app-nav'
import { Modal } from '../../shared/modal'
import { bookingService } from '../booking/booking-service'
import type { CandidateBookingDetails } from '../booking/booking-types'
import { CandidateForm } from './candidate-form'
import { candidateService } from './candidate-service'
import type { CandidateSummary } from './candidate-types'
import { skillService } from '../skill/skill-service'

const statusLabel: Record<CandidateBookingDetails['status'], string> = {
  new: 'Новий',
  approved: 'Затверджено',
  rejected: 'Відхилено',
  cancelled: 'Скасовано',
  client_rejected: 'Клієнт відхилив',
  completed: 'Завершено',
}

const statusStyle: Record<CandidateBookingDetails['status'], string> = {
  new: 'border-slate-200 bg-slate-100 text-slate-600',
  approved: 'border-amber-200 bg-amber-50 text-amber-700',
  rejected: 'border-red-200 bg-red-50 text-red-700',
  cancelled: 'border-slate-200 bg-slate-100 text-slate-500',
  client_rejected: 'border-red-200 bg-red-50 text-red-600',
  completed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
}

const WorkHistory = ({
  bookings,
  currentCandidateId,
}: {
  bookings: CandidateBookingDetails[]
  currentCandidateId: string
}) => {
  const now = new Date()

  const current = bookings.filter(
    (b) =>
      b.status === 'approved' &&
      b.candidateId === currentCandidateId &&
      new Date(b.requestedFrom) <= now &&
      new Date(b.requestedTo) >= now,
  )

  const history = bookings.filter(
    (b) =>
      b.status === 'completed' ||
      (b.status === 'approved' && new Date(b.requestedTo) < now),
  )

  const fmt = (d: string) => new Date(d).toLocaleDateString('uk-UA')

  return (
    <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-slate-900">Зайнятість майстра</h3>

      {current.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">Зараз працює</p>
          <ul className="space-y-2">
            {current.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{b.companyName}</p>
                  <p className="text-sm text-slate-600">{b.positionTitle} · {b.positionSeniority}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{fmt(b.requestedFrom)} — {fmt(b.requestedTo)} · {b.weeklyHours} год/тиж</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[b.status]}`}>
                  {statusLabel[b.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {history.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Історія замовлень</p>
          <ul className="space-y-2">
            {history.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <p className="font-medium text-slate-900">{b.companyName}</p>
                  <p className="text-sm text-slate-600">{b.positionTitle} · {b.positionSeniority}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{fmt(b.requestedFrom)} — {fmt(b.requestedTo)} · {b.weeklyHours} год/тиж</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle[b.status]}`}>
                  {statusLabel[b.status]}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {current.length === 0 && history.length === 0 ? (
        <p className="text-sm text-slate-500">Немає записів про зайнятість.</p>
      ) : null}
    </section>
  )
}

const availabilityStyles: Record<CandidateSummary['availability'], string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  leased: 'border-amber-200 bg-amber-50 text-amber-700',
}

const availabilityText: Record<CandidateSummary['availability'], string> = {
  available: 'Доступний',
  leased: 'В оренді',
}

const formatAvailabilityTerm = (candidate: CandidateSummary) => {
  const from = new Date(candidate.availableFrom).toLocaleDateString('uk-UA')

  if (candidate.isOpenEndedAvailability) {
    return `Період доступності: з ${from}, без фінальної дати`
  }

  if (!candidate.availableTo) {
    return `Період доступності: з ${from}`
  }

  const to = new Date(candidate.availableTo).toLocaleDateString('uk-UA')
  return `Період доступності: ${from} - ${to}`
}

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export const CandidateDetailPage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const { candidateId } = useParams<{ candidateId: string }>()
  const { role } = authData!.user

  const [candidate, setCandidate] = useState<CandidateSummary | null>(null)
  const [skillOptions, setSkillOptions] = useState<string[]>([])
  const [bookings, setBookings] = useState<CandidateBookingDetails[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const accessToken = authData!.tokens.accessToken

  const loadCandidate = useCallback(async () => {
    if (!candidateId) {
      return
    }

    setError(null)
    setIsLoading(true)
    try {
      const requests: [
        ReturnType<typeof candidateService.getById>,
        ReturnType<typeof skillService.list>,
        ReturnType<typeof bookingService.listByCandidate>,
      ] = [
        candidateService.getById(candidateId, accessToken),
        skillService.list(accessToken),
        bookingService.listByCandidate(candidateId, accessToken),
      ]
      const [candidateResponse, skillResponse, bookingResponse] = await Promise.all(requests)
      setCandidate(candidateResponse.candidate)
      setSkillOptions(skillResponse.skills.map((s) => s.name))
      setBookings(bookingResponse.bookings)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження кандидата')
    } finally {
      setIsLoading(false)
    }
  }, [candidateId, accessToken])

  useEffect(() => {
    void loadCandidate()
  }, [loadCandidate])

  const completedHiresCompaniesCount = useMemo(() => {
    if (!candidate) {
      return 0
    }

    const now = new Date()
    const history = bookings.filter(
      (b) =>
        b.candidateId === candidate.id &&
        (b.status === 'completed' || (b.status === 'approved' && new Date(b.requestedTo) < now)),
    )

    return new Set(history.map((b) => b.companyId)).size
  }, [bookings, candidate])

  const handleUpdateCandidate = async (
    payload: Parameters<typeof candidateService.update>[1],
  ): Promise<boolean> => {
    if (!candidateId) {
      return false
    }

    setError(null)
    setIsUpdating(true)
    try {
      const response = await candidateService.update(candidateId, payload, accessToken)
      setCandidate(response.candidate)
      setIsEditModalOpen(false)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка оновлення кандидата')
      return false
    } finally {
      setIsUpdating(false)
    }
  }

  if (!candidateId) {
    return <Navigate to="/masters" replace />
  }

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-5xl space-y-6">
        <AppNav
          title={candidate ? candidate.fullName : 'Профіль майстра'}
          actions={
            <button
              type="button"
              onClick={() => void navigate('/masters')}
              className="rounded-xl border border-[#d9d3c5] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#5d5348] transition hover:bg-[#f7efdd]"
            >
              Назад до списку
            </button>
          }
        />

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="text-sm text-slate-500">Завантажуємо інформацію про кандидата...</p>
          </div>
        ) : candidate ? (
          <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="space-y-5 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-sky-50 text-xl font-semibold text-sky-700">
                    {candidate.avatarDataUrl ? (
                      <img src={candidate.avatarDataUrl} alt={candidate.fullName} className="h-full w-full object-cover" />
                    ) : (
                      getInitials(candidate.fullName)
                    )}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Профіль майстра</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-950">{candidate.fullName}</h2>
                  </div>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${availabilityStyles[candidate.availability]}`}
                >
                  {availabilityText[candidate.availability]}
                </span>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Доступність</p>
                <p className="mt-1 text-sm text-slate-800">{formatAvailabilityTerm(candidate)}</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-700">Рейтинг майстра</p>
                <p className="mt-1 text-xl font-semibold text-amber-900">{candidate.rating.toFixed(1)} / 5</p>
                <p className="mt-1 text-xs text-amber-800">
                  На основі оцінок: <span className="font-semibold">{candidate.ratingCount}</span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm text-slate-500">Завершених наймів</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {completedHiresCompaniesCount}
                </p>
              </div>
            </section>

            <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-slate-900">Послуги ({candidate.skills.length})</h3>
                <button
                  type="button"
                  onClick={() => void loadCandidate()}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Оновити
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={`${candidate.id}-${skill}`}
                    className="rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-sm font-medium text-sky-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          </div>
        ) : (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <p className="text-slate-500">Кандидата не знайдено.</p>
          </div>
        )}

        {candidate ? (
          <WorkHistory bookings={bookings} currentCandidateId={candidate.id} />
        ) : null}

        {role === 'manager' && candidate && (candidate.resumeText || candidate.cvPdfDataUrl) ? (
          <section className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Опис досвіду</h3>

            {candidate.cvPdfDataUrl ? (
              <a
                href={candidate.cvPdfDataUrl}
                download={`${candidate.fullName.replace(/\s+/g, '_')}_CV.pdf`}
                className="inline-flex items-center gap-2 rounded-xl border border-sky-300 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-700 transition hover:bg-sky-100"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
                </svg>
                Завантажити CV (PDF)
              </a>
            ) : null}

            {candidate.resumeText ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{candidate.resumeText}</p>
              </div>
            ) : null}
          </section>
        ) : null}

        {role === 'manager' && candidate ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(true)}
              className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Редагувати кандидата
            </button>
          </div>
        ) : null}

        {role === 'client' && candidate?.availability === 'available' ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void navigate(`/masters/${candidate.id}/book`)}
              className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Створити замовлення
            </button>
          </div>
        ) : null}

        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Редагувати профіль майстра"
          size="xl"
        >
          {candidate ? (
            <CandidateForm
              onSubmit={handleUpdateCandidate}
              isLoading={isUpdating}
              canCreate={role === 'manager'}
              submitLabel="Зберегти зміни"
              initialCandidate={candidate}
              skillOptions={skillOptions}
            />
          ) : null}
        </Modal>
      </section>
    </main>
  )
}

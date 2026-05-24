import type { KeyboardEvent, ReactNode } from 'react'

import type { CandidateSummary } from './candidate-types'

interface CandidateCardProps {
  candidate: CandidateSummary
  onCandidateClick?: (candidate: CandidateSummary) => void
  footer?: ReactNode
}

const availabilityStyles: Record<CandidateSummary['availability'], string> = {
  available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  leased: 'border-amber-200 bg-amber-50 text-amber-700',
}

const availabilityText: Record<CandidateSummary['availability'], string> = {
  available: 'Вільний майстер',
  leased: 'Зайнятий на обʼєкті',
}

const formatAvailabilityTerm = (candidate: CandidateSummary) => {
  const from = new Date(candidate.availableFrom).toLocaleDateString('uk-UA')

  if (candidate.isOpenEndedAvailability) {
    return `Доступний: з ${from}, без обмеження по даті`
  }

  if (!candidate.availableTo) {
    return `Доступний: з ${from}`
  }

  const to = new Date(candidate.availableTo).toLocaleDateString('uk-UA')
  return `Доступний: з ${from} до ${to}`
}

const getInitials = (fullName: string) =>
  fullName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')

export const CandidateCard = ({ candidate, onCandidateClick, footer }: CandidateCardProps) => {
  const isClickable = Boolean(onCandidateClick)
  const safeRating = Number.isFinite(candidate.rating) ? candidate.rating : 0
  const safeRatingCount = Number.isFinite(candidate.ratingCount) ? candidate.ratingCount : 0

  const handleCardClick = () => {
    onCandidateClick?.(candidate)
  }

  const handleCardKeyDown = (event: KeyboardEvent<HTMLLIElement>) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return
    }

    event.preventDefault()
    onCandidateClick?.(candidate)
  }

  return (
    <li
      className={`group flex min-h-[260px] flex-col justify-between rounded-[28px] border border-white/80 bg-[linear-gradient(180deg,_rgba(255,255,255,0.98)_0%,_rgba(248,250,252,0.95)_100%)] p-5 shadow-[0_18px_45px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:shadow-[0_24px_55px_rgba(14,165,233,0.18)] ${isClickable ? 'cursor-pointer' : ''}`}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleCardClick : undefined}
      onKeyDown={isClickable ? handleCardKeyDown : undefined}
      aria-label={isClickable ? `Відкрити профіль майстра ${candidate.fullName}` : undefined}
    >
      <div className="space-y-4">
        <span
          className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${availabilityStyles[candidate.availability]}`}
        >
          {availabilityText[candidate.availability]}
        </span>

        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-sky-100 bg-[linear-gradient(135deg,_#e0f2fe_0%,_#f8fafc_100%)] text-base font-semibold text-sky-700 shadow-inner">
            {candidate.avatarDataUrl ? (
              <img src={candidate.avatarDataUrl} alt={candidate.fullName} className="h-full w-full object-cover" />
            ) : (
              getInitials(candidate.fullName)
            )}
          </div>

          <div className="min-w-0">
            <p className="mt-1 text-lg font-semibold leading-tight text-slate-950 transition group-hover:text-sky-700">
              {candidate.fullName}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Доступність</p>
          <p className="mt-2 text-sm leading-6 text-slate-700">{formatAvailabilityTerm(candidate)}</p>
          <p className="mt-3 text-xs font-medium text-slate-600">
            Завершених замовлень: <span className="font-semibold text-slate-900">{candidate.completedHiresCompaniesCount}</span>
          </p>
          <p className="mt-2 text-xs font-medium text-slate-600">
            Рейтинг: <span className="font-semibold text-slate-900">{safeRating.toFixed(1)} / 5</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">
            На основі оцінок: <span className="font-semibold text-slate-700">{safeRatingCount}</span>
          </p>
        </div>
      </div>

      {footer ? <div className="mt-5 border-t border-slate-200/80 pt-4">{footer}</div> : null}
    </li>
  )
}

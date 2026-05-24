import { CandidateCard } from './candidate-card'
import type { CandidateSummary } from './candidate-types'

interface CandidateListProps {
  candidates: CandidateSummary[]
  isLoading: boolean
  onCandidateClick?: (candidate: CandidateSummary) => void
}

export const CandidateList = ({ candidates, isLoading, onCandidateClick }: CandidateListProps) => {
  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Завантажуємо список майстрів...</p>
      </div>
    )
  }

  if (!candidates.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Список порожній</h3>
        <p className="mt-2 text-sm text-slate-600">
          Додайте першого майстра через кнопку "Додати майстра".
        </p>
      </div>
    )
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {candidates.map((candidate) => (
        <CandidateCard
          key={candidate.id}
          candidate={candidate}
          onCandidateClick={onCandidateClick}
          footer={(
            <>
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Послуги
              </p>
              <div className="flex flex-wrap gap-2">
                {candidate.skills.map((skill) => (
                  <span
                    key={`${candidate.id}-${skill}`}
                    className="rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </>
          )}
        />
      ))}
    </ul>
  )
}

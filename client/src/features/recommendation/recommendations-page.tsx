import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { CandidateCardsWithFilters } from '../candidate/candidate-cards-with-filters'
import { companyService } from '../company/company-service'
import type { CompanySummary } from '../company/company-types'
import { positionService } from '../position/position-service'
import type { PositionSummary } from '../position/position-types'
import { AppNav } from '../../shared/app-nav'
import { recommendationService } from './recommendation-service'
import type { RecommendedCandidate } from './recommendation-types'

export const RecommendationsPage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const accessToken = authData!.tokens.accessToken

  const [recommendations, setRecommendations] = useState<RecommendedCandidate[]>([])
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [positions, setPositions] = useState<PositionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [recResult, compResult, posResult] = await Promise.all([
          recommendationService.list(accessToken),
          companyService.listMine(accessToken),
          positionService.listAll(accessToken),
        ])
        setRecommendations(recResult.recommendations)
        setCompanies(compResult.companies)
        setPositions(posResult.positions)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Помилка завантаження')
      } finally {
        setIsLoading(false)
      }
    }

    void load()
  }, [accessToken])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-sky-50 to-indigo-100 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <AppNav title="Рекомендації" />

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <CandidateCardsWithFilters
          candidates={recommendations}
          companies={companies}
          positions={positions}
          isLoading={isLoading}
          emptyText="Немає підходящих кандидатів для ваших позицій"
          onCandidateClick={(candidate) => void navigate(`/masters/${candidate.id}`)}
        />
      </div>
    </div>
  )
}

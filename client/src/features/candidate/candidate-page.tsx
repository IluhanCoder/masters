import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useAuth } from '../../context/auth-context'
import { skillService } from '../skill/skill-service'
import { AppNav } from '../../shared/app-nav'
import { Modal } from '../../shared/modal'
import { CandidateCardsWithFilters } from './candidate-cards-with-filters'
import { CandidateForm } from './candidate-form'
import { candidateService } from './candidate-service'
import type { CandidateSummary, CreateCandidatePayload } from './candidate-types'
import { bookingService } from '../booking/booking-service'

export const CandidatePage = () => {
  const { authData } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const suggestForBookingId = searchParams.get('suggestFor')
  const excludeCandidateId = searchParams.get('excludeCandidate')

  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [skillOptions, setSkillOptions] = useState<string[]>([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false)
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  const accessToken = authData!.tokens.accessToken
  const { role } = authData!.user

  const canCreateCandidate = role === 'manager' && !suggestForBookingId

  const handleSuggestCandidate = async (candidate: CandidateSummary) => {
    if (!suggestForBookingId) return
    setSuggestError(null)
    setIsSuggesting(true)
    try {
      await bookingService.update(
        suggestForBookingId,
        { action: 'suggest', suggestedCandidateId: candidate.id },
        accessToken,
      )
      void navigate('/orders')
    } catch (requestError) {
      setSuggestError(
        requestError instanceof Error ? requestError.message : 'Помилка пропозиції кандидата',
      )
    } finally {
      setIsSuggesting(false)
    }
  }

  const loadCandidates = useCallback(async () => {
    setError(null)
    setIsLoadingCandidates(true)
    try {
      const [candidateResult, skillResult] = await Promise.all([
        candidateService.list(accessToken),
        skillService.list(accessToken),
      ])

      setCandidates(candidateResult.candidates)
      setSkillOptions(skillResult.skills.map((skill) => skill.name))
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка завантаження кандидатів')
    } finally {
      setIsLoadingCandidates(false)
    }
  }, [accessToken])

  const handleCreateCandidate = async (payload: CreateCandidatePayload): Promise<boolean> => {
    if (!canCreateCandidate) {
      setError('Лише менеджер може додавати кандидатів')
      return false
    }

    setError(null)
    setIsCreatingCandidate(true)

    try {
      const response = await candidateService.create(payload, accessToken)
      setCandidates((previous) => [response.candidate, ...previous])
      setIsModalOpen(false)
      return true
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Помилка створення кандидата')
      return false
    } finally {
      setIsCreatingCandidate(false)
    }
  }

  useEffect(() => {
    void loadCandidates()
  }, [loadCandidates])

  return (
    <main className="marketplace-bg px-6 py-10">
      <section className="mx-auto max-w-6xl space-y-6">
        <AppNav
          title={suggestForBookingId ? 'Оберіть майстра для заміни' : 'Каталог майстрів'}
          actions={
            suggestForBookingId ? (
              <button
                type="button"
                onClick={() => void navigate('/orders')}
                className="rounded-xl border border-[#d9d3c5] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#5d5348] transition hover:bg-[#f7efdd]"
              >
                Скасувати вибір
              </button>
            ) : undefined
          }
        />

        {suggestForBookingId ? (
          <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            Оберіть майстра для заміни в замовленні. Майстер має бути вільний.
          </div>
        ) : null}

        {!suggestForBookingId ? (
          <div className="rounded-2xl border border-[#e6dcc8] bg-[linear-gradient(120deg,_#fff6e8_0%,_#fffdfa_100%)] px-5 py-4 text-sm text-[#6b5e4d] shadow-sm">
            Шукайте майстрів за категоріями послуг: фільтри зліва показують релевантних виконавців для вашого запиту.
          </div>
        ) : null}

        {suggestError ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {suggestError}
          </p>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900">Картки майстрів</h3>
            <button
              type="button"
              onClick={() => void loadCandidates()}
              disabled={isLoadingCandidates}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
            >
              Оновити
            </button>
          </div>

          {error ? (
            <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="max-h-[560px] overflow-y-auto pr-1">
            <CandidateCardsWithFilters
              candidates={
                suggestForBookingId && excludeCandidateId
                  ? candidates.filter((c) => c.id !== excludeCandidateId)
                  : candidates
              }
              companies={[]}
              positions={[]}
              isLoading={isLoadingCandidates || isSuggesting}
              emptyText='Додайте першого майстра через кнопку "Додати майстра".'
              showCompanyFilter={false}
              showPositionFilter={false}
              skillOptions={skillOptions}
              onCandidateClick={
                suggestForBookingId
                  ? (candidate) => void handleSuggestCandidate(candidate)
                    : (candidate) => void navigate(`/masters/${candidate.id}`)
              }
            />
          </div>

          {canCreateCandidate ? (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="rounded-xl bg-[#0f4c5c] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#16657a]"
            >
              + Додати майстра
            </button>
          ) : null}
        </div>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Додати майстра"
          size="xl"
        >
          <CandidateForm
            onSubmit={handleCreateCandidate}
            isLoading={isCreatingCandidate}
            canCreate={canCreateCandidate}
            skillOptions={skillOptions}
          />
        </Modal>
      </section>
    </main>
  )
}

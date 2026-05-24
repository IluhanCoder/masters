import { useEffect, useMemo, useState } from 'react'

import { FilterCheckboxList } from '../../shared/filter-checkbox-list'
import type { CompanySummary } from '../company/company-types'
import type { PositionSummary } from '../position/position-types'
import { CandidateCard } from './candidate-card'
import type { CandidateSummary } from './candidate-types'

interface CandidateCardsWithFiltersProps {
  candidates: CandidateSummary[]
  companies: CompanySummary[]
  positions: PositionSummary[]
  isLoading: boolean
  emptyText?: string
  showCompanyFilter?: boolean
  showPositionFilter?: boolean
  skillOptions?: string[]
  onCandidateClick?: (candidate: CandidateSummary) => void
}

const intersectsPeriods = (
  leftFrom: Date | undefined,
  leftTo: Date | undefined,
  rightFrom: Date | undefined,
  rightTo: Date | undefined,
) => {
  const leftEnd = leftTo?.getTime() ?? Number.POSITIVE_INFINITY
  const rightEnd = rightTo?.getTime() ?? Number.POSITIVE_INFINITY
  const leftStart = leftFrom?.getTime() ?? Number.NEGATIVE_INFINITY
  const rightStart = rightFrom?.getTime() ?? Number.NEGATIVE_INFINITY

  return leftStart <= rightEnd && rightStart <= leftEnd
}

export const CandidateCardsWithFilters = ({
  candidates,
  companies,
  positions,
  isLoading,
  emptyText = 'Кандидатів поки немає.',
  showCompanyFilter = true,
  showPositionFilter = true,
  skillOptions,
  onCandidateClick,
}: CandidateCardsWithFiltersProps) => {
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<Set<string>>(new Set())
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set())
  const [selectedPositionIds, setSelectedPositionIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const allCompanyIds = new Set(companies.map((company) => company.id))
    setSelectedCompanyIds(allCompanyIds)

    const availablePositions = positions.filter((position) => allCompanyIds.has(position.companyId))
    setSelectedPositionIds(new Set(availablePositions.map((position) => position.id)))

    if (skillOptions?.length) {
      setSelectedSkills(new Set(skillOptions))
    } else {
      setSelectedSkills(new Set(availablePositions.flatMap((position) => position.stack)))
    }
  }, [companies, positions, skillOptions])

  const effectiveCompanyIds = useMemo(() => {
    if (!showCompanyFilter) {
      return new Set(companies.map((company) => company.id))
    }

    return selectedCompanyIds
  }, [companies, selectedCompanyIds, showCompanyFilter])

  const availableSkills = useMemo(
    () => {
      if (skillOptions?.length) {
        return [...new Set(skillOptions)].sort()
      }

      return [
        ...new Set(
          positions
            .filter((position) => effectiveCompanyIds.has(position.companyId))
            .flatMap((position) => position.stack),
        ),
      ].sort()
    },
    [positions, effectiveCompanyIds, skillOptions],
  )

  const availablePositions = useMemo(
    () => positions.filter((position) => effectiveCompanyIds.has(position.companyId)),
    [positions, effectiveCompanyIds],
  )

  const uniquePositionTitles = useMemo(
    () => [...new Set(availablePositions.map((p) => p.title))].sort(),
    [availablePositions],
  )

  const selectedPositionTitles = useMemo(() => {
    const titles = new Set<string>()
    for (const title of uniquePositionTitles) {
      const idsForTitle = availablePositions.filter((p) => p.title === title).map((p) => p.id)
      if (idsForTitle.length > 0 && idsForTitle.every((id) => selectedPositionIds.has(id))) {
        titles.add(title)
      }
    }
    return titles
  }, [uniquePositionTitles, availablePositions, selectedPositionIds])

  const toggleCompany = (companyId: string) => {
    setSelectedCompanyIds((prev) => {
      const next = new Set(prev)
      if (next.has(companyId)) {
        next.delete(companyId)
      } else {
        next.add(companyId)
      }

      const nextPositions = positions.filter((position) => next.has(position.companyId))
      setSelectedPositionIds(new Set(nextPositions.map((position) => position.id)))
      setSelectedSkills(new Set(nextPositions.flatMap((position) => position.stack)))

      return next
    })
  }

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) => {
      const next = new Set(prev)
      if (next.has(skill)) {
        next.delete(skill)
      } else {
        next.add(skill)
      }
      return next
    })
  }

  const togglePositionTitle = (title: string) => {
    const idsForTitle = availablePositions.filter((p) => p.title === title).map((p) => p.id)
    setSelectedPositionIds((prev) => {
      const allSelected = idsForTitle.every((id) => prev.has(id))
      const next = new Set(prev)
      if (allSelected) {
        idsForTitle.forEach((id) => next.delete(id))
      } else {
        idsForTitle.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const filteredCandidates = useMemo(() => {
    if (!showPositionFilter) {
      return candidates
        .map((candidate) => {
          const matchedSkills = candidate.skills.filter((skill) => selectedSkills.has(skill))
          return {
            candidate,
            matchedSkills,
            matchedPositions: [] as Array<{ id: string; title: string }>,
          }
        })
        .filter((item) => selectedSkills.size === 0 || item.matchedSkills.length > 0)
        .sort((a, b) => b.matchedSkills.length - a.matchedSkills.length)
    }

    const enriched = candidates.map((candidate) => {
      const candidateFrom = new Date(candidate.availableFrom)
      const candidateTo = candidate.isOpenEndedAvailability
        ? undefined
        : candidate.availableTo
          ? new Date(candidate.availableTo)
          : undefined

      const lowerCandidateSkills = candidate.skills.map((skill) => skill.toLowerCase())
      const matchedSkills = new Set<string>()
      const matchedPositions: Array<{ id: string; title: string; matchRatio: number }> = []

      for (const position of positions) {
        const positionFrom = position.neededFrom ? new Date(position.neededFrom) : undefined
        const positionTo = position.isOpenEndedTerm
          ? undefined
          : position.neededTo
            ? new Date(position.neededTo)
            : undefined

        if (!intersectsPeriods(candidateFrom, candidateTo, positionFrom, positionTo)) {
          continue
        }

        const matchedForPosition = position.stack.filter((skill) =>
          lowerCandidateSkills.includes(skill.toLowerCase()),
        )

        if (!matchedForPosition.length) {
          continue
        }

        const matchRatio = position.stack.length > 0 ? matchedForPosition.length / position.stack.length : 0
        matchedForPosition.forEach((skill) => matchedSkills.add(skill))
        matchedPositions.push({ id: position.id, title: position.title, matchRatio })
      }

      const bestMatchRatio = matchedPositions.reduce((best, p) => Math.max(best, p.matchRatio), 0)

      return {
        candidate,
        matchedSkills: [...matchedSkills],
        matchedPositions,
        bestMatchRatio,
      }
    })

    return enriched
      .filter((item) => {
        const matchesSkills =
          selectedSkills.size === 0 || item.matchedSkills.some((skill) => selectedSkills.has(skill))
        const matchesPositions =
          selectedPositionIds.size === 0 ||
          item.matchedPositions.some((position) => selectedPositionIds.has(position.id))

        return matchesSkills && matchesPositions
      })
      .sort((a, b) => b.bestMatchRatio - a.bestMatchRatio || b.matchedSkills.length - a.matchedSkills.length)
  }, [candidates, positions, selectedSkills, selectedPositionIds, showPositionFilter])

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Завантажуємо картки майстрів...</p>
      </div>
    )
  }

  if (!candidates.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-center shadow-sm">
        <h3 className="text-lg font-semibold text-slate-900">Список порожній</h3>
        <p className="mt-2 text-sm text-slate-600">{emptyText}</p>
      </div>
    )
  }

  return (
    <div className="flex gap-6">
      <aside className="w-64 shrink-0 space-y-4">
        {showCompanyFilter ? (
          <FilterCheckboxList
            title="Клієнти"
            options={companies.map((c) => ({ value: c.id, label: c.name }))}
            selected={selectedCompanyIds}
            onToggle={toggleCompany}
            emptyMessage="Немає клієнтів"
            searchPlaceholder="Пошук клієнтів..."
          />
        ) : null}

        <FilterCheckboxList
          title="Категорії послуг"
          options={availableSkills.map((s) => ({ value: s, label: s }))}
          selected={selectedSkills}
          onToggle={toggleSkill}
          emptyMessage={showCompanyFilter && selectedCompanyIds.size === 0 ? 'Оберіть компанію' : 'Немає вимог до навичок'}
          searchPlaceholder="Пошук категорій..."
        />

        {showPositionFilter ? (
          <FilterCheckboxList
            title="Посади"
            options={uniquePositionTitles.map((title) => ({ value: title, label: title }))}
            selected={selectedPositionTitles}
            onToggle={togglePositionTitle}
            emptyMessage={showCompanyFilter && selectedCompanyIds.size === 0 ? 'Оберіть компанію' : 'Немає позицій'}
            searchPlaceholder="Пошук посад..."
          />
        ) : null}
      </aside>

      <main className="flex-1">
        {filteredCandidates.length === 0 ? (
          <div className="rounded-2xl border border-white/70 bg-white/70 py-16 text-center shadow backdrop-blur">
            <p className="text-slate-500">Жоден майстер не відповідає обраним категоріям</p>
          </div>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCandidates.map(({ candidate, matchedSkills, matchedPositions }) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                onCandidateClick={onCandidateClick}
                footer={(
                  <>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Послуги</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {candidate.skills.map((skill) => (
                        <span
                          key={`${candidate.id}-${skill}`}
                          className={
                            matchedSkills.includes(skill)
                              ? 'rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700'
                              : 'rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600'
                          }
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    {showPositionFilter && matchedPositions.length ? (
                      <>
                        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Підходить для замовлень
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {[...new Set(
                            matchedPositions
                              .filter((position) => selectedPositionIds.has(position.id))
                              .map((position) => position.title),
                          )].map((title) => (
                            <span
                              key={title}
                              className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700"
                            >
                              {title}
                            </span>
                          ))}
                        </div>
                      </>
                    ) : null}
                  </>
                )}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}

import type { AuthUser } from '../auth/auth-types.js'
import { CandidateBookingModel } from '../booking/booking-schema.js'
import { CandidateModel } from '../candidate/candidate-schema.js'
import { CompanyModel } from '../company/company-schema.js'
import { PositionModel } from '../position/position-schema.js'
import type { RecommendedCandidate } from './recommendation-types.js'

const parseDateOrUndefined = (value: unknown): Date | undefined => {
  if (!value) {
    return undefined
  }

  const parsed = value instanceof Date ? value : new Date(String(value))
  return Number.isNaN(parsed.getTime()) ? undefined : parsed
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

export const getRecommendations = async (authUser: AuthUser): Promise<RecommendedCandidate[]> => {
  const companies = await CompanyModel.find({ ownerUserId: authUser.id }).select('_id')
  if (!companies.length) return []

  const positions = await PositionModel.find({
    companyId: { $in: companies.map((company) => company._id) },
  }).select('title companyId stack neededFrom neededTo isOpenEndedTerm')

  const candidates = await CandidateModel.find({ availability: 'available' }).sort({ createdAt: -1 })
  const candidateIds = candidates.map((candidate) => candidate._id)
  const ratingCountAgg = await CandidateBookingModel.aggregate<{ _id: unknown; count: number }>([
    {
      $match: {
        candidateId: { $in: candidateIds },
        serviceRating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$candidateId',
        count: { $sum: 1 },
      },
    },
  ])
  const ratingCountMap = new Map(ratingCountAgg.map((item) => [String(item._id), item.count]))

  const results: RecommendedCandidate[] = []

  for (const candidate of candidates) {
    const candidateSkills = Array.isArray(candidate.skills)
      ? candidate.skills.map((skill) => String(skill).trim()).filter(Boolean)
      : []

    if (!candidateSkills.length) {
      continue
    }

    const matchedSkills = new Set<string>()
    const matchedPositions = new Map<string, { id: string; title: string; companyId: string; matchedSkills: string[] }>()
    const candidateFrom = parseDateOrUndefined(candidate.availableFrom)
    const candidateTo = candidate.isOpenEndedAvailability
      ? undefined
      : parseDateOrUndefined(candidate.availableTo)
    const lowerCandidateSkills = candidateSkills.map((skill) => skill.toLowerCase())

    for (const position of positions) {
      const positionStack = Array.isArray(position.stack) ? position.stack : []
      if (!positionStack.length) {
        continue
      }

      const positionFrom = parseDateOrUndefined(position.neededFrom)
      const positionTo = position.isOpenEndedTerm
        ? undefined
        : parseDateOrUndefined(position.neededTo)

      const hasTermOverlap = intersectsPeriods(
        candidateFrom,
        candidateTo,
        positionFrom,
        positionTo,
      )

      if (!hasTermOverlap) {
        continue
      }

      const matchedPositionSkills: string[] = []

      for (const requiredSkill of positionStack) {
        if (lowerCandidateSkills.includes(requiredSkill.toLowerCase())) {
          matchedSkills.add(requiredSkill)
          matchedPositionSkills.push(requiredSkill)
        }
      }

      if (matchedPositionSkills.length) {
        matchedPositions.set(position.id, {
          id: position.id,
          title: position.title,
          companyId: String(position.companyId),
          matchedSkills: matchedPositionSkills,
        })
      }
    }

    const matchedSkillsList = [...matchedSkills]
    const matchedPositionsList = [...matchedPositions.values()]
    if (!matchedSkillsList.length) continue

    results.push({
      id: candidate.id,
      fullName: candidate.fullName,
      skills: candidateSkills,
      rating: Number.isFinite(candidate.rating) ? candidate.rating : 0,
      ratingCount: ratingCountMap.get(candidate.id) ?? 0,
      availability: candidate.availability,
      availableFrom: candidateFrom ?? new Date(0),
      availableTo: candidateTo,
      isOpenEndedAvailability: candidate.isOpenEndedAvailability,
      completedHiresCompaniesCount: 0,
      matchedSkills: matchedSkillsList,
      matchedPositions: matchedPositionsList,
      matchScore: matchedSkillsList.length,
    })
  }

  return results.sort((a, b) => b.matchScore - a.matchScore)
}

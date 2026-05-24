export interface RecommendedPosition {
  id: string
  title: string
  companyId: string
  matchedSkills: string[]
}

export interface RecommendedCandidate {
  id: string
  fullName: string
  skills: string[]
  rating: number
  ratingCount: number
  availability: 'available' | 'leased'
  availableFrom: string
  availableTo?: string
  isOpenEndedAvailability: boolean
  completedHiresCompaniesCount: number
  matchedSkills: string[]
  matchedPositions: RecommendedPosition[]
  matchScore: number
}

export type CandidateAvailability = 'available' | 'leased'

export interface CandidateSummary {
  id: string
  fullName: string
  avatarDataUrl?: string
  resumeText?: string
  cvPdfDataUrl?: string
  completedHiresCompaniesCount: number
  skills: string[]
  rating: number
  ratingCount: number
  availability: CandidateAvailability
  availableFrom: string
  availableTo?: string
  isOpenEndedAvailability: boolean
  leasedToClientId?: string
}

export interface CreateCandidatePayload {
  fullName: string
  avatarDataUrl?: string
  resumeText?: string
  cvPdfDataUrl?: string
  skills: string[]
  availableFrom: string
  availableTo?: string
  isOpenEndedAvailability: boolean
}

export type UpdateCandidatePayload = CreateCandidatePayload

export interface UpdateCandidateRatingPayload {
  rating: number
}

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
  availability: 'available' | 'leased'
  availableFrom: Date
  availableTo?: Date
  isOpenEndedAvailability: boolean
}

export interface CreateCandidateRequestBody {
  fullName: string
  avatarDataUrl?: string
  resumeText?: string
  cvPdfDataUrl?: string
  skills: string[]
  availableFrom: string
  availableTo?: string
  isOpenEndedAvailability: boolean
}

export interface UpdateCandidateRequestBody {
  fullName: string
  avatarDataUrl?: string
  resumeText?: string
  cvPdfDataUrl?: string
  skills: string[]
  availableFrom: string
  availableTo?: string
  isOpenEndedAvailability: boolean
}

export interface UpdateCandidateRatingRequestBody {
  rating: number
}

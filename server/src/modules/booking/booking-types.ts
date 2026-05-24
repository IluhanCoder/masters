export type BookingStatus = 'new' | 'approved' | 'rejected' | 'cancelled' | 'client_rejected' | 'completed'

export interface CandidateBookingSummary {
  id: string
  candidateId: string
  originalCandidateId?: string
  positionId: string
  requestedFrom: Date
  requestedTo: Date
  weeklyHours: number
  comment?: string
  managerComment?: string
  serviceRating?: number
  serviceReview?: string
  ratedAt?: Date
  ratedById?: string
  status: BookingStatus
  createdById: string
}

export interface CandidateBookingDetails {
  id: string
  candidateId: string
  candidateName: string
  originalCandidateId?: string
  originalCandidateName?: string
  positionId: string
  positionTitle: string
  positionSeniority: string
  companyId: string
  companyName: string
  requestedFrom: Date
  requestedTo: Date
  weeklyHours: number
  comment?: string
  managerComment?: string
  serviceRating?: number
  serviceReview?: string
  ratedAt?: Date
  ratedById?: string
  status: BookingStatus
  createdById: string
  createdAt: Date
}

export interface CreateCandidateBookingRequestBody {
  candidateId: string
  positionId: string
  requestedFrom: string
  requestedTo: string
  weeklyHours: number
  comment?: string
}

export interface UpdateCandidateBookingRequestBody {
  action: 'approve' | 'reject' | 'suggest'
  managerComment?: string
  suggestedCandidateId?: string
}

export interface RespondToBookingRequestBody {
  action: 'accept' | 'reject'
}

export interface RateBookingRequestBody {
  rating: number
  review?: string
}

export type BookingStatus = 'new' | 'approved' | 'rejected' | 'cancelled' | 'client_rejected' | 'completed'

export interface CreateCandidateBookingPayload {
  candidateId: string
  positionId: string
  requestedFrom: string
  requestedTo: string
  weeklyHours: number
  comment?: string
}

export interface UpdateBookingPayload {
  action: 'approve' | 'reject' | 'suggest'
  managerComment?: string
  suggestedCandidateId?: string
}

export interface RespondToBookingPayload {
  action: 'accept' | 'reject'
}

export interface RateBookingPayload {
  rating: number
  review?: string
}

export interface CandidateBookingSummary {
  id: string
  candidateId: string
  positionId: string
  requestedFrom: string
  requestedTo: string
  weeklyHours: number
  comment?: string
  managerComment?: string
  serviceRating?: number
  serviceReview?: string
  ratedAt?: string
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
  requestedFrom: string
  requestedTo: string
  weeklyHours: number
  comment?: string
  managerComment?: string
  serviceRating?: number
  serviceReview?: string
  ratedAt?: string
  ratedById?: string
  status: BookingStatus
  createdById: string
  createdAt: string
}

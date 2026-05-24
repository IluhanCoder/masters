import { model, Schema, type HydratedDocument, type Types } from 'mongoose'

export const CANDIDATE_BOOKING_STATUSES = ['new', 'approved', 'rejected', 'cancelled', 'client_rejected', 'completed'] as const

export type CandidateBookingStatus = (typeof CANDIDATE_BOOKING_STATUSES)[number]

export interface CandidateBooking {
  candidateId: Types.ObjectId
  originalCandidateId?: Types.ObjectId
  positionId: Types.ObjectId
  requestedFrom: Date
  requestedTo: Date
  weeklyHours: number
  comment?: string
  managerComment?: string
  serviceRating?: number
  serviceReview?: string
  ratedAt?: Date
  ratedBy?: Types.ObjectId
  status: CandidateBookingStatus
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type CandidateBookingDocument = HydratedDocument<CandidateBooking>

const bookingSchema = new Schema<CandidateBooking>(
  {
    candidateId: { type: Schema.Types.ObjectId, ref: 'Candidate', required: true },
    originalCandidateId: { type: Schema.Types.ObjectId, ref: 'Candidate' },
    positionId: { type: Schema.Types.ObjectId, ref: 'Position', required: true },
    requestedFrom: { type: Date, required: true },
    requestedTo: { type: Date, required: true },
    weeklyHours: { type: Number, required: true, min: 1, max: 168 },
    comment: { type: String, trim: true, maxlength: 2000 },
    managerComment: { type: String, trim: true, maxlength: 2000 },
    serviceRating: { type: Number, min: 1, max: 5 },
    serviceReview: { type: String, trim: true, maxlength: 2000 },
    ratedAt: { type: Date },
    ratedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: CANDIDATE_BOOKING_STATUSES, default: 'new' },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

bookingSchema.index({ candidateId: 1, positionId: 1, createdBy: 1, status: 1 })

export const CandidateBookingModel = model<CandidateBooking>('CandidateBooking', bookingSchema)

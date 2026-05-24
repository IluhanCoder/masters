import { model, Schema, type HydratedDocument, type Types } from 'mongoose'

export const CANDIDATE_AVAILABILITY = ['available', 'leased'] as const

export type CandidateAvailability = (typeof CANDIDATE_AVAILABILITY)[number]

export interface Candidate {
  fullName: string
  avatarDataUrl?: string
  resumeText?: string
  cvPdfDataUrl?: string
  skills: string[]
  rating: number
  availability: CandidateAvailability
  availableFrom: Date
  availableTo?: Date
  isOpenEndedAvailability: boolean
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

export type CandidateDocument = HydratedDocument<Candidate>

const candidateSchema = new Schema<Candidate>(
  {
    fullName: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    avatarDataUrl: { type: String },
    resumeText: { type: String, trim: true, maxlength: 10000 },
    cvPdfDataUrl: { type: String },
    skills: {
      type: [String],
      required: true,
      set: (items: string[]) => items.map((item) => item.trim()).filter(Boolean),
      validate: {
        validator: (items: string[]) => Array.isArray(items) && items.length > 0,
        message: 'At least one skill is required',
      },
    },
    rating: { type: Number, min: 0, max: 5, default: 0 },
    availability: { type: String, enum: CANDIDATE_AVAILABILITY, default: 'available' },
    availableFrom: { type: Date, required: true },
    availableTo: { type: Date },
    isOpenEndedAvailability: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

candidateSchema.index({ availability: 1, skills: 1 })

export const CandidateModel = model<Candidate>('Candidate', candidateSchema)

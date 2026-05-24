import mongoose, { type FlattenMaps } from 'mongoose'

import { HttpError } from '../../shared/http-error.js'
import type { AuthUser } from '../auth/auth-types.js'
import { CandidateModel } from '../candidate/candidate-schema.js'
import { CompanyModel } from '../company/company-schema.js'
import { PositionModel } from '../position/position-schema.js'
import { CandidateBookingModel } from './booking-schema.js'
import type { CandidateBooking } from './booking-schema.js'
import type {
  CandidateBookingDetails,
  CandidateBookingSummary,
  CreateCandidateBookingRequestBody,
  RateBookingRequestBody,
  RespondToBookingRequestBody,
  UpdateCandidateBookingRequestBody,
} from './booking-types.js'

const recomputeCandidateRating = async (candidateId: string) => {
  const stats = await CandidateBookingModel.aggregate<{ _id: mongoose.Types.ObjectId; avg: number }>([
    {
      $match: {
        candidateId: new mongoose.Types.ObjectId(candidateId),
        serviceRating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$candidateId',
        avg: { $avg: '$serviceRating' },
      },
    },
  ])

  const nextRating = stats.length > 0 ? Math.round(stats[0].avg * 10) / 10 : 0
  await CandidateModel.findByIdAndUpdate(candidateId, { rating: nextRating })
}

const toSummary = (
  booking: Awaited<ReturnType<(typeof CandidateBookingModel)['findOne']>>,
): CandidateBookingSummary => {
  if (!booking) {
    throw new HttpError(404, 'Booking not found')
  }

  return {
    id: booking.id,
    candidateId: String(booking.candidateId),
    originalCandidateId: booking.originalCandidateId ? String(booking.originalCandidateId) : undefined,
    positionId: String(booking.positionId),
    requestedFrom: booking.requestedFrom,
    requestedTo: booking.requestedTo,
    weeklyHours: booking.weeklyHours,
    comment: booking.comment,
    managerComment: booking.managerComment,
    serviceRating: booking.serviceRating,
    serviceReview: booking.serviceReview,
    ratedAt: booking.ratedAt,
    ratedById: booking.ratedBy ? String(booking.ratedBy) : undefined,
    status: booking.status,
    createdById: String(booking.createdBy),
  }
}

export const listBookings = async (): Promise<CandidateBookingDetails[]> => {
  return _buildBookingDetails(await CandidateBookingModel.find().sort({ createdAt: -1 }).lean())
}

export const listByCandidateId = async (candidateId: string): Promise<CandidateBookingDetails[]> => {
  if (!candidateId || !mongoose.isValidObjectId(candidateId)) {
    throw new HttpError(400, 'candidateId must be a valid object id')
  }

  return _buildBookingDetails(
    await CandidateBookingModel.find({
      $or: [{ candidateId }, { originalCandidateId: candidateId }],
    })
      .sort({ createdAt: -1 })
      .lean(),
  )
}

export const listMyBookings = async (authUser: AuthUser): Promise<CandidateBookingDetails[]> => {
  return _buildBookingDetails(
    await CandidateBookingModel.find({ createdBy: authUser.id }).sort({ createdAt: -1 }).lean(),
  )
}

async function _buildBookingDetails(
  bookings: FlattenMaps<CandidateBooking & { _id: mongoose.Types.ObjectId; createdAt: Date }>[],
): Promise<CandidateBookingDetails[]> {
  if (!bookings.length) return []

  const candidateIds = [
    ...new Set([
      ...bookings.map((b) => String(b.candidateId)),
      ...bookings.filter((b) => b.originalCandidateId).map((b) => String(b.originalCandidateId)),
    ]),
  ]
  const positionIds = [...new Set(bookings.map((b) => String(b.positionId)))]

  const [candidates, positions] = await Promise.all([
    CandidateModel.find({ _id: { $in: candidateIds } }).select('fullName').lean(),
    PositionModel.find({ _id: { $in: positionIds } }).select('title seniority companyId').lean(),
  ])

  const companyIds = [...new Set(positions.map((p) => String(p.companyId)))]
  const companies = await CompanyModel.find({ _id: { $in: companyIds } }).select('name').lean()

  const candidateMap = new Map(candidates.map((c) => [String(c._id), c.fullName]))
  const positionMap = new Map(
    positions.map((p) => [
      String(p._id),
      { title: p.title, seniority: p.seniority, companyId: String(p.companyId) },
    ]),
  )
  const companyMap = new Map(companies.map((c) => [String(c._id), c.name]))

  return bookings.map((b) => {
    const pos = positionMap.get(String(b.positionId))
    const companyId = pos?.companyId ?? ''
    return {
      id: String(b._id),
      candidateId: String(b.candidateId),
      candidateName: candidateMap.get(String(b.candidateId)) ?? 'Невідомий кандидат',
      originalCandidateId: b.originalCandidateId ? String(b.originalCandidateId) : undefined,
      originalCandidateName: b.originalCandidateId
        ? (candidateMap.get(String(b.originalCandidateId)) ?? 'Невідомий кандидат')
        : undefined,
      positionId: String(b.positionId),
      positionTitle: pos?.title ?? 'Невідома посада',
      positionSeniority: pos?.seniority ?? '',
      companyId,
      companyName: companyMap.get(companyId) ?? 'Невідома компанія',
      requestedFrom: b.requestedFrom,
      requestedTo: b.requestedTo,
      weeklyHours: b.weeklyHours,
      comment: b.comment,
      managerComment: b.managerComment,
      serviceRating: b.serviceRating,
      serviceReview: b.serviceReview,
      ratedAt: b.ratedAt,
      ratedById: b.ratedBy ? String(b.ratedBy) : undefined,
      status: b.status,
      createdById: String(b.createdBy),
      createdAt: b.createdAt,
    }
  })
}

export const updateBooking = async (
  bookingId: string,
  payload: UpdateCandidateBookingRequestBody,
  authUser: AuthUser,
): Promise<CandidateBookingSummary> => {
  if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
    throw new HttpError(400, 'bookingId must be a valid object id')
  }

  const booking = await CandidateBookingModel.findById(bookingId)
  if (!booking) {
    throw new HttpError(404, 'Booking not found')
  }

  if (booking.status !== 'new') {
    throw new HttpError(409, 'Only new bookings can be updated')
  }

  if (payload.action === 'approve') {
    if (booking.originalCandidateId) {
      throw new HttpError(
        409,
        'Cannot approve: waiting for client confirmation of suggested candidate',
      )
    }
    booking.status = 'approved'
    if (payload.managerComment?.trim()) {
      booking.managerComment = payload.managerComment.trim()
    }
    await PositionModel.findByIdAndUpdate(booking.positionId, { status: 'archived' })
  } else if (payload.action === 'reject') {
    booking.status = 'rejected'
    if (payload.managerComment?.trim()) {
      booking.managerComment = payload.managerComment.trim()
    }
  } else if (payload.action === 'suggest') {
    const suggestedCandidateId = payload.suggestedCandidateId?.trim()
    if (!suggestedCandidateId || !mongoose.isValidObjectId(suggestedCandidateId)) {
      throw new HttpError(400, 'suggestedCandidateId must be a valid object id')
    }

    const newCandidate = await CandidateModel.findById(suggestedCandidateId)
    if (!newCandidate) {
      throw new HttpError(404, 'Candidate not found')
    }

    if (newCandidate.availability !== 'available') {
      throw new HttpError(409, 'Suggested candidate is not available')
    }

    booking.originalCandidateId = booking.candidateId
    booking.candidateId = newCandidate._id
  } else {
    throw new HttpError(400, 'action must be one of: approve, reject, suggest')
  }

  await booking.save()
  return toSummary(booking)
}

export const respondToBooking = async (
  bookingId: string,
  payload: RespondToBookingRequestBody,
  authUser: AuthUser,
): Promise<CandidateBookingSummary> => {
  if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
    throw new HttpError(400, 'bookingId must be a valid object id')
  }

  const booking = await CandidateBookingModel.findOne({
    _id: bookingId,
    createdBy: authUser.id,
  })
  if (!booking) {
    throw new HttpError(404, 'Booking not found')
  }

  if (booking.status !== 'new') {
    throw new HttpError(409, 'Only new bookings can be responded to')
  }

  if (!booking.originalCandidateId) {
    throw new HttpError(409, 'No counter-proposal to respond to')
  }

  if (payload.action === 'accept') {
    booking.originalCandidateId = undefined
    booking.status = 'approved'
    await PositionModel.findByIdAndUpdate(booking.positionId, { status: 'archived' })
  } else if (payload.action === 'reject') {
    booking.status = 'client_rejected'
  } else {
    throw new HttpError(400, 'action must be accept or reject')
  }

  await booking.save()
  return toSummary(booking)
}

export const rateBooking = async (
  bookingId: string,
  payload: RateBookingRequestBody,
  authUser: AuthUser,
): Promise<CandidateBookingSummary> => {
  if (!bookingId || !mongoose.isValidObjectId(bookingId)) {
    throw new HttpError(400, 'bookingId must be a valid object id')
  }

  const booking = await CandidateBookingModel.findOne({ _id: bookingId, createdBy: authUser.id })
  if (!booking) {
    throw new HttpError(404, 'Booking not found')
  }

  const now = new Date()
  if (booking.status === 'approved' && booking.requestedTo.getTime() < now.getTime()) {
    booking.status = 'completed'
  }

  if (booking.status !== 'completed') {
    throw new HttpError(409, 'Only completed bookings can be rated')
  }

  const rating = Number(payload.rating)
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
    throw new HttpError(400, 'rating must be between 1 and 5')
  }

  booking.serviceRating = Math.round(rating * 10) / 10
  booking.serviceReview = payload.review?.trim() || undefined
  booking.ratedAt = now
  booking.ratedBy = new mongoose.Types.ObjectId(authUser.id)

  await booking.save()
  await recomputeCandidateRating(String(booking.candidateId))

  return toSummary(booking)
}

const isWithinCandidateAvailability = (
  candidateFrom: Date,
  candidateTo: Date | undefined,
  requestedFrom: Date,
  requestedTo: Date,
) => {
  const candidateEnd = candidateTo?.getTime() ?? Number.POSITIVE_INFINITY
  return requestedFrom.getTime() >= candidateFrom.getTime() && requestedTo.getTime() <= candidateEnd
}

export const createBooking = async (
  payload: CreateCandidateBookingRequestBody,
  authUser: AuthUser,
): Promise<CandidateBookingSummary> => {
  const candidateId = payload.candidateId?.trim()
  if (!candidateId || !mongoose.isValidObjectId(candidateId)) {
    throw new HttpError(400, 'candidateId must be a valid object id')
  }

  const positionId = payload.positionId?.trim()
  if (!positionId || !mongoose.isValidObjectId(positionId)) {
    throw new HttpError(400, 'positionId must be a valid object id')
  }

  const requestedFrom = new Date(payload.requestedFrom)
  if (Number.isNaN(requestedFrom.getTime())) {
    throw new HttpError(400, 'requestedFrom must be a valid date')
  }

  const requestedTo = new Date(payload.requestedTo)
  if (Number.isNaN(requestedTo.getTime())) {
    throw new HttpError(400, 'requestedTo must be a valid date')
  }

  if (requestedTo.getTime() < requestedFrom.getTime()) {
    throw new HttpError(400, 'requestedTo must be greater or equal to requestedFrom')
  }

  const weeklyHours = Number(payload.weeklyHours)
  if (!Number.isFinite(weeklyHours) || weeklyHours <= 0 || weeklyHours > 168) {
    throw new HttpError(400, 'weeklyHours must be between 1 and 168')
  }

  const candidate = await CandidateModel.findById(candidateId)
  if (!candidate) {
    throw new HttpError(404, 'Candidate not found')
  }

  const position = await PositionModel.findById(positionId)
  if (!position) {
    throw new HttpError(404, 'Position not found')
  }

  const company = await CompanyModel.findOne({ _id: position.companyId, ownerUserId: authUser.id })
  if (!company) {
    throw new HttpError(404, 'Position not found')
  }

  if (position.status === 'closed') {
    throw new HttpError(409, 'Position is closed for booking')
  }

  if (candidate.availability !== 'available') {
    throw new HttpError(409, 'Candidate is not available for booking')
  }

  if (
    !isWithinCandidateAvailability(
      candidate.availableFrom,
      candidate.isOpenEndedAvailability ? undefined : candidate.availableTo,
      requestedFrom,
      requestedTo,
    )
  ) {
    throw new HttpError(409, 'Candidate is not available for the selected dates')
  }

  const booking = await CandidateBookingModel.create({
    candidateId: candidate.id,
    positionId: position.id,
    requestedFrom,
    requestedTo,
    weeklyHours,
    comment: payload.comment?.trim(),
    createdBy: authUser.id,
  })

  return toSummary(booking)
}

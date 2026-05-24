import type { AuthUser } from '../auth/auth-types.js'
import { CandidateModel } from '../candidate/candidate-schema.js'
import { CandidateBookingModel } from '../booking/booking-schema.js'
import { CompanyModel } from '../company/company-schema.js'
import { PositionModel } from '../position/position-schema.js'
import type { ClientDashboard, ManagerDashboard } from './dashboard-types.js'

export const getManagerDashboard = async (): Promise<ManagerDashboard> => {
  const now = new Date()

  const [
    totalCandidates,
    leasedCandidateIds,
    bookingCounts,
    totalCompanies,
    positionCounts,
  ] = await Promise.all([
    CandidateModel.countDocuments(),
    CandidateBookingModel.distinct('candidateId', {
      status: 'approved',
      requestedFrom: { $lte: now },
      requestedTo: { $gte: now },
    }),
    CandidateBookingModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CompanyModel.countDocuments(),
    PositionModel.aggregate<{ _id: string; count: number }>([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const bookingMap = Object.fromEntries(bookingCounts.map((b) => [b._id, b.count]))
  const positionMap = Object.fromEntries(positionCounts.map((p) => [p._id, p.count]))
  const totalBookings = bookingCounts.reduce((sum, b) => sum + b.count, 0)
  const leasedCandidates = leasedCandidateIds.length
  const availableCandidates = Math.max(totalCandidates - leasedCandidates, 0)

  return {
    candidates: {
      total: totalCandidates,
      available: availableCandidates,
      leased: leasedCandidates,
    },
    bookings: {
      total: totalBookings,
      new: bookingMap['new'] ?? 0,
      approved: bookingMap['approved'] ?? 0,
      completed: bookingMap['completed'] ?? 0,
      rejected: bookingMap['rejected'] ?? 0,
      client_rejected: bookingMap['client_rejected'] ?? 0,
      cancelled: bookingMap['cancelled'] ?? 0,
    },
    companies: {
      total: totalCompanies,
    },
    positions: {
      total: positionCounts.reduce((sum, p) => sum + p.count, 0),
      open: positionMap['open'] ?? 0,
      archived: positionMap['archived'] ?? 0,
    },
  }
}

export const getClientDashboard = async (authUser: AuthUser): Promise<ClientDashboard> => {
  const myCompanies = await CompanyModel.find({ ownerUserId: authUser.id }).select('_id').lean()
  const companyIds = myCompanies.map((c) => c._id)

  const [positionCounts, bookingCounts] = await Promise.all([
    PositionModel.aggregate<{ _id: string; count: number }>([
      { $match: { companyId: { $in: companyIds } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    CandidateBookingModel.aggregate<{ _id: string; count: number }>([
      { $match: { createdBy: authUser.id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ])

  const positionMap = Object.fromEntries(positionCounts.map((p) => [p._id, p.count]))
  const bookingMap = Object.fromEntries(bookingCounts.map((b) => [b._id, b.count]))

  return {
    companies: {
      total: myCompanies.length,
    },
    positions: {
      total: positionCounts.reduce((sum, p) => sum + p.count, 0),
      open: positionMap['open'] ?? 0,
      archived: positionMap['archived'] ?? 0,
    },
    bookings: {
      total: bookingCounts.reduce((sum, b) => sum + b.count, 0),
      new: bookingMap['new'] ?? 0,
      approved: bookingMap['approved'] ?? 0,
      completed: bookingMap['completed'] ?? 0,
    },
  }
}

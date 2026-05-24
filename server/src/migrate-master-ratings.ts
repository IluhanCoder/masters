import 'dotenv/config'

import mongoose from 'mongoose'

import { CandidateBookingModel } from './modules/booking/booking-schema.js'
import { CandidateModel } from './modules/candidate/candidate-schema.js'

const hashString = (input: string) => {
  let hash = 0
  for (let index = 0; index < input.length; index++) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0
  }
  return hash
}

const hashNoise = (seed: string, min: number, max: number): number => {
  const hash = hashString(seed)
  const fraction = (hash % 1000) / 1000
  return min + fraction * (max - min)
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

async function migrateMasterRatings() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const now = new Date()

  const bookingsToRate = await CandidateBookingModel.find({
    $or: [
      { status: 'completed' },
      { status: 'approved', requestedTo: { $lt: now } },
    ],
  })

  let ratedBookings = 0
  for (const booking of bookingsToRate) {
    const seed = `${String(booking.candidateId)}:${booking.id}`
    const simulatedRating = Math.round(clamp(hashNoise(seed, 3.5, 5), 3.5, 5) * 10) / 10

    booking.status = 'completed'
    booking.serviceRating = simulatedRating
    if (!booking.serviceReview) {
      booking.serviceReview = simulatedRating >= 4.5
        ? 'Робота виконана дуже якісно, майстер дотримався строків.'
        : simulatedRating >= 4
          ? 'Хороший результат, незначні правки були узгоджені на місці.'
          : 'Послугу виконано, але потребувались додаткові уточнення по деталях.'
    }
    booking.ratedAt = booking.ratedAt ?? now
    booking.ratedBy = booking.ratedBy ?? booking.createdBy
    await booking.save()
    ratedBookings += 1
  }

  const ratingsByCandidate = await CandidateBookingModel.aggregate<{
    _id: mongoose.Types.ObjectId
    avgRating: number
  }>([
    {
      $match: {
        serviceRating: { $exists: true, $ne: null },
      },
    },
    {
      $group: {
        _id: '$candidateId',
        avgRating: { $avg: '$serviceRating' },
      },
    },
  ])

  const ratingsMap = new Map(
    ratingsByCandidate.map((item) => [String(item._id), item.avgRating]),
  )

  const candidates = await CandidateModel.find().select('_id rating')

  let updatedCandidates = 0
  for (const candidate of candidates) {
    const rounded = Math.round((ratingsMap.get(String(candidate._id)) ?? 0) * 10) / 10

    if (candidate.rating !== rounded) {
      candidate.rating = rounded
      await candidate.save()
      updatedCandidates += 1
    }
  }

  const top = await CandidateModel.find().sort({ rating: -1 }).limit(5).select('fullName rating').lean()
  const bottom = await CandidateModel.find().sort({ rating: 1 }).limit(5).select('fullName rating').lean()

  console.log('Master ratings migration complete:')
  console.log(`  completed bookings rated: ${ratedBookings}`)
  console.log(`  candidates updated: ${updatedCandidates}`)
  console.log('  top ratings:')
  for (const item of top) {
    console.log(`    - ${item.fullName}: ${item.rating.toFixed(1)}`)
  }
  console.log('  lower ratings:')
  for (const item of bottom) {
    console.log(`    - ${item.fullName}: ${item.rating.toFixed(1)}`)
  }

  await mongoose.disconnect()
}

migrateMasterRatings().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

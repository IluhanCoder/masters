import 'dotenv/config'

import mongoose from 'mongoose'

import { PositionModel } from './modules/position/position-schema.js'

type Seniority = 'junior' | 'middle' | 'senior'

const ORDER: Seniority[] = ['middle', 'senior', 'junior']

const chooseTarget = (counts: Record<Seniority, number>): Seniority => {
  const max = Math.max(counts.junior, counts.middle, counts.senior)
  const winners = ORDER.filter((key) => counts[key] === max)
  return winners[0] ?? 'middle'
}

async function migrateNormalizeSeniority() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const positions = await PositionModel.find().select('_id title seniority').lean()

  const byTitle = new Map<string, { ids: string[]; counts: Record<Seniority, number> }>()

  for (const position of positions) {
    const title = position.title?.trim()
    const seniority = (position.seniority as Seniority) || 'middle'
    if (!title || !['junior', 'middle', 'senior'].includes(seniority)) {
      continue
    }

    const item = byTitle.get(title) ?? {
      ids: [],
      counts: { junior: 0, middle: 0, senior: 0 },
    }

    item.ids.push(String(position._id))
    item.counts[seniority] += 1
    byTitle.set(title, item)
  }

  let titlesUpdated = 0
  let positionsUpdated = 0

  for (const [title, item] of byTitle.entries()) {
    const target = chooseTarget(item.counts)

    const result = await PositionModel.updateMany(
      { title, seniority: { $ne: target } },
      { $set: { seniority: target } },
    )

    if (result.modifiedCount > 0) {
      titlesUpdated += 1
      positionsUpdated += result.modifiedCount
    }
  }

  const check = await PositionModel.aggregate<{
    _id: string
    levels: string[]
  }>([
    {
      $group: {
        _id: '$title',
        levels: { $addToSet: '$seniority' },
      },
    },
    {
      $match: {
        'levels.1': { $exists: true },
      },
    },
  ])

  console.log('Seniority normalization complete:')
  console.log(`  titles updated: ${titlesUpdated}`)
  console.log(`  positions updated: ${positionsUpdated}`)
  console.log(`  mixed titles remaining: ${check.length}`)

  await mongoose.disconnect()
}

migrateNormalizeSeniority().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

import 'dotenv/config'

import mongoose from 'mongoose'

import { CompanyModel } from './modules/company/company-schema.js'
import { PositionModel } from './modules/position/position-schema.js'

const TITLE_MAP: Record<string, string> = {
  'frontend developer': 'Електромонтажні роботи',
  'backend developer': 'Сантехнічні роботи',
  'full-stack developer': 'Комплексний ремонт під ключ',
  'devops engineer': 'Покрівельні роботи',
  'data engineer': 'Монтаж підлогових покриттів',
  'qa engineer': 'Клінінг після ремонту',
  'mobile developer': 'Монтаж дверей і вікон',
  'machine learning engineer': 'Комплексний ремонт під ключ',
  'security engineer': 'Фасадні роботи',
  'ui/ux designer': 'Проєктування ремонту',
}

const INDUSTRY_MAP: Record<string, string> = {
  'фінтех': 'Ремонт і будівництво',
  edtech: 'Інтерʼєрні роботи',
  healthtech: 'Інженерні мережі',
  'e-commerce': 'Оздоблення приміщень',
  saas: 'Сервіс для дому',
  gamedev: 'Ремонт і будівництво',
  'медіа & реклама': 'Інтерʼєрні роботи',
  логістика: 'Покрівля та фасад',
  кібербезпека: 'Технічний нагляд',
  iot: 'Ландшафт і благоустрій',
}

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

const mapTitle = (input: string): string => {
  const key = input.trim().toLowerCase()
  return TITLE_MAP[key] ?? input
}

async function migrateMasterCategories() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const positions = await PositionModel.find().select('_id title')
  let updatedPositions = 0

  for (const position of positions) {
    const mappedTitle = mapTitle(position.title)
    if (mappedTitle === position.title) {
      continue
    }

    position.title = mappedTitle
    await position.save()
    updatedPositions += 1
  }

  const companies = await CompanyModel.find().select('_id industry hiringNeeds')
  let updatedCompanies = 0

  for (const company of companies) {
    const nextIndustry = company.industry
      ? (INDUSTRY_MAP[company.industry.trim().toLowerCase()] ?? company.industry)
      : company.industry

    const nextNeeds = unique((company.hiringNeeds ?? []).map(mapTitle))

    const industryChanged = (nextIndustry ?? '') !== (company.industry ?? '')
    const needsChanged =
      nextNeeds.length !== (company.hiringNeeds ?? []).length ||
      nextNeeds.some((value, index) => value !== company.hiringNeeds[index])

    if (!industryChanged && !needsChanged) {
      continue
    }

    if (industryChanged) {
      company.industry = nextIndustry
    }

    if (needsChanged) {
      company.hiringNeeds = nextNeeds
    }

    await company.save()
    updatedCompanies += 1
  }

  console.log('Master categories migration complete:')
  console.log(`  positions updated: ${updatedPositions}`)
  console.log(`  companies updated: ${updatedCompanies}`)

  await mongoose.disconnect()
}

migrateMasterCategories().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

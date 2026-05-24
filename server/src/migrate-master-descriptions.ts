import 'dotenv/config'

import mongoose from 'mongoose'

import { CompanyModel } from './modules/company/company-schema.js'
import { UserModel } from './modules/user/user-schema.js'

const DESCRIPTION_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  {
    pattern: /платіж|фінансов|b2b|fintech|фінтех/gi,
    replacement: 'Компанія виконує ремонтні роботи для житлових і комерційних приміщень.',
  },
  {
    pattern: /онлайн-платформ|навчання|кваліфікац|edtech/gi,
    replacement: 'Компанія спеціалізується на внутрішньому оздобленні та ремонті під ключ.',
  },
  {
    pattern: /медич|клінік|лікарень|healthtech/gi,
    replacement: 'Компанія надає послуги монтажу інженерних мереж: сантехніка, вентиляція, кондиціонування.',
  },
  {
    pattern: /логістик|вантаж|ship/gi,
    replacement: 'Компанія виконує фасадні та покрівельні роботи, утеплення і зовнішнє оздоблення.',
  },
  {
    pattern: /аналітичн|ml|машинн|retail|e-commerce|saas|data/gi,
    replacement: 'Компанія виконує фінішні роботи, монтаж покриттів та клінінг після ремонту.',
  },
  {
    pattern: /розробк|сервіс|платформ|автоматизац|інформаційн/gi,
    replacement: 'Компанія забезпечує повний цикл будівельних та ремонтних робіт з технічним наглядом.',
  },
]

const DEFAULT_DESCRIPTION = 'Компанія працює у сфері ремонтно-будівельних послуг і співпрацює з майстрами різних спеціалізацій.'

const normalizeDescription = (description?: string): string => {
  const source = (description ?? '').trim()
  if (!source) {
    return DEFAULT_DESCRIPTION
  }

  for (const { pattern, replacement } of DESCRIPTION_PATTERNS) {
    if (pattern.test(source)) {
      return replacement
    }
  }

  if (/ремонт|будів|майстр|оздобл|монтаж|сантех|електрик|покрів|фасад/i.test(source)) {
    return source
  }

  return DEFAULT_DESCRIPTION
}

const toKey = (value: string) => value.trim().toLowerCase()

async function migrateMasterDescriptions() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const companies = await CompanyModel.find().select('_id description name industry technologies hiringNeeds website rentedSpecialists ownerUserId')

  let updatedCompanies = 0
  for (const company of companies) {
    const nextDescription = normalizeDescription(company.description)
    if (nextDescription === (company.description ?? '').trim()) {
      continue
    }

    company.description = nextDescription
    await company.save()
    updatedCompanies += 1
  }

  const companiesAfter = await CompanyModel.find().select('_id name website industry description technologies hiringNeeds rentedSpecialists')
  const companyById = new Map(companiesAfter.map((company) => [toKey(String(company._id)), company]))

  const clientUsers = await UserModel.find({ role: 'client' }).select('_id companyId companyProfile')

  let updatedUsers = 0
  for (const user of clientUsers) {
    const companyId = user.companyId ? String(user.companyId) : ''
    if (!companyId) {
      continue
    }

    const company = companyById.get(toKey(companyId))
    if (!company) {
      continue
    }

    const nextProfile = {
      name: company.name,
      website: company.website,
      industry: company.industry,
      description: company.description,
      technologies: company.technologies,
      hiringNeeds: company.hiringNeeds,
      rentedSpecialists: company.rentedSpecialists,
    }

    const current = user.companyProfile
    const isSame =
      current?.name === nextProfile.name &&
      current?.website === nextProfile.website &&
      current?.industry === nextProfile.industry &&
      current?.description === nextProfile.description &&
      JSON.stringify(current?.technologies ?? []) === JSON.stringify(nextProfile.technologies) &&
      JSON.stringify(current?.hiringNeeds ?? []) === JSON.stringify(nextProfile.hiringNeeds) &&
      (current?.rentedSpecialists ?? 0) === nextProfile.rentedSpecialists

    if (isSame) {
      continue
    }

    user.companyProfile = nextProfile
    await user.save()
    updatedUsers += 1
  }

  console.log('Master descriptions migration complete:')
  console.log(`  companies updated: ${updatedCompanies}`)
  console.log(`  users updated:     ${updatedUsers}`)

  await mongoose.disconnect()
}

migrateMasterDescriptions().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

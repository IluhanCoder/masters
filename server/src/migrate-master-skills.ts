import 'dotenv/config'

import mongoose from 'mongoose'

import { CandidateModel } from './modules/candidate/candidate-schema.js'
import { CompanyModel } from './modules/company/company-schema.js'
import { PositionModel } from './modules/position/position-schema.js'
import { SkillModel } from './modules/skill/skill-schema.js'

const MASTER_SKILLS = [
  'Електрика',
  'Сантехніка',
  'Плитка',
  'Штукатурка',
  'Шпаклівка',
  'Фарбування',
  'Гіпсокартон',
  'Монтаж дверей',
  'Монтаж вікон',
  'Покрівельні роботи',
  'Фасадні роботи',
  'Мурування',
  'Стяжка підлоги',
  'Ламінат',
  'Паркет',
  'Натяжні стелі',
  'Вентиляція',
  'Кондиціонування',
  'Зварювання',
  'Бетонні роботи',
  'Демонтаж',
  'Монтаж меблів',
  'Збирання кухні',
  'Скляні перегородки',
  'Бруківка',
  'Ландшафтні роботи',
  'Утеплення',
  'Клінінг після ремонту',
  'Проєктування ремонту',
  'Технагляд',
]

const IT_TO_MASTER_SKILL: Record<string, string> = {
  react: 'Внутрішнє оздоблення',
  'vue.js': 'Внутрішнє оздоблення',
  angular: 'Внутрішнє оздоблення',
  typescript: 'Електрика',
  javascript: 'Електрика',
  'next.js': 'Фарбування',
  'nuxt.js': 'Фарбування',
  'tailwind css': 'Шпаклівка',
  'scss/sass': 'Штукатурка',
  redux: 'Монтаж меблів',
  zustand: 'Монтаж меблів',
  graphql: 'Проєктування ремонту',
  'node.js': 'Сантехніка',
  python: 'Сантехніка',
  java: 'Зварювання',
  go: 'Зварювання',
  rust: 'Зварювання',
  php: 'Монтаж дверей',
  'c#': 'Монтаж вікон',
  '.net': 'Монтаж вікон',
  'spring boot': 'Бетонні роботи',
  django: 'Штукатурка',
  fastapi: 'Вентиляція',
  nestjs: 'Кондиціонування',
  'express.js': 'Сантехніка',
  kotlin: 'Монтаж дверей',
  postgresql: 'Стяжка підлоги',
  mysql: 'Стяжка підлоги',
  mongodb: 'Плитка',
  redis: 'Плитка',
  elasticsearch: 'Фасадні роботи',
  clickhouse: 'Фасадні роботи',
  docker: 'Демонтаж',
  kubernetes: 'Покрівельні роботи',
  aws: 'Покрівельні роботи',
  gcp: 'Покрівельні роботи',
  azure: 'Покрівельні роботи',
  terraform: 'Мурування',
  'ci/cd': 'Технагляд',
  'github actions': 'Технагляд',
  ansible: 'Технагляд',
  linux: 'Технагляд',
  'react native': 'Монтаж меблів',
  flutter: 'Монтаж меблів',
  'ios (swift)': 'Монтаж вікон',
  'android (kotlin)': 'Монтаж дверей',
  'machine learning': 'Проєктування ремонту',
  tensorflow: 'Проєктування ремонту',
  pytorch: 'Проєктування ремонту',
  'data analysis': 'Технагляд',
  pandas: 'Технагляд',
  sql: 'Стяжка підлоги',
  'rest api': 'Електрика',
  websocket: 'Сантехніка',
  microservices: 'Комплексний ремонт',
  grpc: 'Вентиляція',
  'system design': 'Проєктування ремонту',
}

const normalize = (value: string) => value.trim().toLowerCase()

const fallbackSkill = (input: string): string => {
  const source = normalize(input)
  if (!source) {
    return MASTER_SKILLS[0]
  }

  let hash = 0
  for (let index = 0; index < source.length; index++) {
    hash = (hash * 31 + source.charCodeAt(index)) >>> 0
  }

  return MASTER_SKILLS[hash % MASTER_SKILLS.length]
}

const mapSkill = (input: string): string => {
  const key = normalize(input)
  return IT_TO_MASTER_SKILL[key] ?? fallbackSkill(input)
}

const unique = (items: string[]): string[] => [...new Set(items.map((item) => item.trim()).filter(Boolean))]

async function migrateMasterSkills() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const now = new Date()

  await SkillModel.deleteMany({})
  await SkillModel.insertMany(
    MASTER_SKILLS.map((name) => ({ name, nameLower: name.toLowerCase(), createdAt: now, updatedAt: now })),
  )

  const candidates = await CandidateModel.find().select('_id skills')
  let updatedCandidates = 0
  for (const candidate of candidates) {
    const mapped = unique((candidate.skills ?? []).map(mapSkill))
    const nextSkills = mapped.length ? mapped : [MASTER_SKILLS[0]]

    const changed =
      nextSkills.length !== candidate.skills.length ||
      nextSkills.some((skill, index) => skill !== candidate.skills[index])

    if (!changed) continue

    candidate.skills = nextSkills
    await candidate.save()
    updatedCandidates += 1
  }

  const positions = await PositionModel.find().select('_id stack')
  let updatedPositions = 0
  for (const position of positions) {
    const mapped = unique((position.stack ?? []).map(mapSkill))
    const nextStack = mapped.length ? mapped : [MASTER_SKILLS[0]]

    const changed =
      nextStack.length !== position.stack.length ||
      nextStack.some((skill, index) => skill !== position.stack[index])

    if (!changed) continue

    position.stack = nextStack
    await position.save()
    updatedPositions += 1
  }

  const companies = await CompanyModel.find().select('_id technologies')
  let updatedCompanies = 0
  for (const company of companies) {
    const mapped = unique((company.technologies ?? []).map(mapSkill))
    const nextTech = mapped.length ? mapped : [MASTER_SKILLS[0]]

    const changed =
      nextTech.length !== company.technologies.length ||
      nextTech.some((skill, index) => skill !== company.technologies[index])

    if (!changed) continue

    company.technologies = nextTech
    await company.save()
    updatedCompanies += 1
  }

  console.log('Master skills migration complete:')
  console.log(`  skills reset:        ${MASTER_SKILLS.length}`)
  console.log(`  candidates updated:  ${updatedCandidates}`)
  console.log(`  positions updated:   ${updatedPositions}`)
  console.log(`  companies updated:   ${updatedCompanies}`)

  await mongoose.disconnect()
}

migrateMasterSkills().catch((error: unknown) => {
  console.error(error)
  process.exit(1)
})

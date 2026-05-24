
import 'dotenv/config'

import bcrypt from 'bcryptjs'
import mongoose, { Types } from 'mongoose'

import { ChatMessageModel } from './modules/chat/chat-message-schema.js'
import { ChatModel } from './modules/chat/chat-schema.js'
import { CandidateBookingModel } from './modules/booking/booking-schema.js'
import { CandidateModel } from './modules/candidate/candidate-schema.js'
import { CompanyModel } from './modules/company/company-schema.js'
import { PositionModel } from './modules/position/position-schema.js'
import { SkillModel } from './modules/skill/skill-schema.js'
import { UserModel } from './modules/user/user-schema.js'

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000)
const daysFromNow = (n: number) => new Date(Date.now() + n * 86_400_000)
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const pickN = <T>(arr: T[], n: number): T[] => {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}
const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min

const ALL_SKILLS = [
  'Електрика',
  'Освітлення',
  'Монтаж розеток',
  'Сантехніка',
  'Монтаж змішувачів',
  'Пайка труб',
  'Плитка',
  'Гідроізоляція',
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
  'Вивіз сміття',
  'Монтаж меблів',
  'Збирання кухні',
  'Скляні перегородки',
  'Бруківка',
  'Ландшафтні роботи',
  'Утеплення',
  'Клінінг після ремонту',
  'Проєктування ремонту',
  'Технагляд',
  'Комплексний ремонт',
]

const INDUSTRIES = [
  'Ремонт і будівництво',
  'Інтерʼєрні роботи',
  'Інженерні мережі',
  'Оздоблення приміщень',
  'Покрівля та фасад',
  'Сервіс для дому',
  'Ландшафт і благоустрій',
  'Технічний нагляд',
]

const FIRST_NAMES = [
  'Олексій', 'Дмитро', 'Андрій', 'Іван', 'Максим', 'Сергій', 'Микола', 'Владислав',
  'Тарас', 'Богдан', 'Роман', 'Артем', 'Євген', 'Юрій', 'Віктор',
  'Олена', 'Наталія', 'Юлія', 'Ірина', 'Катерина', 'Марія', 'Аліна', 'Анна',
  'Дарина', 'Вікторія', 'Тетяна', 'Людмила', 'Оксана', 'Лариса', 'Соломія',
]

const LAST_NAMES = [
  'Коваленко', 'Шевченко', 'Бондаренко', 'Іваненко', 'Петренко', 'Кравченко',
  'Ткаченко', 'Мороз', 'Лисенко', 'Гриценко', 'Марченко', 'Назаренко',
  'Савченко', 'Поліщук', 'Бойко', 'Костенко', 'Хоменко', 'Романенко',
  'Лук\'яненко', 'Пономаренко', 'Даниленко', 'Сидоренко', 'Яценко', 'Павленко',
]

const POSITION_TITLES = [
  'Електромонтажні роботи',
  'Сантехнічні роботи',
  'Плиточні роботи',
  'Штукатурно-малярні роботи',
  'Монтаж підлогових покриттів',
  'Покрівельні роботи',
  'Фасадні роботи',
  'Монтаж дверей і вікон',
  'Клінінг після ремонту',
  'Комплексний ремонт під ключ',
]

const CHAT_MESSAGES_POOL = {
  clientOpen: [
    'Добрий день! Потрібен майстер для сантехнічних робіт у квартирі, які варіанти є?',
    'Вітаю! Шукаємо бригаду на комплексний ремонт під ключ, можете допомогти з підбором?',
    'Добридень. Потрібен плиточник із досвідом ванних кімнат і кухонних фартухів.',
    'Привіт! Цікавить майстер з електромонтажу на 2-3 тижні.',
    'Доброго дня! Потрібно кілька майстрів одразу: штукатурка, фарбування і підлога.',
  ],
  managerReply1: [
    'Вітаю! Так, маємо перевірених майстрів. Підберу профілі і надішлю сьогодні.',
    'Добрий день! Зрозуміло, підберемо майстра під ваш бюджет і терміни.',
    'Привіт! Є кілька спеціалістів саме під ваш запит. Готуємо рекомендації.',
    'Вітаю! Беремо в роботу, протягом дня надішлемо доступні варіанти.',
    'Добридень! Маємо майстрів із хорошими відгуками, зараз уточню деталі.',
  ],
  clientFollow: [
    'Дякую! Коли можна очікувати детальні анкети майстрів?',
    'Чудово, чекаємо на подробиці.',
    'Дякуємо. Для нас важливо, щоб майстер мав досвід схожих об\'єктів.',
    'Окей! Можемо почати з огляду об\'єкта і попереднього кошторису?',
    'Добре, також підкажіть, чи працюють майстри з власним інструментом?',
  ],
  managerReply2: [
    'Анкети майстрів уже сформовані, відкриваю вам доступ у системі.',
    'Зрозуміло! Є майстри з релевантним досвідом саме по вашому типу робіт.',
    'Так, є вільний майстер найближчим часом. Можемо одразу створити бронювання.',
    'Огляд об\'єкта можна запланувати одразу після підтвердження замовлення.',
    'Наш менеджер підготує деталі по кожному майстру окремо.',
  ],
  clientClosing: [
    'Відмінно, дякуємо за оперативність!',
    'Чекаємо. Якщо виникнуть питання — напишемо.',
    'Добре, будемо на зв\'язку.',
    'Дуже дякуємо, продовжимо в системі.',
    'Супер, тоді погоджуємо і переходимо до наступного кроку.',
  ],
}

const SALT = 10
const DEFAULT_PASSWORD = 'password123'

async function seed() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) throw new Error('MONGODB_URI is not set in .env')

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  await Promise.all([
    UserModel.deleteMany({}),
    CandidateModel.deleteMany({}),
    CompanyModel.deleteMany({}),
    PositionModel.deleteMany({}),
    CandidateBookingModel.deleteMany({}),
    ChatModel.deleteMany({}),
    ChatMessageModel.deleteMany({}),
    SkillModel.deleteMany({}),
  ])
  console.log('Cleared existing data')

  const skillDocs = await SkillModel.insertMany(
    ALL_SKILLS.map((name) => ({ name, nameLower: name.toLowerCase() })),
  )
  console.log(`Created ${skillDocs.length} skills`)

  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, SALT)

  const managers = await UserModel.insertMany([
    {
      fullName: 'Олег Василенко',
      email: 'manager1@demo.com',
      passwordHash,
      role: 'manager',
      isActive: true,
      lastLoginAt: daysAgo(1),
      refreshTokenHash: null,
    },
    {
      fullName: 'Наталія Романова',
      email: 'manager2@demo.com',
      passwordHash,
      role: 'manager',
      isActive: true,
      lastLoginAt: daysAgo(2),
      refreshTokenHash: null,
    },
  ])
  console.log(`Created ${managers.length} managers`)

  const clientData = [
    {
      fullName: 'Микола Захаренко',
      email: 'client1@demo.com',
      company: {
        name: 'Comfort Home Service',
        website: 'https://comfort-home.example',
        industry: 'Ремонт і будівництво',
        description: 'Комплексні ремонтні роботи квартир і приватних будинків.',
        technologies: ['Електрика', 'Сантехніка', 'Шпаклівка', 'Фарбування'],
        hiringNeeds: ['Електромонтажні роботи', 'Сантехнічні роботи'],
      },
    },
    {
      fullName: 'Юлія Примаченко',
      email: 'client2@demo.com',
      company: {
        name: 'Interior Art Group',
        website: 'https://interior-art.example',
        industry: 'Інтерʼєрні роботи',
        description: 'Дизайн і реалізація інтерʼєрних рішень для житла та офісів.',
        technologies: ['Штукатурка', 'Шпаклівка', 'Фарбування', 'Гіпсокартон'],
        hiringNeeds: ['Штукатурно-малярні роботи', 'Комплексний ремонт під ключ'],
      },
    },
    {
      fullName: 'Сергій Маринченко',
      email: 'client3@demo.com',
      company: {
        name: 'AquaHeat Pro',
        website: 'https://aquaheat.example',
        industry: 'Інженерні мережі',
        description: 'Монтаж, ремонт і обслуговування систем водопостачання та опалення.',
        technologies: ['Сантехніка', 'Вентиляція', 'Кондиціонування', 'Зварювання'],
        hiringNeeds: ['Сантехнічні роботи', 'Монтаж дверей і вікон'],
      },
    },
    {
      fullName: 'Оксана Гладченко',
      email: 'client4@demo.com',
      company: {
        name: 'Roof and Facade Team',
        website: 'https://roof-facade.example',
        industry: 'Покрівля та фасад',
        description: 'Роботи з покрівлею, утепленням та зовнішнім оздобленням фасадів.',
        technologies: ['Покрівельні роботи', 'Фасадні роботи', 'Утеплення', 'Бетонні роботи'],
        hiringNeeds: ['Покрівельні роботи', 'Фасадні роботи', 'Комплексний ремонт під ключ'],
      },
    },
    {
      fullName: 'Артем Дяченко',
      email: 'client5@demo.com',
      company: {
        name: 'Finish and Clean',
        website: 'https://finish-clean.example',
        industry: 'Сервіс для дому',
        description: 'Фінішні оздоблювальні роботи та професійний клінінг після ремонту.',
        technologies: ['Ламінат', 'Паркет', 'Монтаж меблів', 'Клінінг після ремонту'],
        hiringNeeds: ['Монтаж підлогових покриттів', 'Клінінг після ремонту', 'Комплексний ремонт під ключ'],
      },
    },
  ]

  const clients: mongoose.Document[] = []
  const companies: mongoose.Document[] = []

  for (const data of clientData) {
    const user = await UserModel.create({
      fullName: data.fullName,
      email: data.email,
      passwordHash,
      role: 'client',
      isActive: true,
      lastLoginAt: daysAgo(rand(1, 10)),
      refreshTokenHash: null,
    })

    const company = await CompanyModel.create({
      ...data.company,
      rentedSpecialists: rand(0, 4),
      ownerUserId: user._id,
      teamMemberIds: [],
    })

    user.companyId = String(company._id)
    user.companyProfile = {
      name: data.company.name,
      website: data.company.website,
      industry: data.company.industry,
      description: data.company.description,
      technologies: data.company.technologies,
      hiringNeeds: data.company.hiringNeeds,
      rentedSpecialists: company.rentedSpecialists,
    }
    await user.save()

    clients.push(user)
    companies.push(company)
  }
  console.log(`Created ${clients.length} clients and ${companies.length} companies`)

  const candidatePool: {
    fullName: string
    skills: string[]
    availability: 'available' | 'leased'
    availableFrom: Date
    availableTo?: Date
    isOpenEndedAvailability: boolean
  }[] = []

  const clusters = [
    ['Електрика', 'Монтаж розеток', 'Освітлення', 'Технагляд'],
    ['Сантехніка', 'Монтаж змішувачів', 'Пайка труб', 'Демонтаж'],
    ['Плитка', 'Гідроізоляція', 'Стяжка підлоги', 'Шпаклівка'],
    ['Штукатурка', 'Шпаклівка', 'Фарбування', 'Гіпсокартон'],
    ['Монтаж дверей', 'Монтаж вікон', 'Гіпсокартон', 'Утеплення'],
    ['Покрівельні роботи', 'Бетонні роботи', 'Утеплення', 'Фасадні роботи'],
    ['Фасадні роботи', 'Штукатурка', 'Фарбування', 'Ландшафтні роботи'],
    ['Мурування', 'Бетонні роботи', 'Стяжка підлоги', 'Демонтаж'],
    ['Ламінат', 'Паркет', 'Стяжка підлоги', 'Монтаж меблів'],
    ['Натяжні стелі', 'Освітлення', 'Електрика', 'Гіпсокартон'],
    ['Вентиляція', 'Кондиціонування', 'Зварювання', 'Технагляд'],
    ['Демонтаж', 'Клінінг після ремонту', 'Вивіз сміття', 'Технагляд'],
    ['Монтаж меблів', 'Збирання кухні', 'Монтаж дверей', 'Електрика'],
    ['Скляні перегородки', 'Монтаж вікон', 'Фарбування', 'Технагляд'],
    ['Бруківка', 'Ландшафтні роботи', 'Бетонні роботи', 'Мурування'],
    ['Комплексний ремонт', 'Електрика', 'Сантехніка', 'Плитка'],
    ['Комплексний ремонт', 'Штукатурка', 'Шпаклівка', 'Фарбування'],
    ['Комплексний ремонт', 'Гіпсокартон', 'Натяжні стелі', 'Освітлення'],
    ['Комплексний ремонт', 'Ламінат', 'Паркет', 'Монтаж меблів'],
    ['Комплексний ремонт', 'Монтаж дверей', 'Монтаж вікон', 'Утеплення'],
    ['Проєктування ремонту', 'Технагляд', 'Комплексний ремонт', 'Бетонні роботи'],
    ['Проєктування ремонту', 'Ландшафтні роботи', 'Бруківка', 'Фасадні роботи'],
    ['Сантехніка', 'Вентиляція', 'Кондиціонування', 'Зварювання'],
    ['Електрика', 'Освітлення', 'Натяжні стелі', 'Монтаж дверей'],
    ['Плитка', 'Гідроізоляція', 'Сантехніка', 'Клінінг після ремонту'],
    ['Фарбування', 'Шпаклівка', 'Штукатурка', 'Клінінг після ремонту'],
    ['Покрівельні роботи', 'Фасадні роботи', 'Утеплення', 'Мурування'],
    ['Бетонні роботи', 'Мурування', 'Стяжка підлоги', 'Бруківка'],
    ['Монтаж меблів', 'Збирання кухні', 'Ламінат', 'Паркет'],
    ['Комплексний ремонт', 'Проєктування ремонту', 'Технагляд', 'Клінінг після ремонту'],
  ]

  const usedNames = new Set<string>()
  for (let i = 0; i < clusters.length; i++) {
    let fullName = ''
    do {
      fullName = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`
    } while (usedNames.has(fullName))
    usedNames.add(fullName)

    const isLeased = Math.random() < 0.25
    const fromDaysAgo = rand(0, 30)
    const availableFrom = daysAgo(fromDaysAgo)
    const isOpenEnded = !isLeased && Math.random() < 0.4

    let availableTo: Date | undefined
    if (isLeased) {
      availableTo = daysFromNow(rand(14, 90))
    } else if (!isOpenEnded) {
      availableTo = daysFromNow(rand(30, 180))
    }

    const extras = pickN(
      ALL_SKILLS.filter((s) => !clusters[i].includes(s)),
      rand(0, 2),
    )

    candidatePool.push({
      fullName,
      skills: [...clusters[i], ...extras],
      availability: isLeased ? 'leased' : 'available',
      availableFrom,
      availableTo,
      isOpenEndedAvailability: isOpenEnded,
    })
  }

  const manager0Id = managers[0]._id
  const candidateDocs = await CandidateModel.insertMany(
    candidatePool.map((c) => ({ ...c, createdBy: manager0Id })),
  )
  console.log(`Created ${candidateDocs.length} candidates`)

  const positionDocs: mongoose.Document[] = []

  for (let ci = 0; ci < companies.length; ci++) {
    const company = companies[ci]
    const client = clients[ci]
    const techStack = company.technologies as string[]
    const needs = company.hiringNeeds as string[]

    for (let p = 0; p < needs.length; p++) {
      const title = needs[p] ?? pick(POSITION_TITLES)
      const seniority = pick(['junior', 'middle', 'senior'] as const)

      const closedPos = await PositionModel.create({
        title,
        seniority: 'middle',
        stack: pickN(techStack, Math.min(techStack.length, rand(2, 4))),
        neededFrom: daysAgo(rand(90, 180)),
        neededTo: daysAgo(rand(10, 40)),
        isOpenEndedTerm: false,
        status: 'closed',
        createdBy: managers[0]._id,
        companyId: company._id,
        assignedClient: client._id,
      })
      positionDocs.push(closedPos)

      const openPos = await PositionModel.create({
        title,
        seniority,
        stack: pickN(techStack, Math.min(techStack.length, rand(2, 4))),
        neededFrom: daysFromNow(rand(3, 14)),
        neededTo: isOpenEndedTitleCheck(title) ? undefined : daysFromNow(rand(60, 180)),
        isOpenEndedTerm: isOpenEndedTitleCheck(title),
        status: 'open',
        createdBy: managers[ci % managers.length]._id,
        companyId: company._id,
        assignedClient: client._id,
      })
      positionDocs.push(openPos)
    }
  }
  console.log(`Created ${positionDocs.length} positions`)

  const availableCandidates = candidateDocs.filter((c) => c.availability === 'available')
  const leasedCandidates = candidateDocs.filter((c) => c.availability === 'leased')

  let bookingCount = 0

  const closedPositions = positionDocs.filter((p) => p.status === 'closed')
  for (const pos of closedPositions) {
    const candidate = pick(availableCandidates)
    const from = daysAgo(rand(90, 120))
    const to = daysAgo(rand(10, 40))
    await CandidateBookingModel.create({
      candidateId: candidate._id,
      positionId: pos._id,
      requestedFrom: from,
      requestedTo: to,
      weeklyHours: pick([20, 30, 40]),
      status: 'completed',
      comment: 'Підтверджено клієнтом після технічного інтерв\'ю.',
      managerComment: 'Кандидат успішно пройшов випробувальний термін.',
      createdBy: pos.createdBy,
    })
    bookingCount++
  }

  const openPositions = positionDocs.filter((p) => p.status === 'open')
  for (const cand of leasedCandidates.slice(0, Math.min(leasedCandidates.length, 5))) {
    const pos = pick(openPositions)
    const from = daysAgo(rand(5, 20))
    const to = daysFromNow(rand(14, 60))
    await CandidateBookingModel.create({
      candidateId: cand._id,
      positionId: pos._id,
      requestedFrom: from,
      requestedTo: to,
      weeklyHours: pick([20, 40]),
      status: 'approved',
      comment: 'Клієнт підтвердив готовність розпочати.',
      managerComment: 'Схвалено після узгодження умов.',
      createdBy: pos.createdBy,
    })
    bookingCount++
  }

  for (const client of clients) {
    const pos = pick(openPositions)
    const candidate = pick(availableCandidates)
    await CandidateBookingModel.create({
      candidateId: candidate._id,
      positionId: pos._id,
      requestedFrom: daysFromNow(rand(7, 21)),
      requestedTo: daysFromNow(rand(30, 120)),
      weeklyHours: 40,
      status: 'new',
      comment: 'Зацікавлені в цьому спеціалісті для нашого проєкту.',
      createdBy: client._id,
    })
    bookingCount++
  }

  console.log(`Created ${bookingCount} bookings`)

  const manager0 = managers[0]
  const manager1 = managers[1]

  let chatMsgCount = 0
  for (const client of clients) {
    const chat = await ChatModel.create({ clientUserId: client._id })

    const msgs: { senderUserId: Types.ObjectId; senderRole: 'manager' | 'client'; text: string; createdAt: Date }[] = []
    const baseTime = daysAgo(rand(5, 20)).getTime()

    const clientOpen = pick(CHAT_MESSAGES_POOL.clientOpen)
    const mgrReply1 = pick(CHAT_MESSAGES_POOL.managerReply1)
    const clientFollow = pick(CHAT_MESSAGES_POOL.clientFollow)
    const mgrReply2 = pick(CHAT_MESSAGES_POOL.managerReply2)
    const clientClose = pick(CHAT_MESSAGES_POOL.clientClosing)

    msgs.push(
      { senderUserId: client._id as Types.ObjectId, senderRole: 'client', text: clientOpen, createdAt: new Date(baseTime) },
      { senderUserId: manager0._id as Types.ObjectId, senderRole: 'manager', text: mgrReply1, createdAt: new Date(baseTime + 3_600_000) },
      { senderUserId: client._id as Types.ObjectId, senderRole: 'client', text: clientFollow, createdAt: new Date(baseTime + 7_200_000) },
      { senderUserId: manager1._id as Types.ObjectId, senderRole: 'manager', text: mgrReply2, createdAt: new Date(baseTime + 10_800_000) },
      { senderUserId: client._id as Types.ObjectId, senderRole: 'client', text: clientClose, createdAt: new Date(baseTime + 14_400_000) },
    )

    for (const msg of msgs) {
      await ChatMessageModel.create({ chatId: chat._id, ...msg })
      chatMsgCount++
    }

    const lastMsg = msgs[msgs.length - 1]
    chat.lastMessageText = lastMsg.text
    chat.lastMessageAt = lastMsg.createdAt
    await chat.save()
  }
  console.log(`Created ${clients.length} chats and ${chatMsgCount} messages`)

  console.log('\n=== Seed complete ===')
  console.log(`  Skills:     ${skillDocs.length}`)
  console.log(`  Managers:   ${managers.length}`)
  console.log(`  Clients:    ${clients.length}`)
  console.log(`  Companies:  ${companies.length}`)
  console.log(`  Candidates: ${candidateDocs.length}`)
  console.log(`  Positions:  ${positionDocs.length}`)
  console.log(`  Bookings:   ${bookingCount}`)
  console.log(`  Chats:      ${clients.length}  (messages: ${chatMsgCount})`)
  console.log('\nDemo credentials (all passwords: password123):')
  console.log('  manager1@demo.com  — manager')
  console.log('  manager2@demo.com  — manager')
  console.log('  client1@demo.com   — client  (Finova Tech)')
  console.log('  client2@demo.com   — client  (EduStream)')
  console.log('  client3@demo.com   — client  (HealthBridge)')
  console.log('  client4@demo.com   — client  (ShipLogic)')
  console.log('  client5@demo.com   — client  (DataPulse)')

  await mongoose.disconnect()
}

function isOpenEndedTitleCheck(title: string) {
  return ['Комплексний ремонт під ключ', 'Фасадні роботи', 'Покрівельні роботи'].includes(title)
}

seed().catch((err: unknown) => {
  console.error(err)
  process.exit(1)
})

import 'dotenv/config'

import mongoose from 'mongoose'

import { ChatMessageModel } from './modules/chat/chat-message-schema.js'
import { ChatModel } from './modules/chat/chat-schema.js'

const CLIENT_MESSAGES = [
  'Доброго дня! Потрібен майстер на ремонтні роботи, які є варіанти?',
  'Дякую, цікавить досвід майстра на схожих об\'єктах.',
  'Чудово, можемо погодити зручну дату початку робіт?',
  'Підкажіть, будь ласка, орієнтовну тривалість та етапи робіт.',
  'Домовились, очікуємо підтвердження і стартуємо.',
]

const MANAGER_MESSAGES = [
  'Вітаю! Підберемо перевірених майстрів під ваш запит.',
  'Маємо релевантні анкети, надсилаю вам добірку.',
  'Так, організуємо огляд об\'єкта та підготуємо кошторис.',
  'Можемо забронювати майстра на найближчі вільні дати.',
  'Дякуємо, зафіксували запит, тримаємо вас у курсі по кожному етапу.',
]

const pickByRole = (role: 'client' | 'manager', index: number): string => {
  if (role === 'manager') {
    return MANAGER_MESSAGES[index % MANAGER_MESSAGES.length]
  }

  return CLIENT_MESSAGES[index % CLIENT_MESSAGES.length]
}

async function migrateChatDialogsToMasters() {
  const mongoUri = process.env.MONGODB_URI
  if (!mongoUri) {
    throw new Error('MONGODB_URI is not set in .env')
  }

  await mongoose.connect(mongoUri)
  console.log('Connected to MongoDB')

  const chats = await ChatModel.find().select('_id').lean()

  let updatedMessages = 0
  let touchedChats = 0

  for (const chat of chats) {
    const messages = await ChatMessageModel.find({ chatId: chat._id })
      .sort({ createdAt: 1, _id: 1 })
      .select('_id senderRole text createdAt')
      .lean()

    if (!messages.length) {
      continue
    }

    let clientIndex = 0
    let managerIndex = 0
    const bulkOps: Array<{
      updateOne: {
        filter: { _id: unknown }
        update: { $set: { text: string } }
      }
    }> = []

    for (const message of messages) {
      const role = message.senderRole === 'manager' ? 'manager' : 'client'
      const roleIndex = role === 'manager' ? managerIndex++ : clientIndex++
      const nextText = pickByRole(role, roleIndex)

      if (message.text !== nextText) {
        bulkOps.push({
          updateOne: {
            filter: { _id: message._id },
            update: { $set: { text: nextText } },
          },
        })
        updatedMessages += 1
      }
    }

    if (bulkOps.length > 0) {
      await ChatMessageModel.bulkWrite(bulkOps)
      touchedChats += 1
    }

    const lastMessage = messages[messages.length - 1]
    const role = lastMessage.senderRole === 'manager' ? 'manager' : 'client'
    const roleIndex =
      role === 'manager'
        ? (managerIndex > 0 ? managerIndex - 1 : 0)
        : (clientIndex > 0 ? clientIndex - 1 : 0)
    const nextLastText = pickByRole(role, roleIndex)

    await ChatModel.updateOne(
      { _id: chat._id },
      { $set: { lastMessageText: nextLastText, lastMessageAt: lastMessage.createdAt } },
    )
  }

  console.log('Chat dialog migration complete:')
  console.log(`  chats scanned: ${chats.length}`)
  console.log(`  chats updated: ${touchedChats}`)
  console.log(`  messages updated: ${updatedMessages}`)

  await mongoose.disconnect()
}

migrateChatDialogsToMasters().catch((error: unknown) => {
  console.error('Migration failed:', error)
  process.exit(1)
})
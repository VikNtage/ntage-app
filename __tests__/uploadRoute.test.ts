/**
 * __tests__/uploadRoute.test.ts
 * Интеграционный тест для POST /api/upload с моками OpenAI SDK
 */

import request from 'supertest'
import { createServer } from 'http'
import route from '../app/api/upload/route'  // скорректируйте путь, если у вас .ts-маршрут лежит иначе

// Мокаем официальный SDK OpenAI
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'Test Intro' } }]
        })
      }
    }
  }))
}))

describe('POST /api/upload', () => {
  let server: any

  beforeAll(() => {
    server = createServer((req, res) => route(req, res))
  })

  afterAll(() => {
    server.close()
  })

  it('должен возвращать 200 и сгенерированное интро', async () => {
    const csvRow = 'firstName,lastName,title,company\nJohn,Doe,CEO,Acme Corp'
    const response = await request(server)
      .post('/api/upload')
      .field('prompt', 'Base prompt')
      .attach('file', Buffer.from(csvRow), 'row.csv')

    expect(response.status).toBe(200)
    expect(response.text).toContain('Test Intro')
  })

  it('должен возвращать 400 при отсутствии файла', async () => {
    const response = await request(server)
      .post('/api/upload')
      .field('prompt', 'Anything')

    expect(response.status).toBe(400)
    expect(response.text).toMatch(/file/i)
  })
})


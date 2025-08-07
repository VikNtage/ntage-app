/**
 * __tests__/uploadRoute.test.ts
 * Интеграционный тест для POST /api/upload, адаптирован под App Router
 */

import { POST } from '../app/api/upload/route';
import { NextResponse } from 'next/server';

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
}));

describe('POST /api/upload', () => {
  it('должен возвращать 200 и сгенерированное интро CSV', async () => {
    // Подготавливаем «файл» и «prompt»
    const csvRow = 'firstName,lastName,title,company\nJohn,Doe,CEO,Acme Corp';
    const mockFile = { text: jest.fn().mockResolvedValue(csvRow) };
    const mockPrompt = 'Base prompt';
    const mockReq = {
      formData: jest.fn().mockResolvedValue({
        get: (key: string) => {
          if (key === 'file') return mockFile;
          if (key === 'prompt') return mockPrompt;
          return undefined;
        }
      })
    } as any;

    // Вызываем наш POST-хэндлер напрямую
    const response = await POST(mockReq);
    expect(response.status).toBe(200);

    const text = await response.text();
    // В CSV ожидаем нашу «Test Intro»
    expect(text).toContain('Test Intro');
  });

  it('должен возвращать 400 при отсутствии файла или prompt', async () => {
    const mockReq = {
      formData: jest.fn().mockResolvedValue({
        get: () => undefined
      })
    } as any;

    const response = await POST(mockReq);
    expect(response.status).toBe(400);

    const json = await response.json();
    expect(json).toEqual({ error: 'Missing file or prompt' });
  });
});


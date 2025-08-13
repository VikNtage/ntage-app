// app/api/generate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

type Row = unknown[]; // можешь описать точный тип строки вместо unknown[]

interface GeneratePayload {
  rows: Row[];
  systemPrompt?: string;
  customPrompt?: string; // используем, чтобы не было no-unused-vars
  model?: string;
  concurrency?: number;
}

async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;

  const poolSize = Math.min(Math.max(limit, 1), Math.max(1, items.length));
  const workers = new Array(poolSize).fill(0).map(async () => {
    for (; i < items.length; ) {
      const idx = i++;
      results[idx] = await worker(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
}

export async function POST(req: NextRequest) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  let payload: GeneratePayload;
  try {
    payload = (await req.json()) as GeneratePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    rows,
    systemPrompt = 'You are a helpful assistant.',
    customPrompt,
    model = 'gpt-4o-mini',
    concurrency = 5,
  } = payload;

  if (!Array.isArray(rows)) {
    return NextResponse.json({ error: '`rows` must be an array of rows' }, { status: 400 });
  }

  const buildMessages = (row: Row) => {
    const userContent = customPrompt
      ? `${customPrompt}\n\nRow: ${JSON.stringify(row)}`
      : `Given this row, produce a helpful output.\nRow: ${JSON.stringify(row)}`;

    return [
      { role: 'system' as const, content: systemPrompt },
      { role: 'user' as const, content: userContent },
    ];
  };

  const outputs = await withConcurrency<Row, string>(
    rows,
    Math.max(1, Math.min(concurrency, 10)),
    async (row) => {
      const completion = await client.chat.completions.create({
        model,
        messages: buildMessages(row),
        temperature: 0.2,
      });
      const text = completion.choices[0]?.message?.content ?? '';
      return typeof text === 'string' ? text : String(text);
    }
  );

  return NextResponse.json({ outputs });
}

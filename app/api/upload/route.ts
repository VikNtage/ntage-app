import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get('file') as File;

  if (!file) {
    return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
  }

  const text = await file.text();

  const messages = [
    {
      role: 'system',
      content: 'You are a senior B2B sales assistant helping personalize cold outreach.',
    },
    {
      role: 'user',
      content: `Here's the file data:\n\n${text}\n\nGenerate 3 personalized intro lines for each row.`,
    },
  ];

  const completion = await openai.chat.completions.create({
    model: 'gpt-4',
    messages,
    temperature: 0.7,
  });

  return NextResponse.json({ result: completion.choices[0].message.content });
}


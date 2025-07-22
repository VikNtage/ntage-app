import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const body = await req.json();

  const prospects = body.prospects;
  const customPrompt = body.prompt;

  if (!Array.isArray(prospects)) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  try {
    const responses = await Promise.all(
      prospects.map(async (prospect) => {
        const prompt = `
Given the following information:

Job Title: ${prospect['Title'] || 'Not specified'}
Company Name: ${prospect['Company Name'] || 'Not specified'}
Location: ${prospect['City/State'] || prospect['Country'] || 'Not specified'}
LinkedIn URL: ${prospect['Contact LinkedIn'] || 'Not specified'}
Additional Info: ${prospect['Additional Person Information'] || 'none'}

Write a concise, friendly and professional intro consisting of 2–3 sentences that follows immediately after "Hi ${prospect['First Name']},".

Avoid typical outreach clichés such as "I came across your profile" or "I'm reaching out because...". Highlight something uniquely interesting or impressive about the company or the person's role, based on provided details. Keep the tone genuine, fresh, and engaging, setting a positive foundation for the conversation.
        `.trim();

        const chatResponse = await openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }],
        });

        return {
          ...prospect,
          generated_intro: chatResponse.choices[0].message.content,
        };
      })
    );

    return NextResponse.json(responses);
  } catch (error: any) {
    console.error('Error generating intros:', error);
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 });
  }
}


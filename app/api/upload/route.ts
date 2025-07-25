import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file: File | null = formData.get("file") as unknown as File;
  const prompt = formData.get("prompt") as string;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const text = await file.text();
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
  });

  const results = [];

  for (const row of parsed.data as any[]) {
    const messages = [
      {
        role: "system",
        content: prompt,
      },
      {
        role: "user",
        content: JSON.stringify(row),
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: messages,
      temperature: 0.7,
    });

    const responseText = completion.choices[0]?.message?.content ?? "";
    results.push({ ...row, intro: responseText });
  }

  return NextResponse.json(results);
}

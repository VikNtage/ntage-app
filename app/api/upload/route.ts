import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const prompt = formData.get("prompt") as string;

  if (!file || !prompt) {
    return NextResponse.json({ error: "Missing file or prompt" }, { status: 400 });
  }

  const text = await file.text();
  const { data } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const results: { intro: string }[] = [];

  for (const row of data) {
    const finalPrompt = prompt.replace(/\{\{([^}]+)\}\}/g, (_, key) => row[key.trim()] || "");

    // Здесь используем единый тип для всех сообщений
    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: "You generate short, warm intro lines for cold outreach based on available lead data.",
      },
      {
        role: "user",
        content: finalPrompt,
      },
    ];

    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages,
      temperature: 0.7,
    });

    const intro = completion.choices[0].message.content || "";
    results.push({ intro });
  }

  const csv = Papa.unparse(results);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=intros.csv",
    },
  });
}

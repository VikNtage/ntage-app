/**
 * app/api/upload/route.ts
 * Оптимизированный вариант с батчингом запросов к OpenAI
 */

import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { OpenAI } from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

// Максимальное число параллельных запросов
const CONCURRENCY = parseInt(process.env.OPENAI_CONCURRENCY || "5", 10);

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
  const rows = [...data];

  // Обработка одной строки
  async function processRow(row: Record<string, string>) {
    const finalPrompt = prompt.replace(/\{\{([^}]+)\}\}/g, (_, key) =>
      row[key.trim()] || ""
    );

    const messages: ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          "You generate short, warm intro lines for cold outreach based on available lead data.",
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

    return { intro: completion.choices[0].message.content || "" };
  }

  // Батчим по CONCURRENCY штук
  while (rows.length) {
    const batch = rows.splice(0, CONCURRENCY);
    const promises = batch.map((row) => processRow(row));
    const chunkResults = await Promise.all(promises);
    results.push(...chunkResults);
  }

  const csv = Papa.unparse(results);
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=intros.csv",
    },
  });
}


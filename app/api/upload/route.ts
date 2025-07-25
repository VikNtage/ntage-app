import { NextRequest, NextResponse } from "next/server";
import { Configuration, OpenAIApi } from "openai";
import Papa from "papaparse";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const prompt = formData.get("prompt") as string;

  const text = await file.text();
  const parsed = Papa.parse(text, { header: true });

  const intros = await Promise.all(
    parsed.data.map(async (row: any) => {
      const messages = [
        {
          role: "user",
          content: `Prompt: ${prompt}\n\nData: ${JSON.stringify(row)}`,
        },
      ] as const;

      const completion = await openai.createChatCompletion({
        model: "gpt-4",
        messages: messages,
        temperature: 0.7,
      });

      return completion.data.choices[0].message?.content;
    })
  );

  const resultCSV = Papa.unparse(
    parsed.data.map((row: any, i: number) => ({
      ...row,
      intro: intros[i],
    }))
  );

  return new NextResponse(resultCSV, {
    headers: {
      "Content-Type": "text/csv",
    },
  });
}

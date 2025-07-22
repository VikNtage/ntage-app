import OpenAI from 'openai'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req) {
  const { prompt, data } = await req.json()

  const formattedData = data.map(
    (item, idx) =>
      `${idx + 1}. Job Title: ${item.title}, Name: ${item.firstName} ${item.lastName}, Company: ${item.company}`
  ).join('\n')

  const fullPrompt = `${prompt}\n\nHere are prospects:\n${formattedData}\n\nWrite the intros:`

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: fullPrompt }],
    })

    return Response.json({ intro: completion.choices[0].message.content })
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}


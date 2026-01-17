import { Groq } from 'groq-sdk';

export const runtime = 'nodejs';

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "API Key missing" }, { status: 500 });
  }

  try {
    const { prompt } = await request.json();

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_completion_tokens: 150,
        response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    const jsonResponse = JSON.parse(responseContent);

    return Response.json(jsonResponse);

  } catch (error) {
    console.error("Coach Feedback API Error", error);
    return Response.json({ 
        message: "¡Entrenamiento registrado! Sigue constante.", 
        rating: 4 
    });
  }
}

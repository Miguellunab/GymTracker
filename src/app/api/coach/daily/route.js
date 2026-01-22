import { Groq } from 'groq-sdk';
import { getPrisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

export const runtime = 'nodejs';

function getMode(request) {
  // Check if cookies exists on the request
  if (!request.cookies) {
    return 'main';
  }
  return request.cookies.get('app_mode')?.value ?? 'main';
}

export async function GET(request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "API Key missing" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get('date');
  
  // Use provided date or default to today
  // Important: The "Reference Today" for the coach is the selected date in the UI
  const referenceDate = dateParam ? new Date(dateParam) : new Date();
  
  try {
    const prisma = getPrisma(getMode(request));
    
    // 1. Get recent history (last 10 days RELATIVE TO REFERENCE DATE)
    const start10 = new Date(referenceDate);
    start10.setDate(start10.getDate() - 10);
    
    const recentSessions = await prisma.workoutSession.findMany({
        where: { 
            date: { 
                gte: start10,
                lte: referenceDate // Don't look into the future relative to the selected date
            } 
        },
        orderBy: { date: 'desc' },
        select: { date: true, routineName: true, durationSeconds: true }
    });

    // 2. Logic Analysis (Pre-LLM)
    const refDateStr = referenceDate.toISOString().slice(0, 10);
    
    // Check if user already trained on the REFERENCE DATE
    // We check the first session because of 'desc' order
    if (recentSessions.length > 0) {
        const lastSessionDate = new Date(recentSessions[0].date).toISOString().slice(0, 10);
        
        if (lastSessionDate === refDateStr) {
             return Response.json({ 
                 message: "Ya hay un registro para este día. ¡Buen trabajo!",
                 action: "Recuperación"
             });
        }
    }

    // 3. Construct Prompt for Coach
    const historyText = recentSessions.map(s => 
        `- ${new Date(s.date).toISOString().slice(0,10)}: ${s.routineName}`
    ).join('\n');

    const prompt = `
        Eres un Coach de Gym experto. Analiza el historial reciente de tu atleta y dale UN consejo para la fecha objetivo: ${refDateStr}.
        
        Historial (últimos 10 días previos a la fecha):
        ${historyText || "No hay entrenamientos recientes."}
        
        Reglas:
        1. Si entrenó más de 3 días seguidos recientemente, sugiere descanso activo o ligero.
        2. Si no ha entrenado en 3+ días, motívalo a volver suave.
        3. Si el día anterior hizo Pecho/Espalda, sugiere Pierna o Descanso.
        4. Si el día anterior hizo Pierna, sugiere Torso o Descanso.
        5. Sé breve (máximo 2 frases).
        6. Tu respuesta debe ser JSON puro con este formato: { "message": "tu consejo", "action": "acción clave corta" }
    `;

    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    const jsonResponse = JSON.parse(responseContent);

    return Response.json(jsonResponse);

  } catch (error) {
    console.error("Coach API Error", error);
    return Response.json({ 
        message: "Hoy es un gran día para moverte. ¡Escucha a tu cuerpo!", 
        action: "Entrenar" 
    });
  }
}

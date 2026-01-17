import { Groq } from 'groq-sdk';
import { getPrisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function getMode(request) {
  return request.cookies?.get('app_mode')?.value ?? 'main';
}

export async function POST(request) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json({ message: "API Key missing" }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { routineName, exercises, cardio, userFeedback } = body;
    const prisma = getPrisma(getMode(request));
    
    // Get user weight for calculations
    const weightLog = await prisma.weightLog.findFirst({
        orderBy: { date: 'desc' }
    });
    const userWeight = weightLog?.weight || 75; // Default 75kg

    const groq = new Groq({ apiKey });
    
    const systemPrompt = `
      Eres un experto fisiólogo deportivo y entrenador de alto rendimiento.
      Tu tarea es calcular con la mayor precisión posible el gasto calórico de una sesión de entrenamiento 
      basado en los datos proporcionados y el feedback subjetivo del atleta.
      
      Datos del atleta:
      - Peso corporal: ${userWeight} kg
      
      Entrenamiento realizado:
      - Rutina: ${routineName}
      - Ejercicios de pesas: ${JSON.stringify(exercises)}
      - Cardio: ${JSON.stringify(cardio)}
      - Feedback subjetivo: "${userFeedback}"
      
      Instrucciones:
      1. Analiza el volumen de entrenamiento (series x reps x peso).
      2. Evalúa la intensidad basada en el RIR y el feedback del usuario.
      3. Calcula las calorías quemadas en el levantamiento de pesas (METs estimados variables según intensidad).
      4. Calcula las calorías de cardio si existe.
      5. Suma todo para un total preciso.
      6. Genera un JSON con los resultados.
      
      IMPORTANTE: Se realista. Una sesión de pesas promedio quema entre 3-6 kcal/minuto. Solo muy alta intensidad llega a más.
      
      Responde SOLO con un JSON válido con este formato:
      {
        "totalCalories": number (entero),
        "durationSeconds": number (estimado total en segundos, asume 3-4 min por serie si no se especifica, más cardio),
        "analysis": "Breve explicación de 1 frase de por qué este gasto calórico",
        "intensityScore": number (1-10)
      }
    `;

    const completion = await groq.chat.completions.create({
        messages: [{ role: 'system', content: systemPrompt }],
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_completion_tokens: 500,
        response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    const result = JSON.parse(responseContent);

    return Response.json(result);

  } catch (error) {
    console.error("Analysis Error", error);
    return Response.json({ 
        totalCalories: 300, 
        durationSeconds: 3600,
        analysis: "Error en cálculo, usando estimación base.",
        intensityScore: 5
    }, { status: 500 });
  }
}

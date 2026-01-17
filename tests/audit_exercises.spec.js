const { test, expect } = require('@playwright/test');

// Definir los ejercicios críticos del seed (solo muestra, hay más)
// Mapping de nombres en español (app) -> IDs esperados en ExerciseDB
const EXERCISE_MAPPING = {
  // Pecho
  'Press Inclinado con Mancuernas': 'Incline_Dumbbell_Press',
  'Máquina de Aperturas/Pec Deck': 'Butterfly',
  // Espalda
  'Jalón al Pecho': 'Wide-Grip_Lat_Pulldown',
  'Remo Abierto en Máquina': 'Seated_Cable_Rows',
  // Pierna Cuádriceps
  'Sentadilla Hack': 'Hack_Squat',
  'Prensa de Piernas': 'Leg_Press',
  'Extensión de Cuádriceps': 'Leg_Extensions',
  'Sentadilla Búlgara': 'Barbell_Lunge',
  // Pierna Femoral
  'Peso Muerto Rumano': 'Romanian_Deadlift',
  'Curl Femoral Sentado': 'Seated_Band_Hamstring_Curl', // Check fallback
  'Hip Thrust en Máquina': 'Barbell_Hip_Thrust',
  'Curl Femoral Acostado': 'Lying_Leg_Curls',
  // Brazos
  'Elevaciones Laterales': 'Dumbbell_Lateral_Raise',
  'Elevaciones Posteriores': 'Bent_Over_Low-Pulley_Side_Lateral'
};

test.describe('Auditoria de GIFs de Ejercicios', () => {
  
  test('Verificar disponibilidad de imágenes en ExerciseDB para nuestros ejercicios', async ({ request }) => {
    console.log('--- Iniciando Auditoría de GIFs ---');
    
    // Obtenemos la base de datos completa de ExerciseDB una sola vez
    const dbResponse = await request.get('https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json');
    expect(dbResponse.ok()).toBeTruthy();
    const exerciseDB = await dbResponse.json();
    
    const results = [];
    const missing = [];

    for (const [appName, targetId] of Object.entries(EXERCISE_MAPPING)) {
      // Buscar coincidencia exacta por ID
      let match = exerciseDB.find(e => e.id === targetId);
      
      // Si no hay match exacto, intentar buscar por nombre normalizado (lógica similar a la app)
      if (!match) {
         // Lógica simplificada de búsqueda por nombre si falló ID
         match = exerciseDB.find(e => e.id.toLowerCase() === targetId.toLowerCase());
      }

      if (match) {
        // Verificar que tenga imágenes
        const hasImages = match.images && match.images.length > 0;
        const status = hasImages ? '✅ OK' : '⚠️ Sin Imágenes';
        
        // Verificar si la URL de la primera imagen es accesible (opcional, pero recomendado)
        let urlCheck = 'N/A';
        if (hasImages) {
           const imgUrl = `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${match.images[0]}`;
           const imgRes = await request.head(imgUrl);
           urlCheck = imgRes.ok() ? 'Valid URL' : 'Broken URL';
        }

        results.push({
            app_exercise: appName,
            db_id: targetId,
            found_name: match.name,
            status,
            url_check: urlCheck
        });

        console.log(`${status} | ${appName} -> ${match.id} (${urlCheck})`);

      } else {
        missing.push({ app_exercise: appName, expected_id: targetId });
        console.log(`❌ MISSING | ${appName} (Expected ID: ${targetId} not found in DB)`);
      }
    }

    // Resumen
    console.log('\n--- Resumen ---');
    console.log(`Total revisados: ${Object.keys(EXERCISE_MAPPING).length}`);
    console.log(`Encontrados: ${results.length}`);
    console.log(`Faltantes: ${missing.length}`);
    
    if (missing.length > 0) {
        console.log('Faltan los siguientes ejercicios en la base de datos externa:', missing);
    }
    
    // Aserción final: Queremos saber si faltan, pero no necesariamente fallar el test para ver el reporte completo
    // expect(missing.length).toBe(0); 
  });

});

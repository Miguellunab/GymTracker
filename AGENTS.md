# Agentes de IA en GymTracker

GymTracker incorpora agentes inteligentes potenciados por LLMs (Large Language Models) utilizando la API de Groq para ofrecer una experiencia de entrenamiento personalizada.

## 🤖 Coach Personal (In-App)

El sistema principal de IA funciona como un entrenador personal integrado directamente en la interfaz de usuario.

### Capacidades
1. **Coach Diario (`DailyCoachTip`)**:
   - Analiza tu historial de los últimos 10 días.
   - Detecta patrones (días consecutivos, falta de entreno, grupos musculares repetidos).
   - Genera un consejo proactivo al abrir el dashboard (ej: "Hoy toca pierna" o "Descansa, llevas 4 días seguidos").
   - **Nota:** Si entrenas hoy, el consejo se actualiza automáticamente a "Recuperación" en tu próxima visita.

2. **Feedback Post-Entrenamiento (`PostWorkoutFeedback`)**:
   - Se activa al guardar una rutina.
   - Evalúa la intensidad basada en duración y calorías quemadas.
   - Proporciona retroalimentación inmediata (felicitación o corrección suave) y una calificación de estrellas.

3. **Chat Interactivo (`AICoachShell`)**:
   - Interfaz conversacional tipo chat.
   - Mantiene contexto de tus últimos entrenamientos, calendario de 60 días y récords personales.
   - Responde preguntas específicas sobre tu progreso o planificación.

### Arquitectura Técnica
- **Frontend**: Componentes React (`DailyCoachTip.jsx`, `PostWorkoutFeedback.jsx`, `AICoachShell.jsx`) que gestionan la UI y el estado de carga.
- **Backend**: API Routes de Next.js (`/api/coach/*`) que actúan como proxy seguro hacia Groq.
- **Modelos**: Utiliza modelos eficientes como `llama-3.3-70b-versatile` o `moonshotai/kimi-k2-instruct` para respuestas rápidas y naturales en español.
- **Contexto**: Se inyectan datos de Prisma (sesiones, pesos, ejercicios) en el prompt del sistema para "grounding" (evitar alucinaciones sobre el historial del usuario).

---

## 🛠️ Agente CLI (Experimental)

Ubicado en la carpeta `agent/`, existe un prototipo de agente de línea de comandos escrito en TypeScript.

- **Propósito**: Herramienta de desarrollo o administración para interactuar con la lógica del gimnasio desde la terminal.
- **Estado**: Experimental / Prototipo.
- **Ejecución**: `npx tsx agent/agent.ts` (requiere variables de entorno configuradas).

## 🔮 Futuro

- **Planificación Semanal**: Agente capaz de generar rutinas completas para la semana basada en objetivos.
- **Análisis de Técnica**: (A largo plazo) Análisis de video o input de usuario más detallado sobre la ejecución.
- **Integración con Wearables**: Ingesta de datos de salud para ajustar recomendaciones de descanso.

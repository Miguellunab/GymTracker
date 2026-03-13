# Agentes de IA en GymTracker

GymTracker incorpora agentes inteligentes potenciados por Kimi K2.5 (via NVIDIA NIM) para ofrecer una experiencia de entrenamiento personalizada.

## Coach Personal (In-App)

El sistema principal de IA funciona como un entrenador personal integrado directamente en la interfaz.

### Capacidades
1. **Coach Diario**: Consejo proactivo en el home basado en entrenamientos recientes y reportes semanales.
2. **Análisis de Entrenamiento**: Interpreta ejercicios con texto libre, calcula calorías, genera RIR estimado y fatiga.
3. **Chat Interactivo (`AICoachShell`)**: Interfaz conversacional con contexto de entrenamientos, puede modificar sesiones (UPDATE_SESSION, DELETE_SESSION).
4. **Reportes**: Generación automática de reportes diarios y semanales para mantener contexto eficiente.

### Arquitectura Técnica
- **Frontend**: Componentes React (`AICoachShell.jsx`, `AICoachTrigger.jsx`) + páginas con Framer Motion.
- **Backend**: API Routes de Next.js (`/api/coach/*`, `/api/reports/*`) como proxy hacia NVIDIA NIM.
- **Modelos**: Groq para coach/tips con Llama y SambaNova para análisis con DeepSeek R1.
- **Contexto**: Reporte semanal actual + anterior (no historial completo) inyectado via `buildReportContext()`.
- **Cliente centralizado**: `src/lib/nvidia-nim.js` con funciones `chat()`, `chatJSON()`, `buildReportContext()`.

## Bot de Telegram

- Coach diario via Telegram con tips matutinos.
- Auto-eliminación de mensajes >24h.
- Tracking de mensajes enviados en DB (`TelegramMessage` model).
- Tono más insistente si el usuario lleva días sin entrenar.

## Stack
- NVIDIA NIM API (Kimi K2.5)
- PostgreSQL (Neon) + Prisma
- Next.js 14 (App Router)
- Framer Motion para animaciones
- PWA con service worker

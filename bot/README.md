# Bot de Telegram - GymTracker

Bot de Telegram para registrar entrenamientos, usar timer de descanso y hablar con el Coach AI.

## Características

### Timer de Descanso (Permanente)
- Botones siempre visibles: 3min, 4min, 5min
- Countdown con actualización cada 30 segundos
- Notificación sonora al terminar
- Opción de cancelar timer activo

### Registro de Entrenamiento
- **Flujo Guiado**: Selección de rutina → ejercicios → series/reps/peso → cardio
- **Texto Libre**: Escribe tu entrenamiento y la IA lo interpreta
  - Ejemplo: "Hice press banca 80x10, 80x8. Remo 70x12. 20 min cardio"

### Otras Funcionalidades
- Registrar peso corporal
- Ver historial de entrenamientos
- Calendario mensual visual
- Marcar día como descanso
- Chat con Coach AI
- Consejo diario automático (7am)

## Configuración

### 1. Variables de Entorno

Agregar a `.env` y Vercel:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=tu_bot_token_de_botfather
TELEGRAM_OWNER_CHAT_ID=tu_chat_id
TELEGRAM_WEBHOOK_SECRET=un_string_aleatorio_seguro

# Para cron job (opcional, Vercel lo genera)
CRON_SECRET=otro_string_aleatorio
```

### 2. Obtener tu Chat ID

1. Inicia el bot en Telegram: [@Gym522_Timer_bot](https://t.me/Gym522_Timer_bot)
2. Envía `/start`
3. El bot te mostrará tu Chat ID
4. Copia ese ID a `TELEGRAM_OWNER_CHAT_ID`

### 3. Configurar Webhook

Después de desplegar en Vercel, ejecuta:

```bash
# Reemplaza con tu URL de Vercel y secret
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tu-app.vercel.app/api/telegram&secret_token=<WEBHOOK_SECRET>"
```

O visita en el navegador:
```
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tu-app.vercel.app/api/telegram?secret=<WEBHOOK_SECRET>
```

### 4. Verificar Webhook

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

## Comandos

| Comando | Descripción |
|---------|-------------|
| `/start` | Iniciar el bot y ver tu Chat ID |
| `/help` | Ver ayuda y comandos |
| `/workout` | Registrar entrenamiento (flujo guiado) |
| `/peso` | Registrar peso corporal |
| `/historial` | Ver últimos 7 entrenamientos |
| `/calendario` | Ver calendario del mes |
| `/consejo` | Consejo del día del Coach |
| `/coach` | Iniciar chat con el Coach AI |
| `/cancelar` | Cancelar operación actual |

## Teclado Permanente

```
┌──────────┬──────────┬──────────┐
│  ⏱️ 3min │  ⏱️ 4min │  ⏱️ 5min │
├──────────┴──────────┴──────────┤
│        🏋️ Workout              │
├─────────────┬──────────────────┤
│ 📊 Historial │  📅 Calendario   │
├─────────────┼──────────────────┤
│  ⚖️ Peso    │   🤖 Coach AI    │
├─────────────┴──────────────────┤
│        😴 Descanso              │
└─────────────────────────────────┘
```

## Arquitectura

```
bot/
├── lib/
│   ├── telegram.js         # Cliente API de Telegram
│   ├── constants.js        # Mensajes y configuración
│   ├── state.js            # Estado conversacional
│   ├── handlers/
│   │   ├── index.js        # Router principal
│   │   ├── commands.js     # Comandos /xxx
│   │   ├── callbacks.js    # Botones inline
│   │   ├── messages.js     # Texto libre
│   │   └── timer.js        # Lógica del timer
│   ├── services/
│   │   ├── workout.js      # CRUD de entrenamientos
│   │   ├── weight.js       # Registro de peso
│   │   ├── calendar.js     # Calendario
│   │   ├── coach.js        # IA con Groq
│   │   └── routines.js     # Rutinas y ejercicios
│   └── keyboards/
│       ├── main.js         # Teclado permanente
│       └── inline.js       # Botones inline

src/app/api/
├── telegram/route.js       # Webhook del bot
└── telegram-cron/route.js  # Notificación matutina
```

## Seguridad

- Solo el `TELEGRAM_OWNER_CHAT_ID` puede usar el bot
- Webhook protegido con `TELEGRAM_WEBHOOK_SECRET`
- Cron job protegido con `CRON_SECRET` (generado por Vercel)

## Desarrollo Local

1. Instalar ngrok: `npm install -g ngrok`
2. Correr la app: `npm run dev`
3. Exponer con ngrok: `ngrok http 3000`
4. Configurar webhook con URL de ngrok

## Notas Técnicas

- El estado conversacional se almacena en memoria (se pierde en cold starts)
- Para producción con alta frecuencia, considerar Redis/Upstash
- Los timers también están en memoria, funcionan bien para uso normal
- El bot usa el mismo Prisma client que la web app

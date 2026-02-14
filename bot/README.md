# Bot de Telegram - GymTracker

Bot de Telegram para registrar entrenamientos con texto libre y hablar con el Coach AI (Kimi K2.5 via NVIDIA NIM).

## Características

### Registro de Entrenamiento (Texto Libre)
- Escribe `/workout` y describe tu entreno en texto libre
- La IA interpreta ejercicios, peso, series, reps, cardio, duración y cómo te sentiste
- Genera NIT rating y nivel de fatiga automáticamente
- También detecta entrenamientos escritos directamente en el chat (sin comando)
- Ejemplo: "Pecho/Espalda. Press banca 80kg 3x10, remo barra 70kg 3x12. Caminadora 15 min. Total 65 min. Me sentí fuerte."

### Otras Funcionalidades
- Registrar peso corporal
- Ver historial de entrenamientos
- Calendario mensual visual
- Marcar día como descanso
- Chat con Coach AI (puede modificar/eliminar entrenamientos)
- Consejo diario automático (7am) con tono adaptativo
- Auto-eliminación de mensajes del bot >24h

## Configuración

### 1. Variables de Entorno

Agregar a `.env` y Vercel:

```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=tu_bot_token_de_botfather
TELEGRAM_OWNER_CHAT_ID=tu_chat_id
TELEGRAM_WEBHOOK_SECRET=un_string_aleatorio_seguro

# AI (NVIDIA NIM - Kimi K2.5)
NVIDIA_API_KEY=tu_api_key_nvidia

# Para cron job (opcional, Vercel lo genera)
CRON_SECRET=otro_string_aleatorio
```

### 2. Obtener tu Chat ID

1. Inicia el bot en Telegram
2. Envía `/start`
3. El bot te mostrará tu Chat ID
4. Copia ese ID a `TELEGRAM_OWNER_CHAT_ID`

### 3. Configurar Webhook

Después de desplegar en Vercel:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://tu-app.vercel.app/api/telegram&secret_token=<WEBHOOK_SECRET>"
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
| `/workout` | Registrar entrenamiento (texto libre) |
| `/peso` | Registrar peso corporal |
| `/historial` | Ver últimos 7 entrenamientos |
| `/calendario` | Ver calendario del mes |
| `/consejo` | Consejo del día del Coach |
| `/coach` | Iniciar chat con el Coach AI |
| `/cancelar` | Cancelar operación actual |

## Teclado Permanente

```
┌──────────────┬──────────────┐
│ 🏋️ Workout   │ 📊 Historial │
├──────────────┼──────────────┤
│  ⚖️ Peso     │  🤖 Coach AI │
├──────────────┼──────────────┤
│ 📅 Calendario │ 😴 Descanso  │
└──────────────┴──────────────┘
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
│   │   └── messages.js     # Texto libre
│   ├── services/
│   │   ├── workout.js      # CRUD de entrenamientos
│   │   ├── weight.js       # Registro de peso
│   │   ├── calendar.js     # Calendario
│   │   └── coach.js        # IA con NVIDIA NIM (Kimi K2.5)
│   └── keyboards/
│       ├── main.js         # Teclado permanente
│       └── inline.js       # Botones inline

src/
├── lib/
│   ├── nvidia-nim.js       # Cliente centralizado NVIDIA NIM
│   └── prisma.js           # Cliente Prisma
├── app/api/
│   ├── telegram/route.js       # Webhook del bot
│   └── telegram-cron/route.js  # Tip matutino + limpieza mensajes
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
- Los mensajes enviados se rastrean en DB (`TelegramMessage`) para auto-eliminación
- El bot usa el mismo Prisma client y NVIDIA NIM client que la web app
- El Coach AI tiene permisos UPDATE_SESSION y DELETE_SESSION sobre entrenamientos

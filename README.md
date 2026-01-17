# GymTracker

Una PWA (Progressive Web App) avanzada para seguimiento de entrenamientos, construida con Next.js y potenciada con un Coach de IA.

## Características Principales

*   **Registro de Entrenamiento:** Anota series, repeticiones, peso y RPE con precisión.
*   **Sobrecarga Progresiva:** Visualiza tu historial anterior en cada ejercicio mientras entrenas.
*   **Modo PWA:** Instálala en tu móvil (iOS/Android) para una experiencia nativa sin barra de navegador.
*   **Coach IA Inteligente:**
    *   **Consejos Diarios:** Recomendaciones basadas en tu frecuencia reciente (ej. sugiere descanso si llevas 3 días seguidos).
    *   **Chat en Vivo:** Pregunta dudas o pide motivación al botón flotante del Coach.
    *   **Feedback Post-Entreno:** Análisis instantáneo de intensidad y calorías al terminar tu sesión.

## Configuración del Entorno

1.  Clona el repositorio.
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Crea un archivo `.env` en la raíz con tus credenciales:
    ```env
    DATABASE_URL="postgresql://..."  # Tu conexión a BD (o file:./dev.db para SQLite)
    GROQ_API_KEY="gsk_..."        # Requerido para las funciones de IA
    ```
4.  Inicializa la base de datos:
    ```bash
    npx prisma migrate dev
    npx prisma db seed  # Carga los ejercicios y rutinas base
    ```

## Ejecución

*   **Desarrollo:**
    ```bash
    npm run dev
    ```
    Abre [http://localhost:3000](http://localhost:3000).

*   **Agente CLI (Experimental):**
    Herramienta de terminal para probar prompts sin la interfaz web.
    ```bash
    cd agent
    npm install
    npx tsx agent.ts
    ```

## Tests

Para verificar que el sistema de IA y los ejercicios funcionan correctamente:
```bash
npx playwright test
```

"""
Ejemplo rapido: una sola pregunta a Kimi K2.5 y salir.
Ideal para probar que la API funciona.

Uso:
  python ejemplo_rapido.py
  python ejemplo_rapido.py "tu pregunta aqui"
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI

# ── Configuracion ──────────────────────────────────────────────
load_dotenv()

API_KEY = os.getenv("NVIDIA_API_KEY")
if not API_KEY:
    print("ERROR: No se encontro NVIDIA_API_KEY en .env")
    print("Asegurate de tener un archivo .env con: NVIDIA_API_KEY=tu-key-aqui")
    sys.exit(1)

client = OpenAI(
    base_url="https://integrate.api.nvidia.com/v1",
    api_key=API_KEY,
)

# ── Pregunta ───────────────────────────────────────────────────
if len(sys.argv) > 1:
    pregunta = " ".join(sys.argv[1:])
else:
    pregunta = "Hola, presentate brevemente y dime que puedes hacer."

print(f"\n{'='*60}")
print(f"  MODELO  : moonshotai/kimi-k2.5")
print(f"  PREGUNTA: {pregunta}")
print(f"{'='*60}\n")

# ── Llamada a la API con streaming ─────────────────────────────
try:
    stream = client.chat.completions.create(
        model="moonshotai/kimi-k2.5",
        messages=[
            {
                "role": "system",
                "content": "Eres un asistente util. Responde en el idioma del usuario.",
            },
            {"role": "user", "content": pregunta},
        ],
        temperature=0.7,
        max_tokens=1024,
        stream=True,
    )

    print("RESPUESTA:")
    print("-" * 60)
    for chunk in stream:
        if chunk.choices[0].delta.content:
            print(chunk.choices[0].delta.content, end="", flush=True)
    print(f"\n{'-'*60}")
    print("\n[OK] Conexion exitosa con NVIDIA NIM API\n")

except Exception as e:
    print(f"\n[ERROR] {e}\n")
    sys.exit(1)

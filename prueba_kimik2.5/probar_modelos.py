"""
Prueba rapida de multiples modelos gratuitos de NVIDIA NIM.
Envia la misma pregunta a varios modelos y compara respuestas.

Uso: python probar_modelos.py
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

# ── Configuracion ──────────────────────────────────────────────
load_dotenv()

API_KEY = os.getenv("NVIDIA_API_KEY")
if not API_KEY:
    print("ERROR: No se encontro NVIDIA_API_KEY en .env")
    sys.exit(1)

BASE_URL = "https://integrate.api.nvidia.com/v1"
client = OpenAI(base_url=BASE_URL, api_key=API_KEY)
console = Console()

# ── Modelos a probar ───────────────────────────────────────────
MODELOS = [
    {"id": "moonshotai/kimi-k2.5",                   "nombre": "Kimi K2.5"},
    {"id": "moonshotai/kimi-k2-instruct",             "nombre": "Kimi K2 Instruct"},
    {"id": "deepseek-ai/deepseek-r1-distill-qwen-32b","nombre": "DeepSeek R1 Distill 32B"},
    {"id": "meta/llama-3.3-70b-instruct",             "nombre": "Llama 3.3 70B"},
    {"id": "google/gemma-3-27b-it",                   "nombre": "Gemma 3 27B"},
    {"id": "qwen/qwen3-235b-a22b",                    "nombre": "Qwen 3 235B"},
    {"id": "mistralai/mistral-small-24b-instruct",    "nombre": "Mistral Small 24B"},
    {"id": "nvidia/llama-3.1-nemotron-ultra-253b-v1", "nombre": "Nemotron Ultra 253B"},
]

PREGUNTA_DEFAULT = "Explica en 2 oraciones que es la inteligencia artificial."


def probar_modelo(model_id: str, pregunta: str) -> str:
    """Envia una pregunta a un modelo y retorna la respuesta."""
    try:
        response = client.chat.completions.create(
            model=model_id,
            messages=[
                {"role": "system", "content": "Responde de forma breve y clara en espanol."},
                {"role": "user", "content": pregunta},
            ],
            temperature=0.7,
            max_tokens=300,
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        return f"[ERROR] {e}"


def main():
    console.print(
        Panel(
            "[bold green]Probador de Modelos NVIDIA NIM[/bold green]\n"
            "[dim]Compara respuestas de multiples modelos gratis[/dim]",
            border_style="green",
        )
    )

    console.print(f"\n[bold]Pregunta default:[/bold] {PREGUNTA_DEFAULT}")
    console.print("[dim]Presiona Enter para usar la default, o escribe tu pregunta:[/dim]")
    entrada = input("> ").strip()
    pregunta = entrada if entrada else PREGUNTA_DEFAULT

    console.print(f"\n[bold cyan]Pregunta:[/bold cyan] {pregunta}\n")
    console.print("[dim]Probando modelos... esto puede tomar un momento.\n[/dim]")

    resultados = []
    for modelo in MODELOS:
        nombre = modelo["nombre"]
        model_id = modelo["id"]
        console.print(f"  [yellow]>>>[/yellow] Probando [bold]{nombre}[/bold]...", end=" ")

        respuesta = probar_modelo(model_id, pregunta)
        resultados.append((nombre, respuesta))

        # Mostrar check o X
        if respuesta.startswith("[ERROR]"):
            console.print("[red]FALLO[/red]")
        else:
            console.print("[green]OK[/green]")

    # ── Mostrar resultados ─────────────────────────────────────
    console.print("\n")
    for nombre, respuesta in resultados:
        color = "red" if respuesta.startswith("[ERROR]") else "cyan"
        console.print(
            Panel(
                respuesta,
                title=f"[bold {color}]{nombre}[/bold {color}]",
                border_style=color,
                padding=(1, 2),
            )
        )


if __name__ == "__main__":
    main()

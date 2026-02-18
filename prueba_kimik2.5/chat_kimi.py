"""
Chat interactivo con Kimi K2.5 via NVIDIA NIM API.
Usa streaming para ver la respuesta en tiempo real.

Uso: python chat_kimi.py
"""

import os
import sys
from dotenv import load_dotenv
from openai import OpenAI
from rich.console import Console
from rich.markdown import Markdown
from rich.panel import Panel
from rich.text import Text

# ── Configuracion ──────────────────────────────────────────────
load_dotenv()

API_KEY = os.getenv("NVIDIA_API_KEY")
if not API_KEY:
    print("ERROR: No se encontro NVIDIA_API_KEY en .env")
    sys.exit(1)

MODEL = "moonshotai/kimi-k2.5"
BASE_URL = "https://integrate.api.nvidia.com/v1"

client = OpenAI(base_url=BASE_URL, api_key=API_KEY)
console = Console()

# ── Historial de conversacion ──────────────────────────────────
historial = [
    {
        "role": "system",
        "content": (
            "Eres un asistente inteligente y amigable. "
            "Responde de forma clara y concisa. "
            "Si te preguntan en espanol, responde en espanol."
        ),
    }
]


def mostrar_banner():
    banner = Text()
    banner.append("NVIDIA NIM", style="bold green")
    banner.append(" x ", style="dim")
    banner.append("Kimi K2.5", style="bold cyan")
    console.print(
        Panel(
            banner,
            subtitle="[dim]Escribe 'salir' para terminar | 'limpiar' para reiniciar[/dim]",
            border_style="green",
        )
    )
    console.print()


def chat(mensaje_usuario: str) -> str:
    """Envia un mensaje y muestra la respuesta con streaming."""
    historial.append({"role": "user", "content": mensaje_usuario})

    try:
        stream = client.chat.completions.create(
            model=MODEL,
            messages=historial,
            temperature=0.7,
            top_p=0.9,
            max_tokens=4096,
            stream=True,
        )

        respuesta_completa = ""
        console.print("[bold cyan]Kimi K2.5:[/bold cyan] ", end="")

        for chunk in stream:
            if chunk.choices[0].delta.content:
                fragmento = chunk.choices[0].delta.content
                respuesta_completa += fragmento
                print(fragmento, end="", flush=True)

        print()  # Salto de linea al final
        console.print()

        historial.append({"role": "assistant", "content": respuesta_completa})
        return respuesta_completa

    except Exception as e:
        console.print(f"\n[bold red]Error:[/bold red] {e}\n")
        # Quitar el mensaje del usuario si fallo
        historial.pop()
        return ""


def main():
    mostrar_banner()

    while True:
        try:
            console.print("[bold green]Tu:[/bold green] ", end="")
            entrada = input().strip()
        except (KeyboardInterrupt, EOFError):
            console.print("\n[dim]Hasta luego![/dim]")
            break

        if not entrada:
            continue

        if entrada.lower() in ("salir", "exit", "quit", "q"):
            console.print("[dim]Hasta luego![/dim]")
            break

        if entrada.lower() in ("limpiar", "clear", "reset"):
            historial.clear()
            historial.append(
                {
                    "role": "system",
                    "content": (
                        "Eres un asistente inteligente y amigable. "
                        "Responde de forma clara y concisa. "
                        "Si te preguntan en espanol, responde en espanol."
                    ),
                }
            )
            console.print("[dim]Conversacion reiniciada.[/dim]\n")
            continue

        chat(entrada)


if __name__ == "__main__":
    main()

import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { Groq } from 'groq-sdk';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const apiKey = process.env.GROQ_API_KEY || process.env.API_KEY;

if (!apiKey) {
  console.error('Missing GROQ_API_KEY in .env');
  process.exit(1);
}

const groq = new Groq({ apiKey });

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

const memory: ChatMessage[] = [
  {
    role: 'system',
    content: 'Eres un asistente útil para GymTracker. Responde en español.'
  }
];

async function streamReply(messages: ChatMessage[]): Promise<string> {
  let full = '';
  const stream = await groq.chat.completions.create({
    messages,
    model: 'moonshotai/kimi-k2-instruct-0905',
    temperature: 0.6,
    max_completion_tokens: 4096,
    top_p: 1,
    stream: true
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || '';
    if (delta) {
      output.write(delta);
      full += delta;
    }
  }

  return full;
}

async function chatLoop() {
  const rl = readline.createInterface({ input, output });
  output.write('Agente listo. Escribe tu mensaje (exit para salir).\n');

  while (true) {
    let rawInput = '';
    try {
      rawInput = await rl.question('> ');
    } catch {
      break;
    }

    const userInput = rawInput.trim();
    if (!userInput) {
      continue;
    }
    if (['exit', 'quit', 'salir'].includes(userInput.toLowerCase())) {
      break;
    }

    memory.push({ role: 'user', content: userInput });
    try {
      const assistantText = await streamReply(memory);
      memory.push({ role: 'assistant', content: assistantText });
      output.write('\n');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido.';
      output.write(`\n${message}\n`);
    }
  }

  rl.close();
}

await chatLoop();
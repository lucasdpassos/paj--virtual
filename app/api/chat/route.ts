import { NextRequest } from 'next/server';
import { AIOrchestrator, Message } from '@/lib/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory = [] } = await request.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Mensagem é obrigatória' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Chave da API Anthropic não configurada' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const orchestrator = new AIOrchestrator(apiKey);
    
    // Criar um ReadableStream para streaming
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await orchestrator.processMessage(message, conversationHistory);
          
          // Simular streaming dividindo a resposta em chunks
          const words = response.split(' ');
          
          for (let i = 0; i < words.length; i++) {
            const chunk = words.slice(0, i + 1).join(' ');
            
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ 
                  content: chunk,
                  isComplete: i === words.length - 1,
                  timestamp: new Date().toISOString()
                })}\n\n`
              )
            );
            
            // Pequena pausa entre as palavras para simular digitação
            await new Promise(resolve => setTimeout(resolve, 50));
          }
          
          controller.close();
        } catch (error) {
          console.error('Erro no streaming:', error);
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({ 
                error: 'Erro ao processar mensagem',
                isComplete: true
              })}\n\n`
            )
          );
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Erro na API de chat:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function GET() {
  return new Response(
    JSON.stringify({
      message: 'API do Chat está funcionando',
      timestamp: new Date().toISOString(),
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );
}

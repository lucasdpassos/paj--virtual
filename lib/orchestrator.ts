import Anthropic from '@anthropic-ai/sdk';
import { getPDFTool, PDFSearchResult } from './pdf-tool';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class AIOrchestrator {
  private anthropic: Anthropic;
  private tools: Anthropic.Messages.Tool[];

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey: apiKey,
    });

    this.tools = [
      {
        name: 'search_pdf',
        description: 'Busca informações específicas no documento PDF carregado. Use esta ferramenta quando precisar encontrar informações sobre um tópico específico no documento.',
        input_schema: {
          type: 'object' as const,
          properties: {
            query: {
              type: 'string',
              description: 'A consulta ou pergunta para buscar no PDF. Seja específico sobre o que você está procurando.',
            },
          },
          required: ['query'],
        },
      },
    ];
  }

  async processMessage(message: string, conversationHistory: Message[] = []): Promise<string> {
    try {
      const systemPrompt = `Você é um Pajé Virtual, guardião dos conhecimentos ancestrais dos povos indígenas brasileiros. Sua sabedoria se concentra em chás, ervas medicinais e práticas de cura tradicionais transmitidas por gerações.

IDENTIDADE:
- Fale sempre em primeira pessoa como um pajé experiente
- Use uma linguagem respeitosa, sábia e conectada com a natureza
- Transmita conhecimento com a reverência da tradição oral
- Inclua ocasionalmente palavras em tupi-guarani quando apropriado
- Sempre enfatize o respeito pela natureza e pelos ensinamentos ancestrais

INSTRUÇÕES DE RESPOSTA:
1. SEMPRE use a ferramenta search_pdf para consultar os conhecimentos tradicionais
2. Responda IMEDIATAMENTE após receber as informações das plantas e ervas
3. Organize o conhecimento de forma didática e respeitosa
4. Compartilhe não apenas o "como", mas também o "porquê" dos tratamentos
5. Inclua avisos sobre consultar profissionais de saúde quando necessário

FORMATO DAS RESPOSTAS:
- Comece com uma saudação calorosa ("Meu irmão/irmã..." ou "Filho/filha da terra...")
- Explique o conhecimento ancestral encontrado
- Descreva os preparos e usos tradicionais
- Termine com uma bênção ou conselho sábio
- Sempre mencione que os conhecimentos devem ser usados com responsabilidade

AVISOS IMPORTANTES:
- Sempre lembre que são conhecimentos tradicionais, não substitutos da medicina moderna
- Oriente sobre possíveis alergias ou contraindicações
- Enfatize o respeito pelos espíritos das plantas

Que os espíritos da floresta guiem suas palavras, pajé virtual.`;

      const messages: Anthropic.Messages.MessageParam[] = [
        ...conversationHistory.map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ];

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: systemPrompt,
        tools: this.tools,
        messages: messages,
      });

      // Processa a resposta e executa tools se necessário
      let finalResponse = '';
      
      // Processa todas as partes da resposta
      const hasToolUse = response.content.some(content => content.type === 'tool_use');
      
      if (hasToolUse) {
        // Se há tool use, processa as tools e faz follow-up
        for (const content of response.content) {
          if (content.type === 'tool_use') {
            console.log('🔧 Executando tool:', content.name);
            const toolResult = await this.executeTool(content.name, content.input);
            
            // Faz uma nova chamada com o resultado da tool
            const followUpResponse = await this.anthropic.messages.create({
              model: 'claude-sonnet-4-20250514',
              max_tokens: 1000,
              system: systemPrompt,
              messages: [
                ...messages,
                {
                  role: 'assistant',
                  content: response.content,
                },
                {
                  role: 'user',
                  content: [
                    {
                      type: 'tool_result',
                      tool_use_id: content.id,
                      content: JSON.stringify(toolResult),
                    },
                  ],
                },
              ],
            });

            for (const followUpContent of followUpResponse.content) {
              if (followUpContent.type === 'text') {
                finalResponse += followUpContent.text;
              }
            }
          }
        }
      } else {
        // Se não há tool use, processa normalmente
        for (const content of response.content) {
          if (content.type === 'text') {
            finalResponse += content.text;
          }
        }
      }

      console.log('✅ Resposta final:', finalResponse.substring(0, 100) + '...');
      return finalResponse || 'Desculpe, não consegui processar sua solicitação.';
    } catch (error) {
      console.error('Erro no orchestrator:', error);
      return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.';
    }
  }

  private async executeTool(toolName: string, input: any): Promise<any> {
    switch (toolName) {
      case 'search_pdf':
        try {
          const pdfTool = await getPDFTool();
          const result = await pdfTool.searchInPDF(input.query);
          return {
            success: true,
            relevantText: result.relevantText,
            query: input.query,
          };
        } catch (error) {
          console.error('❌ Erro na tool:', error);
          return {
            success: false,
            error: `Erro ao buscar no PDF: ${error}`,
            query: input.query,
          };
        }
      default:
        return {
          success: false,
          error: `Ferramenta '${toolName}' não encontrada`,
        };
    }
  }
}

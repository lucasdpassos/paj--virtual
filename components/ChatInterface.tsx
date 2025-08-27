'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, User, Loader2 } from 'lucide-react';
import Image from 'next/image';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Salve, filho(a) da terra! 🌿 Sou um Pajé Virtual, guardião dos conhecimentos ancestrais dos povos indígenas brasileiros. Venho compartilhar a sabedoria milenar sobre chás, ervas medicinais e curas tradicionais transmitidas pelos meus ancestrais. Como posso ajudar você hoje com os ensinamentos da Mãe Natureza?',
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Criar mensagem do assistant que será atualizada via streaming
    const assistantMessageId = (Date.now() + 1).toString();
    const initialAssistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, initialAssistantMessage]);

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
        }),
      });

      if (!response.ok) {
        throw new Error('Erro na comunicação com o servidor');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('Não foi possível iniciar o streaming');
      }

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                throw new Error(data.error);
              }

              // Atualizar a mensagem do assistant com o conteúdo streaming
              setMessages(prev => 
                prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: data.content }
                    : msg
                )
              );

              if (data.isComplete) {
                setIsLoading(false);
              }
            } catch (parseError) {
              console.error('Erro ao parsear chunk:', parseError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Atualizar a mensagem com erro
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente.' }
            : msg
        )
      );
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-2xl border border-white/20">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 via-yellow-500 to-blue-600 text-white p-6 shadow-lg rounded-t-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/30 p-1 flex items-center justify-center border-2 border-white/50">
              <Image
                src="/char.png"
                alt="Pajé Virtual"
                width={32}
                height={32}
                className="rounded-full"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold drop-shadow-lg">Pajé Virtual 🌿</h1>
              <p className="text-white/90 drop-shadow">Sabedoria ancestral sobre chás e ervas medicinais</p>
            </div>
          </div>
        </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            {message.role === 'assistant' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 shadow-md p-1 flex items-center justify-center flex-shrink-0 border-2 border-green-300">
                <Image
                  src="/char.png"
                  alt="Pajé Virtual"
                  width={32}
                  height={32}
                  className="rounded-full"
                />
              </div>
            )}
            
            <div
              className={`max-w-[70%] rounded-lg p-3 shadow-md ${
                message.role === 'user'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto border border-blue-300'
                  : 'bg-gradient-to-r from-yellow-50 to-green-50 text-gray-800 border border-green-200'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {message.content}
                {message.role === 'assistant' && isLoading && message.content === '' && (
                  <span className="inline-block w-2 h-5 bg-green-600 animate-pulse ml-1"></span>
                )}
                {message.role === 'assistant' && isLoading && message.content !== '' && (
                  <span className="inline-block w-0.5 h-4 bg-green-600 animate-pulse ml-1"></span>
                )}
              </p>
              <span
                className={`text-xs mt-1 block ${
                  message.role === 'user'
                    ? 'text-blue-100'
                    : 'text-green-600'
                }`}
              >
                {formatTime(message.timestamp)}
              </span>
            </div>

            {message.role === 'user' && (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-200 to-yellow-300 shadow-md flex items-center justify-center flex-shrink-0 border-2 border-yellow-400">
                <User className="w-6 h-6 text-yellow-700" />
              </div>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-100 to-green-200 shadow-md p-1 flex items-center justify-center flex-shrink-0 border-2 border-green-300">
              <Image
                src="/char.png"
                alt="Pajé Virtual"
                width={32}
                height={32}
                className="rounded-full opacity-75"
              />
            </div>
            <div className="bg-gradient-to-r from-yellow-50 to-green-50 border border-green-200 rounded-lg p-3 shadow-md">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-green-600" />
                <span className="text-green-700">Consultando os espíritos da floresta...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

        {/* Input Area */}
        <div className="border-t border-green-300 bg-gradient-to-r from-green-50 to-yellow-50 p-4 shadow-lg rounded-b-lg">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Pergunte sobre chás, ervas e curas tradicionais..."
                className="w-full p-3 pr-12 border-2 border-green-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 bg-white/90 text-gray-800 placeholder-green-600/70"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-3 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200 flex items-center justify-center shadow-md border-2 border-white/30"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-green-700 mt-2 text-center">
            Pressione Enter para enviar, Shift+Enter para nova linha
          </p>
        </div>
    </div>
  );
}

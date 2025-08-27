import fs from 'fs/promises';
import path from 'path';
import pdf from 'pdf-parse';

export interface PDFSearchResult {
  content: string;
  page?: number;
  relevantText: string;
}

export class PDFTool {
  private pdfContent: string = '';
  private pdfPath: string;

  constructor(pdfPath: string) {
    this.pdfPath = pdfPath;
  }

  async initialize(): Promise<void> {
    try {
      // Tenta ler como PDF primeiro
      const pdfBuffer = await fs.readFile(this.pdfPath);
      
      // Verifica se é um arquivo PDF válido
      if (pdfBuffer.length > 4 && pdfBuffer.toString('ascii', 0, 4) === '%PDF') {
        const data = await pdf(pdfBuffer);
        this.pdfContent = data.text;
      } else {
        // Se não for PDF, trata como texto simples
        this.pdfContent = pdfBuffer.toString('utf-8');
      }
    } catch (error) {
      console.error('Erro ao carregar arquivo:', error);
      throw new Error(`Não foi possível carregar o arquivo: ${error}`);
    }
  }

  async searchInPDF(query: string): Promise<PDFSearchResult> {
    if (!this.pdfContent) {
      await this.initialize();
    }

    // Busca simples por palavras-chave no conteúdo do PDF
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    const content = this.pdfContent.toLowerCase();
    
    // Encontra parágrafos que contêm as palavras da consulta
    const paragraphs = this.pdfContent.split('\n\n');
    const relevantParagraphs: string[] = [];

    for (const paragraph of paragraphs) {
      const paragraphLower = paragraph.toLowerCase();
      const matchCount = queryWords.filter(word => paragraphLower.includes(word)).length;
      
      if (matchCount > 0) {
        relevantParagraphs.push(paragraph.trim());
      }
    }

    // Se não encontrou correspondências exatas, busca por correspondências parciais
    if (relevantParagraphs.length === 0) {
      // Busca mais flexível - palavras similares ou relacionadas
      const flexibleWords = query.toLowerCase().split(' ').filter(word => word.length > 3);
      
      for (const paragraph of paragraphs) {
        const paragraphLower = paragraph.toLowerCase();
        // Busca por qualquer palavra parcial
        const hasPartialMatch = flexibleWords.some(word => 
          paragraphLower.includes(word.substring(0, 4)) || 
          paragraphLower.includes(word)
        );
        
        if (hasPartialMatch && paragraph.trim().length > 10) {
          relevantParagraphs.push(paragraph.trim());
        }
      }
    }

    // Se ainda não encontrou nada, retorna os primeiros parágrafos relevantes
    if (relevantParagraphs.length === 0) {
      const firstParagraphs = paragraphs
        .filter(p => p.trim().length > 20)
        .slice(0, 3);
      relevantParagraphs.push(...firstParagraphs);
    }

    // Ordena por relevância (número de palavras-chave encontradas)
    relevantParagraphs.sort((a, b) => {
      const aMatches = queryWords.filter(word => a.toLowerCase().includes(word)).length;
      const bMatches = queryWords.filter(word => b.toLowerCase().includes(word)).length;
      return bMatches - aMatches;
    });

    const relevantText = relevantParagraphs.slice(0, 3).join('\n\n');
    
    console.log('📄 Busca PDF - Encontrados:', relevantParagraphs.length, 'parágrafos relevantes');

    return {
      content: this.pdfContent,
      relevantText: relevantText || 'Nenhuma informação relevante encontrada para a consulta.',
    };
  }

  async getFullContent(): Promise<string> {
    if (!this.pdfContent) {
      await this.initialize();
    }
    return this.pdfContent;
  }
}

// Instância singleton da ferramenta PDF
let pdfToolInstance: PDFTool | null = null;

export async function getPDFTool(): Promise<PDFTool> {
  if (!pdfToolInstance) {
    const pdfPath = path.join(process.cwd(), 'documento.pdf');
    pdfToolInstance = new PDFTool(pdfPath);
  }
  return pdfToolInstance;
}

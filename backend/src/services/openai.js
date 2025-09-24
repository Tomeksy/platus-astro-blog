import OpenAI from 'openai';
import dotenv from 'dotenv';
import winston from 'winston';

dotenv.config();

// Configure logger for OpenAI operations
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `[${timestamp}] [OpenAI] ${level.toUpperCase()}: ${message} ${metaString}`;
    })
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

/**
 * OpenAI service for content generation
 */
class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      logger.warn('OpenAI API key not configured');
      this.client = null;
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.maxRetries = 3;
    this.minQualityScore = 0.7;
    
    logger.info(`OpenAI service initialized`, { model: this.model });
  }

  /**
   * Generate blog article content with structured prompt
   */
  async generateArticle(prompt, metadata = {}) {
    if (!this.client) {
      logger.error('OpenAI client not initialized');
      throw new Error('OpenAI client not initialized');
    }

    const startTime = Date.now();
    const {
      topic,
      category,
      intent,
      keywords = [],
      targetAudience = 'Allgemeine Zielgruppe',
      knowledge = '',
      wordCount = '800-1200'
    } = metadata;

    try {
      // Build structured system prompt with business context
      const systemPrompt = this.buildSystemPrompt(category, intent, targetAudience);
      
      // Build user prompt with all requirements
      const userPrompt = this.buildUserPrompt(prompt, {
        topic,
        category,
        keywords,
        knowledge,
        wordCount
      });
      
      logger.info('Starting article generation', {
        topic,
        category,
        intent,
        keywordCount: keywords.length,
        model: this.model
      });

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 1,
        max_completion_tokens: 4000
      });

      const content = completion.choices[0].message.content;
      const duration = Date.now() - startTime;
      
      // Log API call metrics
      logger.info('OpenAI API call completed', {
        duration_ms: duration,
        model: this.model,
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
        finish_reason: completion.choices[0].finish_reason
      });

      return {
        content,
        usage: completion.usage,
        model: this.model,
        duration
      };
    } catch (error) {
      logger.error('OpenAI generation failed', {
        error: error.message,
        topic,
        duration_ms: Date.now() - startTime
      });
      throw error;
    }
  }

  /**
   * Build system prompt with business context
   */
  buildSystemPrompt(category, intent, targetAudience) {
    let context = `Du bist ein Experte für Unterstützte Kommunikation und Hilfsmittelberatung.
    Schreibe informative, gut strukturierte Blogartikel auf Deutsch für die Website hilfsmittelberater.online.`;
    
    // Add category-specific context
    const categoryContext = {
      'Hilfsmittel': 'Fokussiere auf technische Hilfsmittel, deren Funktionen, Vorteile und praktische Anwendung.',
      'Finanzierung': 'Erkläre Finanzierungsmöglichkeiten, Kostenübernahme durch Krankenkassen und Beantragungsprozesse.',
      'Bildung': 'Konzentriere dich auf pädagogische Aspekte, Förderung und Lernunterstützung.',
      'Grundlagen': 'Vermittle Basiswissen verständlich und umfassend für Einsteiger.'
    };
    
    if (categoryContext[category]) {
      context += `\n${categoryContext[category]}`;
    }
    
    // Add intent-specific instructions
    const intentContext = {
      'educational': 'Der Artikel soll lehrreich und informativ sein, komplexe Themen verständlich erklären.',
      'commercial': 'Stelle Produkte objektiv vor, betone Nutzen und Anwendungsbereiche.',
      'transactional': 'Gib konkrete Handlungsanleitungen und praktische Tipps.',
      'informational': 'Biete umfassende Informationen und beantworte häufige Fragen.'
    };
    
    if (intentContext[intent]) {
      context += `\n${intentContext[intent]}`;
    }
    
    // Add target audience context
    context += `\nZielgruppe: ${targetAudience}`;
    context += '\nDie Artikel sollten professionell, aber verständlich sein und Menschen mit Kommunikationsbeeinträchtigungen und deren Angehörigen helfen.';
    
    return context;
  }

  /**
   * Build structured user prompt
   */
  buildUserPrompt(basePrompt, metadata) {
    const { topic, category, keywords, knowledge, wordCount } = metadata;
    
    let prompt = `Schreibe einen Blogartikel zum Thema: "${topic}"

ANFORDERUNGEN:
- Länge: ${wordCount} Wörter
- Kategorie: ${category}
- Zielkeywords: ${keywords.join(', ')}
- Struktur: Einleitung, 3-5 Hauptabschnitte mit Überschriften, Fazit
- Stil: Professionell aber verständlich, direkte Ansprache (Sie-Form)
- Formatierung: Verwende Markdown mit ## für Hauptüberschriften und ### für Unterüberschriften

WISSENSBASIS:
${knowledge || 'Nutze dein Fachwissen über Unterstützte Kommunikation und Hilfsmittel.'}

ZUSÄTZLICHE ANWEISUNGEN:
${basePrompt}

Beginne den Artikel direkt mit einer einleitenden Überschrift und dem Inhalt. 
Integriere die Keywords natürlich in den Text.
Achte auf eine klare Struktur mit informativen Überschriften.`;
    
    return prompt;
  }

  /**
   * Create embedding for a text query
   */
  async createEmbedding(text) {
    if (!this.client) {
      const msg = 'OpenAI client not initialized – embeddings unavailable';
      logger.error(msg);
      throw new Error(msg);
    }

    try {
      const response = await this.client.embeddings.create({
        model: 'text-embedding-3-small', // Recommended embedding model
        input: text.replace(/\n/g, ' '), // API recommends replacing newlines
      });

      logger.debug('Embedding created successfully', {
        text_length: text.length,
        tokens: response.usage?.total_tokens,
      });
      
      return response.data[0].embedding;
    } catch (error) {
      logger.error('Failed to create embedding', { error: error.message });
      throw error;
    }
  }

  /**
   * Enhance existing content
   */
  async enhanceContent(content, instructions) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Du bist ein professioneller Content-Editor für Blogartikel über Unterstützte Kommunikation.'
          },
          {
            role: 'user',
            content: `Verbessere den folgenden Artikel: ${instructions}\n\nArtikel:\n${content}`
          }
        ],
        temperature: 1,
        max_completion_tokens: 4000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('❌ Content enhancement failed:', error.message);
      throw error;
    }
  }

  /**
   * Generate SEO metadata
   */
  async generateSEOMetadata(title, content) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: 'Erstelle SEO-optimierte Metadaten für Blogartikel auf Deutsch.'
          },
          {
            role: 'user',
            content: `Erstelle SEO-Metadaten für:\nTitel: ${title}\n\nInhalt (erste 500 Zeichen): ${content.substring(0, 500)}\n\nBitte gib zurück:\n1. SEO Description (max 160 Zeichen)\n2. Keywords (kommagetrennt)\n3. Kategorien (1-3 passende)`
          }
        ],
        temperature: 1,
        max_completion_tokens: 500
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('❌ SEO metadata generation failed:', error.message);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.client) {
      return { connected: false, error: 'No OpenAI API key configured' };
    }

    try {
      await this.client.chat.completions.create({
        model: this.model,
        messages: [{ role: 'user', content: 'Test' }],
        max_completion_tokens: 10
      });
      
      return { connected: true, model: this.model };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default new OpenAIService();

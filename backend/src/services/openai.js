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
        primaryKeywords: metadata.primaryKeywords || [],
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
    logger.debug('Building system prompt', {
      category,
      intent,
      targetAudience,
      timestamp: new Date().toISOString()
    });

    // OPTIMIZED_1: Main System Context
    let context = `Du bist ein erfahrener Berater von Platus, Österreichs führendem Experten für Assistierende Technologien mit über 21 Jahren Erfahrung.
Du hilfst Menschen mit Kommunikationsbeeinträchtigungen und ihren Angehörigen, die richtigen Lösungen zu finden.

Deine Mission: Jeder Mensch hat das Recht auf Kommunikation. Du schreibst verständliche, hilfreiche Artikel, die Menschen wirklich weiterbringen.

Wichtige Grundsätze:
- Nutze IMMER die Wissensdatenbank für konkrete Informationen zu Platus/Service/Produkten/Generelles
- Verwende die Du-Form - wir sprechen unsere Leser direkt und persönlich an
- Schreibe auf B1-Niveau: kurze Sätze, einfache Wörter, klare Struktur
- Erwähne speaKI als hilfreichen KI-Berater, wenn es thematisch passt

Du schreibst für hilfsmittelberater.online - die digitale Plattform für Unterstützte Kommunikation.`;
    
    // Add category-specific context (OPTIMIZED_2-5)
    const categoryContext = {
      'Hilfsmittel': 'Erkläre Hilfsmittel praxisnah: Was kann das Gerät? Für wen ist es geeignet? Wie verändert es den Alltag?\nNutze konkrete Beispiele aus der Wissensdatenbank.',
      'Finanzierung': 'Nimm die Sorgen um Kosten ernst. Erkläre Betroffenen und Angehörigen wie die Kostenübernahme funktioniert.\nMache Mut: Mit der richtigen Unterstützung klappt die Finanzierung.',
      'Bildung': 'Zeige Wege auf, wie Kommunikationshilfen Lernen ermöglichen. Jeder Betroffene kann sich entwickeln - mit der richtigen Unterstützung.\nErwähne Platus UK-Webkurse und Schulungen für Fachkräfte, wenn passend.',
      'Grundlagen': 'Du bist der erste Anlaufpunkt für Menschen, die neu in diesem Bereich sind.\nNimm Ängste: Es ist okay, noch nichts zu wissen. Jeder fängt mal an.'
    };
    
    if (categoryContext[category]) {
      context += `\n\n${categoryContext[category]}`;
      logger.debug(`Added category context for: ${category}`);
    } else {
      logger.warn(`No category context found for: ${category}`);
    }
    
    // Add intent-specific instructions (OPTIMIZED_6-9)
    const intentContext = {
      'educational': 'Mache komplexe Themen greifbar. Nutze Alltagsbeispiele, die jeder versteht.\nErkläre nicht nur das "Was", sondern auch das "Warum" und "Wie".\nNach dem Lesen soll der Leser denken: "Das habe ich jetzt wirklich verstanden!"\nVerwende die Wissensdatenbank.',
      'commercial': 'Stelle den Menschen und seine Bedürfnisse in den Mittelpunkt - nicht das Produkt.\nZeige ehrlich Vor- und Nachteile. Erkläre, für welche Situation welche Lösung passt.\nErwähne die Möglichkeit, Hilfsmittel zu testen - das nimmt Kaufdruck raus.\nBetone: Es geht um die beste Lösung für dich, nicht um einen Verkauf.',
      'transactional': 'Verweise auf [speaKI](https://speaki.io) für Sofort-Hilfe bei Fragen (verfügbar 24/7).\nMache große Aufgaben klein und machbar.',
      'informational': 'Beantworte die Fragen, die Menschen wirklich haben - nicht die, von denen wir profitieren würden.\nStrukturiere mit Zwischenüberschriften als Fragen: "Was bedeutet[Keyword]?", "Wie funktioniert[Keyword]?", "Wer kann helfen bei[Keyword]?"\nGib umfassende Infos, aber bleibe verständlich.'
    };
    
    if (intentContext[intent]) {
      context += `\n\n${intentContext[intent]}`;
      logger.debug(`Added intent context for: ${intent}`);
    } else {
      logger.warn(`No intent context found for: ${intent}`);
    }
    
    // Add target audience context (OPTIMIZED_10)
    context += `\n\nDu sprichst zu: ${targetAudience}\n\nDiese Menschen brauchen praktische Hilfe und Verständnis.`;
    
    logger.info('System prompt built successfully', {
      promptLength: context.length,
      category,
      intent,
      targetAudience
    });
    
    return context;
  }

  /**
   * Build structured user prompt
   */
  buildUserPrompt(basePrompt, metadata) {
    const { topic, category, keywords, primaryKeywords = [], knowledge, wordCount } = metadata;
    
    logger.debug('Building user prompt', {
      topic,
      category,
      keywordCount: keywords?.length || 0,
      primaryKeywordCount: primaryKeywords?.length || 0,
      hasKnowledge: !!knowledge,
      wordCount
    });
    
    // OPTIMIZED_11: User Article Generation
    let prompt = `Schreibe einen hilfreichen Artikel zum Thema: "${topic}"

ANFORDERUNGEN:
- Länge: ${wordCount} Wörter
- Kategorie: ${category}
- Keywords natürlich einbauen: ${primaryKeywords.join(', ')}, ${keywords.join(', ')}
- Struktur: Einladende Einleitung mit primary keywords → 3-5 Hauptteile mit klaren Überschriften → Motivierendes Fazit
- Sprache: B1-Niveau, Du-Form, kurze Sätze (max. 15 Wörter ideal)
- Ton: Freundlich und kompetent aber nie von oben herab

VERFÜGBARES WISSEN AUS DER PLATUS-DATENBANK:
${knowledge || 'FEHLER: Keine Wissensdatenbank verfügbar - Artikel kann nicht generiert werden.'}

BESONDERE HINWEISE:
${basePrompt}

WICHTIG FÜR JEDEN ARTIKEL:
✓ Beginne mit einer Situation, die der Leser kennt
✓ Zeige Verständnis für Herausforderungen
✓ Biete konkrete, machbare Lösungen
✓ Ende mit einem motivierenden Ausblick`;
    
    logger.info('User prompt built successfully', {
      promptLength: prompt.length,
      topic: topic.substring(0, 50)
    });
    
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
      logger.error('OpenAI client not initialized for content enhancement');
      throw new Error('OpenAI client not initialized');
    }

    logger.info('Starting content enhancement', {
      contentLength: content.length,
      instructions: instructions.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            // OPTIMIZED_12: Content Enhancement System
            content: 'Du bist ein erfahrener Platus-Redakteur für Artikel über Unterstützte Kommunikation.\nDeine Aufgabe: Mache gute Artikel noch besser - verständlicher, hilfreicher, menschlicher.\nAchte auf B1-Sprachniveau und Du-Form. Füge Platus-Expertise natürlich ein, wo es den Artikel verbessert.'
          },
          {
            role: 'user',
            // OPTIMIZED_13: Content Enhancement User
            content: `Verbessere diesen Artikel: ${instructions}\n\nPrüfe besonders:\n- Ist die Sprache B1-tauglich? (kurze Sätze, einfache Wörter)\n- Nutzen wir durchgehend die Du-Form?\n- Klingt es nach Platus: kompetent, hilfsbereit, menschlich?\n- Sind hilfreiche Hinweise auf Platus-Services natürlich und authentisch integriert?\n\nArtikel:\n${content}`
          }
        ],
        temperature: 1,
        max_completion_tokens: 4000
      });

      logger.info('Content enhancement completed', {
        model: this.model,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('Content enhancement failed', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Generate SEO metadata
   */
  async generateSEOMetadata(title, content) {
    if (!this.client) {
      logger.error('OpenAI client not initialized for SEO generation');
      throw new Error('OpenAI client not initialized');
    }

    logger.info('Starting SEO metadata generation', {
      title: title.substring(0, 50),
      contentPreview: content.substring(0, 100),
      timestamp: new Date().toISOString()
    });

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            // OPTIMIZED_14: SEO Metadata System
            content: 'Erstelle SEO-Metadaten, die Menschen mit echten Bedürfnissen ansprechen.\nDie Description soll ehrlich sagen, was der Leser erfährt - keine leeren Versprechen.\nKeywords sollen widerspiegeln, wonach Betroffene und Angehörige wirklich auf Google Search suchen.'
          },
          {
            role: 'user',
            // OPTIMIZED_15: SEO Metadata User
            content: `Erstelle SEO-Metadaten für:\nTitel: ${title}\n\nArtikel-Anfang: ${content.substring(0, 500)}\n\nErstelle:\n1. SEO Description (max 160 Zeichen): Was erfährt der Leser? Warum hilft ihm das?\n2. Keywords: Wonach suchen Betroffene wirklich? (5-8 Begriffe)`
          }
        ],
        temperature: 1,
        max_completion_tokens: 500
      });

      logger.info('SEO metadata generation completed', {
        model: this.model,
        promptTokens: completion.usage?.prompt_tokens,
        completionTokens: completion.usage?.completion_tokens,
        totalTokens: completion.usage?.total_tokens
      });

      return completion.choices[0].message.content;
    } catch (error) {
      logger.error('SEO metadata generation failed', {
        error: error.message,
        stack: error.stack
      });
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

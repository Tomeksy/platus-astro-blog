import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * OpenAI service for content generation
 */
class OpenAIService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OpenAI API key not configured');
      return;
    }

    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    console.log(`✅ OpenAI service initialized with model: ${this.model}`);
  }

  /**
   * Generate blog article content
   */
  async generateArticle(prompt, metadata = {}) {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'system',
            content: `Du bist ein Experte für Unterstützte Kommunikation und Hilfsmittelberatung. 
            Schreibe informative, gut strukturierte Blogartikel auf Deutsch für die Website hilfsmittelberater.online.
            Die Artikel sollten professionell, aber verständlich sein und Menschen mit Kommunikationsbeeinträchtigungen und deren Angehörigen helfen.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4000
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error('❌ OpenAI generation failed:', error.message);
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
        temperature: 0.5,
        max_tokens: 4000
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
        temperature: 0.3,
        max_tokens: 500
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
        max_tokens: 10
      });
      
      return { connected: true, model: this.model };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default new OpenAIService();

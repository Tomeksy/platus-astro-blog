import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import winston from 'winston';
import openAIService from './openai.js';

dotenv.config();

// Configure logger for Supabase operations
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `[${timestamp}] [Supabase] ${level.toUpperCase()}: ${message} ${metaString}`;
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
 * Supabase service for vector database operations
 */
class SupabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      logger.warn('Supabase credentials not configured');
      this.client = null;
      return;
    }
    
    try {
      this.client = createClient(supabaseUrl, supabaseKey);
      const keyType = process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon';
      logger.info('Supabase client initialized successfully', { keyType });
    } catch (error) {
      logger.error('Failed to initialize Supabase client', {
        error: error.message
      });
      this.client = null;
    }
  }
  
  /**
   * Perform semantic search in vector database
   */
  async semanticSearch(query, options = {}) {
    const {
      table = 'documents',
      embeddingColumn = 'embedding',
      contentColumn = 'content',
      metadataColumn = 'metadata',
      limit = 10,
      threshold = 0.7  // Lower threshold for blog content discovery
    } = options;
    
    if (!this.client) {
      logger.warn('Supabase client not available');
      return [];
    }
    
    try {
      logger.info('Performing semantic search', {
        query: query.substring(0, 100),
        table,
        limit,
        threshold
      });
      
      // Call the RPC function for vector search
      const { data, error } = await this.client
        .rpc('match_documents', {
          query_embedding: await this.getEmbedding(query),
          match_threshold: threshold,
          match_count: limit
        });
      
      if (error) {
        throw error;
      }
      
      logger.info(`Semantic search completed`, {
        resultsFound: data?.length || 0,
        topScore: data?.[0]?.similarity || 0
      });
      
      return data || [];
    } catch (error) {
      logger.error('Semantic search failed', {
        error: error.message,
        query: query.substring(0, 50)
      });
      throw error;
    }
  }
  
  /**
   * Get embedding for a text query (placeholder - would use OpenAI in production)
   */
  async getEmbedding(text) {
    logger.debug('Generating embedding for text', { textLength: text.length });
    return await openAIService.createEmbedding(text); // will throw if unavailable
  }
  
  /**
   * Query knowledge base with multiple strategies
   */
  async queryKnowledgeBase(topic, intent, options = {}) {
    const {
      maxResults = 15,
      minSimilarity = 0.65,  // Lower for broader discovery
      categories = ['faq', 'services', 'products', 'guides']
    } = options;
    
    if (!this.client) {
      logger.warn('Supabase not available, returning empty knowledge');
      return {
        faqs: [],
        services: [],
        products: [],
        guides: [],
        totalResults: 0
      };
    }
    
    const knowledge = {
      faqs: [],
      services: [],
      products: [],
      guides: [],
      totalResults: 0
    };
    
    try {
      logger.info('Querying knowledge base', {
        topic,
        intent,
        categories,
        maxResults
      });
      
      // Build contextual query based on intent
      const queries = this.buildQueries(topic, intent);
      
      for (const query of queries) {
        logger.debug(`Executing query: "${query.text}"`, {
          category: query.category
        });
        
        const results = await this.semanticSearch(query.text, {
          limit: Math.ceil(maxResults / queries.length),
          threshold: minSimilarity
        });
        
        // Categorize results
        results.forEach(result => {
          const category = result.metadata?.category || 'guides';
          if (knowledge[category]) {
            knowledge[category].push({
              content: result.content,
              similarity: result.similarity,
              metadata: result.metadata
            });
          }
          knowledge.totalResults++;
        });
      }
      
      logger.info('Knowledge base query completed', {
        totalResults: knowledge.totalResults,
        faqCount: knowledge.faqs.length,
        serviceCount: knowledge.services.length,
        productCount: knowledge.products.length,
        guideCount: knowledge.guides.length
      });
      
      return knowledge;
      
    } catch (error) {
      logger.error('Knowledge base query failed', {
        error: error.message,
        topic
      });
      return knowledge;
    }
  }
  
  /**
   * Build multiple query variations for better coverage
   */
  buildQueries(topic, intent) {
    const queries = [];
    
    // Base query
    queries.push({
      text: topic,
      category: 'general'
    });
    
    // Intent-specific queries
    switch(intent) {
      case 'educational':
        queries.push(
          { text: `Was ist ${topic}?`, category: 'faq' },
          { text: `Wie funktioniert ${topic}?`, category: 'guides' },
          { text: `${topic} Anleitung Tutorial`, category: 'guides' }
        );
        break;
      
      case 'informational':
        queries.push(
          { text: `${topic} Informationen Details`, category: 'general' },
          { text: `${topic} Merkmale Eigenschaften`, category: 'products' },
          { text: `${topic} Vorteile Nutzen`, category: 'services' }
        );
        break;
      
      case 'comparative':
        queries.push(
          { text: `${topic} Vergleich Unterschied`, category: 'guides' },
          { text: `${topic} Alternativen Optionen`, category: 'products' },
          { text: `Beste ${topic} Empfehlung`, category: 'services' }
        );
        break;
      
      default:
        queries.push(
          { text: `${topic} Hilfe Unterstützung`, category: 'faq' },
          { text: `${topic} Service Beratung`, category: 'services' }
        );
    }
    
    logger.debug('Built query variations', {
      count: queries.length,
      queries: queries.map(q => q.text.substring(0, 30))
    });
    
    return queries;
  }
}

// Export singleton instance
export default new SupabaseService();

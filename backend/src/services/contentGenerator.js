import winston from 'winston';
import airtableService from './airtable.js';
import supabaseService from './supabase.js';
import openAIService from './openai.js';

// Configure dedicated logger for content generation workflow
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaString = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
      return `[${timestamp}] [ContentGen] ${level.toUpperCase()}: ${message} ${metaString}`;
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

class ContentGenerator {
  constructor() {
    this.startTime = null;
    this.stepTimings = {};
    this.maxRetries = 3;
    this.retryDelay = 1000; // ms
    
    // Use Airtable service singleton for duplicate checking
    this.airtableService = airtableService;
    const airtableConnected = !!(airtableService && airtableService.base);
    
    // Use Supabase service singleton for vector DB
    this.supabaseService = supabaseService;
    const supabaseConnected = !!(supabaseService && supabaseService.client);
    
    if (airtableConnected) {
      logger.info('Airtable service connected for duplicate prevention');
    } else {
      logger.warn('Airtable service not available, duplicate checking will be limited');
    }
    
    if (supabaseConnected) {
      logger.info('Supabase service connected for vector search');
    } else {
      logger.warn('Supabase service not available, knowledge queries will be limited');
    }
    
    logger.info('ContentGenerator initialized', {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      airtableConnected,
      supabaseConnected
    });
  }

  /**
   * Start timing measurement for a workflow step
   */
  startTimer(stepName) {
    this.stepTimings[stepName] = { start: Date.now() };
    logger.debug(`Timer started for step: ${stepName}`);
  }

  /**
   * End timing measurement for a workflow step
   */
  endTimer(stepName) {
    if (!this.stepTimings[stepName]) {
      logger.warn(`No start time found for step: ${stepName}`);
      return;
    }
    
    const duration = Date.now() - this.stepTimings[stepName].start;
    this.stepTimings[stepName].duration = duration;
    
    logger.info(`Step completed: ${stepName}`, {
      duration_ms: duration,
      duration_seconds: (duration / 1000).toFixed(2)
    });
    
    return duration;
  }

  /**
   * Fetch all existing articles from Airtable
   */
  async getExistingArticles() {
    if (!this.airtableService || !this.airtableService.base) {
      logger.warn('Airtable not available, skipping article fetch');
      return [];
    }

    try {
      const articles = [];
      
      // Fetch from both drafts and posted tables
      const tables = ['Drafts', 'Posted Articles'];
      
      for (const tableName of tables) {
        logger.debug(`Fetching articles from ${tableName} table`);
        
        try {
          const table = tableName === 'Drafts'
            ? this.airtableService.draftsTable 
            : this.airtableService.postedTable;
            
          if (!table) {
            logger.warn(`Table ${tableName} not available`);
            continue;
          }
          
          await table.select({
            fields: ['Main Post Title', 'Keywords', 'Primary Keywords'],
            pageSize: 100
          }).eachPage((records, fetchNextPage) => {
            records.forEach(record => {
              articles.push({
                id: record.id,
                title: record.get('Main Post Title') || '',
                keywords: record.get('Keywords') || [],
                primaryKeywords: record.get('Primary Keywords') || [],
                table: tableName
              });
            });
            fetchNextPage();
          });
        } catch (tableError) {
          logger.warn(`Failed to fetch from ${tableName}:`, tableError.message);
        }
      }
      
      logger.info(`Fetched ${articles.length} existing articles for duplicate check`);
      return articles;
      
    } catch (error) {
      logger.error('Failed to fetch existing articles', { error: error.message });
      return [];
    }
  }

  /**
   * Sanitize and tokenize text for comparison
   */
  sanitizeText(text) {
    if (!text) return [];
    
    // Convert to lowercase, remove punctuation, split into words
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2); // Filter out very short words
  }

  /**
   * Calculate word-based title overlap percentage
   */
  calculateTitleOverlap(title1, title2) {
    const words1 = this.sanitizeText(title1);
    const words2 = this.sanitizeText(title2);
    
    if (words1.length === 0 || words2.length === 0) {
      return 0;
    }
    
    // Count matching words
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter(word => set2.has(word)));
    
    // Calculate overlap as percentage of smaller title
    const minLength = Math.min(set1.size, set2.size);
    const overlap = (intersection.size / minLength) * 100;
    
    logger.debug('Title overlap calculation', {
      title1: title1?.substring(0, 50),
      title2: title2?.substring(0, 50),
      words1: words1.length,
      words2: words2.length,
      commonWords: intersection.size,
      overlapPercent: overlap.toFixed(2)
    });
    
    return overlap;
  }

  /**
   * Calculate keyword intersection percentage
   */
  calculateKeywordOverlap(keywords1, keywords2) {
    // Ensure arrays and sanitize
    const sanitized1 = (Array.isArray(keywords1) ? keywords1 : [keywords1 || ''])
      .flatMap(k => this.sanitizeText(k))
      .filter(k => k);
      
    const sanitized2 = (Array.isArray(keywords2) ? keywords2 : [keywords2 || ''])
      .flatMap(k => this.sanitizeText(k))
      .filter(k => k);
    
    if (sanitized1.length === 0 || sanitized2.length === 0) {
      return 0;
    }
    
    const set1 = new Set(sanitized1);
    const set2 = new Set(sanitized2);
    const intersection = new Set([...set1].filter(keyword => set2.has(keyword)));
    
    // Calculate overlap as percentage of smaller set
    const minLength = Math.min(set1.size, set2.size);
    const overlap = (intersection.size / minLength) * 100;
    
    logger.debug('Keyword overlap calculation', {
      keywords1Count: set1.size,
      keywords2Count: set2.size,
      commonKeywords: Array.from(intersection),
      overlapPercent: overlap.toFixed(2)
    });
    
    return overlap;
  }

  /**
   * Check if content is duplicate based on title and keyword overlap
   */
  isDuplicate(newTitle, newKeywords, newPrimaryKeywords, existingArticle) {
    // Check title overlap (>70% threshold)
    const titleOverlap = this.calculateTitleOverlap(newTitle, existingArticle.title);
    const titleIsDuplicate = titleOverlap > 70;
    
    // Combine all keywords for comparison
    const newAllKeywords = [...(newKeywords || []), ...(newPrimaryKeywords || [])];
    const existingAllKeywords = [
      ...(existingArticle.keywords || []), 
      ...(existingArticle.primaryKeywords || [])
    ];
    
    // Check keyword overlap (>50% threshold)
    const keywordOverlap = this.calculateKeywordOverlap(newAllKeywords, existingAllKeywords);
    const keywordIsDuplicate = keywordOverlap > 50;
    
    const isDuplicate = titleIsDuplicate || keywordIsDuplicate;
    
    if (isDuplicate) {
      logger.warn('Duplicate detected!', {
        existingArticleId: existingArticle.id,
        existingTitle: existingArticle.title,
        newTitle,
        titleOverlap: titleOverlap.toFixed(2),
        keywordOverlap: keywordOverlap.toFixed(2),
        titleIsDuplicate,
        keywordIsDuplicate
      });
    }
    
    return {
      isDuplicate,
      titleOverlap,
      keywordOverlap,
      existingArticleId: existingArticle.id
    };
  }

  /**
   * Main duplicate check method
   * Prevents content with >70% title overlap or >50% keyword overlap
   */
  async checkDuplicates(title, keywords, primaryKeywords) {
    const stepName = 'checkDuplicates';
    this.startTimer(stepName);
    
    try {
      logger.info('Starting duplicate check', {
        title,
        keywords: keywords?.length || 0,
        primaryKeywords: primaryKeywords?.length || 0
      });
      
      // Fetch existing articles
      const existingArticles = await this.getExistingArticles();
      
      if (existingArticles.length === 0) {
        logger.info('No existing articles found, no duplicates possible');
        this.endTimer(stepName);
        return false;
      }
      
      // Check against each existing article
      let duplicateFound = false;
      const duplicateResults = [];
      
      for (const article of existingArticles) {
        const result = this.isDuplicate(title, keywords, primaryKeywords, article);
        
        if (result.isDuplicate) {
          duplicateFound = true;
          duplicateResults.push(result);
        }
      }
      
      logger.info('Duplicate check completed', {
        isDuplicate: duplicateFound,
        checkedAgainst: existingArticles.length,
        duplicatesFound: duplicateResults.length,
        topMatch: duplicateResults[0] || null
      });
      
      this.endTimer(stepName);
      return duplicateFound;
      
    } catch (error) {
      logger.error('Duplicate check failed, continuing without check', {
        error: error.message,
        stack: error.stack
      });
      this.endTimer(stepName);
      
      // Fail open - don't block content generation on error
      return false;
    }
  }

  /**
   * Query Vector Database with retry logic
   */
  async queryVectorDB(query, options = {}) {
    const {
      threshold = 0.4,  // Match speaKI's threshold for consistency
      limit = 20,        // More results for comprehensive knowledge
      retries = this.maxRetries
    } = options;
    
    logger.info('Starting vector DB query', {
      query: query.substring(0, 100),
      threshold,
      limit
    });
    
    let attempt = 0;
    let lastError = null;
    
    while (attempt < retries) {
      try {
        if (!this.supabaseService || !this.supabaseService.client) {
          const error = new Error('Vector DB not available - cannot generate content without knowledge base');
          logger.error('Vector DB connection required', { error: error.message });
          throw error;
        }
        
        const results = await this.supabaseService.semanticSearch(query, {
          limit,
          threshold
        });
        
        logger.info('Vector DB query successful', {
          resultsCount: results.length,
          topSimilarity: results[0]?.similarity || 0,
          attempt: attempt + 1
        });
        
        return results;
        
      } catch (error) {
        lastError = error;
        attempt++;
        
        logger.warn(`Vector DB query attempt ${attempt} failed`, {
          error: error.message,
          retriesRemaining: retries - attempt
        });
        
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }
    
    logger.error('Vector DB query failed after all retries', {
      error: lastError?.message,
      attempts: attempt
    });
    
    throw new Error(`Vector DB query failed after ${attempt} attempts: ${lastError?.message}. Cannot proceed without knowledge base.`);
  }
  
  /**
   * Synthesize knowledge from multiple query results
   */
  async synthesizeKnowledge(results, topic, intent) {
    logger.info('Synthesizing knowledge', {
      resultsCount: results.length,
      topic,
      intent
    });
    
    const synthesized = {
      faqs: [],
      services: [],
      products: [],
      guides: [],
      keyInsights: [],
      relevanceScore: 0,
      totalChunks: 0
    };
    
    if (!results || results.length === 0) {
      logger.warn('No results to synthesize');
      return synthesized;
    }
    
    // Group results by category and relevance
    const highRelevance = [];
    const mediumRelevance = [];
    const lowRelevance = [];
    
    results.forEach(result => {
      synthesized.totalChunks++;
      
      // Categorize by similarity score
      if (result.similarity > 0.85) {
        highRelevance.push(result);
      } else if (result.similarity > 0.75) {
        mediumRelevance.push(result);
      } else {
        lowRelevance.push(result);
      }
      
      // Categorize by content type - map speaKI categories to our expected format
      const rawCategory = result.metadata?.category || '';
      let category = 'guides'; // default
      
      // Map speaKI's category values to our expected categories
      if (rawCategory.includes('PRODUKT') || result.metadata?.product_name) {
        category = 'products';
      } else if (rawCategory.includes('BERATUNG') || rawCategory.includes('SERVICE')) {
        category = 'services';
      } else if (rawCategory.includes('FAQ') || result.metadata?.section?.includes('FAQ')) {
        category = 'faqs';
      }
      
      if (synthesized[category]) {
        synthesized[category].push({
          content: result.content,
          similarity: result.similarity,
          metadata: result.metadata
        });
      }
    });
    
    // Calculate overall relevance score
    const avgSimilarity = results.reduce((sum, r) => sum + r.similarity, 0) / results.length;
    synthesized.relevanceScore = avgSimilarity;
    
    // Extract key insights from high-relevance content
    highRelevance.slice(0, 5).forEach(result => {
      synthesized.keyInsights.push({
        content: result.content.substring(0, 200),
        similarity: result.similarity,
        source: result.metadata?.source || 'knowledge base'
      });
    });
    
    logger.info('Knowledge synthesis completed', {
      highRelevanceCount: highRelevance.length,
      mediumRelevanceCount: mediumRelevance.length,
      lowRelevanceCount: lowRelevance.length,
      keyInsightsCount: synthesized.keyInsights.length,
      relevanceScore: synthesized.relevanceScore.toFixed(3)
    });
    
    return synthesized;
  }
  
  /**
   * Iterative knowledge discovery with query refinement
   */
  async queryKnowledge(topic, intent) {
    const stepName = 'queryKnowledge';
    this.startTimer(stepName);
    
    try {
      logger.info('Starting iterative knowledge discovery', {
        topic,
        intent,
        database: 'Vector DB'
      });
      
      const allResults = [];
      const queries = [];
      
      // Initial broad query
      queries.push({
        text: topic,
        type: 'broad'
      });
      
      // Add intent-specific queries
      switch(intent) {
        case 'educational':
          queries.push(
            { text: `${topic} Grundlagen Einführung`, type: 'basics' },
            { text: `${topic} erklärt für Anfänger`, type: 'beginner' }
          );
          break;
        
        case 'informational':
          queries.push(
            { text: `${topic} aktuelle Informationen 2024 2025`, type: 'current' },
            { text: `${topic} Details Funktionen`, type: 'detailed' }
          );
          break;
        
        case 'comparative':
          queries.push(
            { text: `${topic} Vergleich Test Bewertung`, type: 'comparison' },
            { text: `Beste ${topic} Empfehlungen`, type: 'recommendations' }
          );
          break;
          
        default:
          queries.push(
            { text: `${topic} Hilfsmittel Unterstützung`, type: 'support' }
          );
      }
      
      // Execute queries iteratively
      for (const query of queries) {
        logger.debug(`Executing query: "${query.text}" (${query.type})`);
        
        const results = await this.queryVectorDB(query.text, {
          threshold: query.type === 'broad' ? 0.35 : 0.4,  // Slightly lower for broad search
          limit: query.type === 'broad' ? 25 : 15
        });
        
        allResults.push(...results);
        
        // Check if we have enough high-quality results
        const highQualityCount = allResults.filter(r => r.similarity > 0.8).length;
        
        logger.debug('Query iteration completed', {
          queryType: query.type,
          newResults: results.length,
          totalResults: allResults.length,
          highQualityResults: highQualityCount
        });
        
        // Stop if we have enough high-quality results
        if (highQualityCount >= 10) {
          logger.info('Sufficient high-quality results found, stopping iteration');
          break;
        }
      }
      
      // Handle insufficient results
      if (allResults.length < 5) {
        logger.warn('Insufficient results from knowledge base', {
          currentResults: allResults.length,
          topic
        });
        
        // Try one more broad search with lower threshold
        logger.info('Attempting broader search with lower threshold');
        const broadResults = await this.queryVectorDB(`${topic} Kommunikation Hilfsmittel`, {
          threshold: 0.3,  // Very low threshold for last-resort broad search
          limit: 30
        });
        
        if (broadResults && broadResults.length > 0) {
          allResults.push(...broadResults);
          logger.info('Broader search added results', {
            newResults: broadResults.length,
            totalResults: allResults.length
          });
        }
        
        // If still insufficient, throw error
        if (allResults.length < 3) {
          throw new Error(`Insufficient knowledge found for topic: ${topic}. Only ${allResults.length} results found. Minimum 3 required.`);
        }
      }
      
      // Deduplicate results based on content similarity
      const uniqueResults = this.deduplicateResults(allResults);
      
      // Synthesize knowledge from all results
      const knowledge = await this.synthesizeKnowledge(uniqueResults, topic, intent);
      
      logger.info('Knowledge synthesis completed', {
        uniqueResults: uniqueResults.length,
        knowledgeChunks: knowledge.totalChunks,
        relevanceScore: knowledge.relevanceScore
      });
      
      logger.info('Knowledge discovery completed', {
        totalQueries: queries.length,
        uniqueResults: uniqueResults.length,
        relevanceScore: knowledge.relevanceScore,
        faqCount: knowledge.faqs.length,
        serviceCount: knowledge.services.length,
        productCount: knowledge.products.length,
        guideCount: knowledge.guides.length
      });
      
      this.endTimer(stepName);
      return knowledge;
      
    } catch (error) {
      logger.error('Knowledge discovery failed', {
        error: error.message,
        stack: error.stack,
        topic,
        intent
      });
      this.endTimer(stepName);
      
      // Return minimal knowledge structure on error
      return {
        faqs: [],
        services: [],
        products: [],
        guides: [],
        keyInsights: [],
        relevanceScore: 0,
        totalChunks: 0,
        error: error.message
      };
    }
  }
  
  /**
   * Deduplicate results based on content similarity
   */
  deduplicateResults(results) {
    if (!results || results.length === 0) return [];
    
    const unique = [];
    const seen = new Set();
    
    results.sort((a, b) => b.similarity - a.similarity);
    
    for (const result of results) {
      const contentKey = result.content?.substring(0, 100) || '';
      
      if (!seen.has(contentKey)) {
        seen.add(contentKey);
        unique.push(result);
      }
    }
    
    logger.debug(`Deduplicated results: ${results.length} → ${unique.length}`);
    return unique;
  }
  

  /**
   * Generate topic ideas from vector knowledge
   */
  async generateTopicIdeas(knowledge, baseQuery, options = {}) {
    const {
      count = 5,
      focusCategory = null
    } = options;
    
    logger.info('Generating topic ideas from knowledge', {
      knowledgeChunks: knowledge.totalChunks || 0,
      relevanceScore: knowledge.relevanceScore?.toFixed(3),
      baseQuery,
      targetCount: count
    });
    
    const topicIdeas = [];
    
    // Extract themes from high-relevance content
    const themes = new Set();
    const concepts = new Set();
    
    // Analyze FAQs for common questions
    if (knowledge.faqs && knowledge.faqs.length > 0) {
      knowledge.faqs.forEach(faq => {
        const content = faq.content?.toLowerCase() || '';
        
        // Extract question patterns
        if (content.includes('was ist')) themes.add('definition');
        if (content.includes('wie funktioniert')) themes.add('how-to');
        if (content.includes('kosten') || content.includes('finanzierung')) themes.add('financing');
        if (content.includes('voraussetzungen')) themes.add('requirements');
        if (content.includes('unterschied')) themes.add('comparison');
        
        // Extract key concepts
        const keyTerms = this.extractKeyTerms(content);
        keyTerms.forEach(term => concepts.add(term));
      });
    }
    
    // Analyze products/services for specific solutions
    if (knowledge.products && knowledge.products.length > 0) {
      knowledge.products.forEach(product => {
        const content = product.content?.toLowerCase() || '';
        themes.add('product-review');
        
        const keyTerms = this.extractKeyTerms(content);
        keyTerms.forEach(term => concepts.add(term));
      });
    }
    
    // Analyze guides for educational content
    if (knowledge.guides && knowledge.guides.length > 0) {
      knowledge.guides.forEach(guide => {
        const content = guide.content?.toLowerCase() || '';
        themes.add('tutorial');
        themes.add('educational');
        
        const keyTerms = this.extractKeyTerms(content);
        keyTerms.forEach(term => concepts.add(term));
      });
    }
    
    logger.debug('Extracted themes and concepts', {
      themes: Array.from(themes),
      conceptCount: concepts.size,
      topConcepts: Array.from(concepts).slice(0, 5)
    });
    
    // Generate topic variations based on themes
    const themeArray = Array.from(themes);
    const conceptArray = Array.from(concepts).slice(0, 10); // Top concepts
    
    // Pattern-based topic generation
    const topicPatterns = [
      { 
        pattern: '{concept} für {target_group}: {angle}',
        example: 'Sprachcomputer für ALS-Patienten: Kostenübernahme 2025',
        theme: 'practical'
      },
      {
        pattern: '{comparison} zwischen {concept1} und {concept2}',
        example: 'Vergleich zwischen Tobii Dynavox und Grid 3',
        theme: 'comparison'
      },
      {
        pattern: '{how_to} {action} mit {concept}',
        example: 'Wie Sie einen Sprachcomputer beantragen',
        theme: 'how-to'
      },
      {
        pattern: '{number} {tips} für {concept}',
        example: '7 Tipps für die Auswahl des richtigen Kommunikationshilfsmittels',
        theme: 'listicle'
      },
      {
        pattern: '{concept}: {problem} und {solution}',
        example: 'Unterstützte Kommunikation: Herausforderungen und Lösungen',
        theme: 'problem-solution'
      }
    ];
    
    // Generate topics based on patterns and available concepts
    for (let i = 0; i < count && topicIdeas.length < count; i++) {
      const pattern = topicPatterns[i % topicPatterns.length];
      
      let topicTitle = baseQuery;
      let angle = 'informational';
      
      // Customize based on available themes
      if (themes.has('financing')) {
        topicTitle = `${baseQuery}: Kostenübernahme und Finanzierung`;
        angle = 'financial';
      } else if (themes.has('comparison') && conceptArray.length > 1) {
        topicTitle = `${baseQuery}: Vergleich der wichtigsten Optionen`;
        angle = 'comparative';
      } else if (themes.has('how-to')) {
        topicTitle = `${baseQuery}: Schritt-für-Schritt Anleitung`;
        angle = 'tutorial';
      } else if (themes.has('definition')) {
        topicTitle = `Was ist ${baseQuery}? Ein umfassender Ratgeber`;
        angle = 'educational';
      } else {
        topicTitle = `${baseQuery}: Alles was Sie wissen müssen`;
        angle = 'comprehensive';
      }
      
      // Add variation number if generating multiple
      if (i > 0) {
        const variations = [
          'für Einsteiger',
          'für Fortgeschrittene',
          'im Jahr 2025',
          'für Angehörige',
          'in der Praxis'
        ];
        topicTitle += ` ${variations[i - 1]}`;
      }
      
      topicIdeas.push({
        title: topicTitle,
        angle,
        theme: pattern.theme,
        relevance: knowledge.relevanceScore * (1 - i * 0.1), // Decrease relevance for variations
        sourceThemes: Array.from(themes),
        keyConcepts: conceptArray.slice(0, 5)
      });
    }
    
    logger.info('Generated topic ideas', {
      count: topicIdeas.length,
      topics: topicIdeas.map(t => ({
        title: t.title.substring(0, 50),
        angle: t.angle,
        relevance: t.relevance?.toFixed(3)
      }))
    });
    
    return topicIdeas;
  }
  
  /**
   * Extract key terms from content
   */
  extractKeyTerms(content) {
    const terms = [];
    const important = [
      'sprachcomputer', 'kommunikation', 'hilfsmittel',
      'tobii', 'dynavox', 'grid', 'als', 'ms', 'autismus',
      'krankenkasse', 'kostenübernahme', 'beantragung',
      'therapie', 'beratung', 'unterstützung'
    ];
    
    const words = content.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (important.some(term => word.includes(term))) {
        terms.push(word);
      }
    }
    
    return [...new Set(terms)]; // Unique terms only
  }
  
  /**
   * Select viable topics by checking against existing content
   */
  async selectViableTopics(topicIdeas, options = {}) {
    const {
      maxSelected = 3,
      minRelevance = 0.4  // Lowered to match speaKI's threshold
    } = options;
    
    logger.info('Selecting viable topics', {
      candidates: topicIdeas.length,
      maxSelected,
      minRelevance
    });
    
    const viableTopics = [];
    const rejectedTopics = [];
    
    for (const topic of topicIdeas) {
      logger.debug(`Evaluating topic: "${topic.title.substring(0, 50)}..."`, {
        angle: topic.angle,
        relevance: topic.relevance?.toFixed(3)
      });
      
      // Check relevance threshold
      if (topic.relevance < minRelevance) {
        rejectedTopics.push({
          topic,
          reason: 'Low relevance score',
          score: topic.relevance
        });
        continue;
      }
      
      // Check for duplicates
      const isDuplicate = await this.checkDuplicates(
        topic.title,
        topic.keyConcepts || [],
        [] // Primary keywords would be generated later
      );
      
      if (isDuplicate) {
        rejectedTopics.push({
          topic,
          reason: 'Duplicate content detected'
        });
        
        // Try to refine the angle
        const refined = await this.refineTopicAngle(topic);
        if (refined && !await this.checkDuplicates(refined.title, refined.keyConcepts || [], [])) {
          logger.info('Topic refined to avoid duplication', {
            original: topic.title.substring(0, 50),
            refined: refined.title.substring(0, 50)
          });
          viableTopics.push(refined);
        }
      } else {
        viableTopics.push(topic);
      }
      
      if (viableTopics.length >= maxSelected) {
        break;
      }
    }
    
    logger.info('Topic selection completed', {
      selected: viableTopics.length,
      rejected: rejectedTopics.length,
      rejectionReasons: rejectedTopics.map(r => r.reason)
    });
    
    return {
      viable: viableTopics,
      rejected: rejectedTopics
    };
  }
  
  /**
   * Refine topic angle when duplicates detected
   */
  async refineTopicAngle(topic) {
    logger.info('Refining topic angle to avoid duplication', {
      originalTitle: topic.title,
      originalAngle: topic.angle
    });
    
    const refinements = {
      'educational': [
        { suffix: ' für Einsteiger', angle: 'beginner' },
        { suffix: ' - Häufige Fehler vermeiden', angle: 'mistakes' },
        { suffix: ' - Expertentipps', angle: 'expert' }
      ],
      'comparative': [
        { suffix: ' - Aktuelle Marktübersicht 2025', angle: 'market-overview' },
        { suffix: ' - Preis-Leistungs-Analyse', angle: 'value-analysis' },
        { suffix: ' - Nutzer-Erfahrungen', angle: 'user-reviews' }
      ],
      'tutorial': [
        { suffix: ' - Schnellstart-Guide', angle: 'quickstart' },
        { suffix: ' - Troubleshooting Guide', angle: 'troubleshooting' },
        { suffix: ' - Best Practices', angle: 'best-practices' }
      ],
      'financial': [
        { suffix: ' - Aktuelle Richtlinien 2025', angle: 'regulations-2025' },
        { suffix: ' - Antragstellung leicht gemacht', angle: 'application-guide' },
        { suffix: ' - Kostenvergleich', angle: 'cost-comparison' }
      ],
      'comprehensive': [
        { suffix: ' - Der ultimative Leitfaden', angle: 'ultimate-guide' },
        { suffix: ' - Von A bis Z', angle: 'complete' },
        { suffix: ' - Praxisbeispiele', angle: 'case-studies' }
      ]
    };
    
    const angleRefinements = refinements[topic.angle] || refinements['comprehensive'];
    const randomIndex = Math.floor(Math.random() * angleRefinements.length);
    const refinement = angleRefinements[randomIndex];
    
    const refinedTopic = {
      ...topic,
      title: topic.title + refinement.suffix,
      angle: refinement.angle,
      originalAngle: topic.angle,
      refined: true
    };
    
    logger.info('Topic angle refined', {
      newTitle: refinedTopic.title,
      newAngle: refinedTopic.angle,
      modification: refinement.suffix
    });
    
    return refinedTopic;
  }
  
  /**
   * Determine category and intent for a topic
   */
  determineTopicMetadata(topic, knowledge) {
    logger.info('Determining topic metadata', {
      title: topic.title.substring(0, 50),
      angle: topic.angle
    });
    
    // Category determination based on keywords and angle
    let category = 'Grundlagen'; // Default
    let intent = 'educational'; // Default
    
    const title = topic.title.toLowerCase();
    const concepts = (topic.keyConcepts || []).join(' ').toLowerCase();
    
    // Category assignment logic
    if (title.includes('hilfsmittel') || title.includes('gerät') || 
        title.includes('tobii') || title.includes('grid')) {
      category = 'Hilfsmittel';
    } else if (title.includes('kosten') || title.includes('finanzierung') || 
               title.includes('krankenkasse') || title.includes('beantragung')) {
      category = 'Finanzierung';
    } else if (title.includes('schule') || title.includes('lernen') || 
               title.includes('kinder') || title.includes('förderung')) {
      category = 'Bildung';
    } else if (title.includes('grundlagen') || title.includes('was ist') || 
               title.includes('einführung') || topic.angle === 'educational') {
      category = 'Grundlagen';
    }
    
    // Intent determination
    if (topic.angle === 'comparative' || topic.angle === 'product-review' ||
        title.includes('kaufen') || title.includes('auswahl')) {
      intent = 'commercial';
    } else if (topic.angle === 'tutorial' || topic.angle === 'educational' ||
               topic.angle === 'how-to') {
      intent = 'educational';
    } else if (topic.angle === 'financial' || category === 'Finanzierung') {
      intent = 'transactional';
    } else {
      intent = 'informational';
    }
    
    // Add metadata to topic
    const metadata = {
      category,
      intent,
      primaryKeywords: this.generatePrimaryKeywords(topic, category),
      keywords: this.generateKeywords(topic, knowledge),
      estimatedReadTime: this.estimateReadTime(topic.angle),
      targetAudience: this.determineTargetAudience(topic, category)
    };
    
    logger.info('Topic metadata determined', {
      title: topic.title.substring(0, 50),
      category,
      intent,
      primaryKeywords: metadata.primaryKeywords.slice(0, 3),
      targetAudience: metadata.targetAudience
    });
    
    return { ...topic, ...metadata };
  }
  
  /**
   * Generate primary keywords for a topic
   */
  generatePrimaryKeywords(topic, category) {
    const keywords = [];
    
    // Extract main terms from title
    const titleWords = topic.title.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4); // Longer words are more likely keywords
    
    // Add category-specific keywords
    const categoryKeywords = {
      'Hilfsmittel': ['kommunikationshilfe', 'hilfsmittel', 'assistive technologie'],
      'Finanzierung': ['kostenübernahme', 'krankenkasse', 'finanzierung'],
      'Bildung': ['förderung', 'schule', 'lernen'],
      'Grundlagen': ['grundlagen', 'einführung', 'ratgeber']
    };
    
    // Combine title words with category keywords
    keywords.push(...titleWords.slice(0, 2));
    keywords.push(...(categoryKeywords[category] || []).slice(0, 1));
    
    return [...new Set(keywords)].slice(0, 3); // Max 3 primary keywords
  }
  
  /**
   * Generate secondary keywords for a topic
   */
  generateKeywords(topic, knowledge) {
    const keywords = [];
    
    // Add concepts from knowledge
    if (topic.keyConcepts) {
      keywords.push(...topic.keyConcepts);
    }
    
    // Add theme-related keywords
    const themeKeywords = {
      'tutorial': ['anleitung', 'schritt für schritt', 'guide'],
      'comparison': ['vergleich', 'unterschied', 'vs'],
      'financial': ['kosten', 'preis', 'budget'],
      'educational': ['lernen', 'verstehen', 'erklärung']
    };
    
    if (themeKeywords[topic.theme]) {
      keywords.push(...themeKeywords[topic.theme]);
    }
    
    return [...new Set(keywords)].slice(0, 7); // Max 7 secondary keywords
  }
  
  /**
   * Estimate reading time based on topic angle
   */
  estimateReadTime(angle) {
    const readTimes = {
      'tutorial': '10-15 minutes',
      'comprehensive': '15-20 minutes',
      'quickstart': '5-7 minutes',
      'comparison': '8-10 minutes',
      'educational': '7-10 minutes',
      'financial': '5-8 minutes'
    };
    
    return readTimes[angle] || '7-10 minutes';
  }
  
  /**
   * Determine target audience for the topic
   */
  determineTargetAudience(topic, category) {
    const title = topic.title.toLowerCase();
    
    if (title.includes('angehörige') || title.includes('familie')) {
      return 'Angehörige und Familien';
    } else if (title.includes('kinder') || category === 'Bildung') {
      return 'Eltern und Pädagogen';
    } else if (title.includes('therapeut') || title.includes('fachkraft')) {
      return 'Fachkräfte und Therapeuten';
    } else if (title.includes('patient') || title.includes('betroffene')) {
      return 'Betroffene und Patienten';
    }
    
    return 'Allgemeine Zielgruppe';
  }

  /**
   * Generate blog article with iterative knowledge queries and quality checks
   */
  async generateBlogArticle(baseQuery, options = {}) {
    const workflowId = `article_${Date.now()}`;
    const workflowStartTime = Date.now();
    
    logger.info('=== BLOG ARTICLE GENERATION STARTED ===', {
      workflowId,
      baseQuery,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: Query knowledge iteratively
      logger.info('Step 1: Knowledge Discovery', { workflowId });
      const knowledge = await this.queryKnowledge(baseQuery, options.intent || 'educational');
      
      if (knowledge.totalChunks < 3) {
        logger.warn('Insufficient knowledge found, expanding search', {
          workflowId,
          chunks: knowledge.totalChunks
        });
        
        // Try broader search
        const expandedKnowledge = await this.queryKnowledge(
          `${baseQuery} Hilfsmittel Kommunikation`,
          'informational'
        );
        
        if (expandedKnowledge.totalChunks > knowledge.totalChunks) {
          Object.assign(knowledge, expandedKnowledge);
        }
      }
      
      // Step 2: Generate topic ideas
      logger.info('Step 2: Topic Strategy', { workflowId });
      const topicIdeas = await this.generateTopicIdeas(knowledge, baseQuery, { count: 3 });
      
      // Step 3: Select viable topic
      const selection = await this.selectViableTopics(topicIdeas, { 
        maxSelected: 1,
        minRelevance: 0.4  // Match speaKI's threshold
      });
      
      if (selection.viable.length === 0) {
        throw new Error('No viable topics could be generated');
      }
      
      const selectedTopic = selection.viable[0];
      
      // Step 4: Determine metadata
      logger.info('Step 3: Metadata Determination', { workflowId });
      const topicWithMetadata = this.determineTopicMetadata(selectedTopic, knowledge);
      
      // Step 5: Generate article with retry logic
      logger.info('Step 4: Content Generation', { workflowId });
      const article = await this.generateContentWithRetry(topicWithMetadata, knowledge, workflowId);
      
      // Step 6: Quality assessment
      logger.info('Step 5: Quality Assessment', { workflowId });
      const qualityScore = await this.assessContentQuality(article);
      
      const totalDuration = Date.now() - workflowStartTime;
      
      logger.info('=== BLOG ARTICLE GENERATION COMPLETED ===', {
        workflowId,
        title: article['Main Post Title'],
        category: article.Category,
        wordCount: article.wordCount,
        qualityScore,
        totalDuration_ms: totalDuration,
        totalDuration_seconds: (totalDuration / 1000).toFixed(2),
        success: true
      });
      
      return {
        ...article,
        workflowId,
        qualityScore,
        generationTime: totalDuration
      };
      
    } catch (error) {
      const totalDuration = Date.now() - workflowStartTime;
      
      logger.error('=== BLOG ARTICLE GENERATION FAILED ===', {
        workflowId,
        error: error.message,
        stack: error.stack,
        totalDuration_ms: totalDuration
      });
      
      throw error;
    }
  }
  
  /**
   * Generate content with retry logic for quality
   */
  async generateContentWithRetry(topic, knowledge, workflowId) {
    const maxAttempts = 3;
    let lastError = null;
    
    // Prepare knowledge context
    let knowledgeContext = this.prepareKnowledgeContext(knowledge);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        logger.info(`Content generation attempt ${attempt}/${maxAttempts}`, { workflowId });
        
        // OPTIMIZED_17: Article Generation Instruction
        const result = await openAIService.generateArticle(
          `Erstelle einen Artikel, der das bereitgestellte Wissen in echte Hilfe verwandelt.\nDer Leser soll nach dem Lesen wissen: "So kann ich/mein Angehöriger konkret weiterkommen."\nNutze die Wissensdatenbank.`,
          {
            topic: topic.title,
            category: topic.category,
            intent: topic.intent,
            keywords: topic.keywords || [],
            primaryKeywords: topic.primaryKeywords || [],
            targetAudience: topic.targetAudience,
            knowledge: knowledgeContext,
            wordCount: '800-1200'
          }
        );
        
        // Parse and structure the content
        const structuredArticle = this.structureGeneratedContent(
          result.content,
          topic,
          result.usage
        );
        
        // Check quality
        const qualityCheck = this.checkContentQuality(structuredArticle);
        
        if (qualityCheck.passed) {
          logger.info('Content quality check passed', {
            workflowId,
            attempt,
            wordCount: structuredArticle.wordCount,
            score: qualityCheck.score
          });
          
          return structuredArticle;
        } else {
          logger.warn('Content quality check failed, retrying', {
            workflowId,
            attempt,
            issues: qualityCheck.issues,
            score: qualityCheck.score
          });
          
          if (attempt < maxAttempts) {
            // Add feedback for next attempt
            knowledgeContext += `\n\nBitte beachte folgende Verbesserungen: ${qualityCheck.issues.join(', ')}`;
          }
        }
        
      } catch (error) {
        lastError = error;
        logger.error(`Content generation attempt ${attempt} failed`, {
          workflowId,
          error: error.message
        });
        
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000 * attempt)); // Exponential backoff
        }
      }
    }
    
    throw new Error(`Content generation failed after ${maxAttempts} attempts: ${lastError?.message}`);
  }
  
  /**
   * Prepare knowledge context for OpenAI
   */
  prepareKnowledgeContext(knowledge) {
    let context = '';
    
    if (knowledge.keyInsights && knowledge.keyInsights.length > 0) {
      context += 'WICHTIGE ERKENNTNISSE:\n';
      knowledge.keyInsights.forEach((insight, index) => {
        context += `${index + 1}. ${insight.content}\n`;
      });
      context += '\n';
    }
    
    if (knowledge.faqs && knowledge.faqs.length > 0) {
      context += 'HÄUFIGE FRAGEN:\n';
      knowledge.faqs.slice(0, 5).forEach(faq => {
        context += `- ${faq.content}\n`;
      });
      context += '\n';
    }
    
    if (knowledge.products && knowledge.products.length > 0) {
      context += 'RELEVANTE PRODUKTE/LÖSUNGEN:\n';
      knowledge.products.slice(0, 3).forEach(product => {
        context += `- ${product.content}\n`;
      });
      context += '\n';
    }
    
    if (knowledge.guides && knowledge.guides.length > 0) {
      context += 'ANLEITUNGEN/INFORMATIONEN:\n';
      knowledge.guides.slice(0, 3).forEach(guide => {
        context += `- ${guide.content}\n`;
      });
    }
    
    if (!context || context.trim().length < 100) {
      throw new Error('Insufficient knowledge context available. Cannot generate quality content without proper knowledge base.');
    }
    
    return context;
  }
  
  /**
   * Structure generated content for Airtable
   */
  structureGeneratedContent(rawContent, topic, usage) {
    // Extract title (first # or ## heading)
    const titleMatch = rawContent.match(/^##?\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : topic.title;
    
    // Remove title from content if found
    const content = titleMatch 
      ? rawContent.replace(titleMatch[0], '').trim()
      : rawContent;
    
    // Count words
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    
    // Extract keywords from content
    const extractedKeywords = this.extractKeywordsFromContent(content);
    
    return {
      'Main Post Title': title,
      'Article Content': content,
      'Category': topic.category,
      'Intent': topic.intent,
      'Keywords': [...new Set([...topic.keywords, ...extractedKeywords])].slice(0, 10),
      'Primary Keywords': topic.primaryKeywords,
      wordCount,
      tokenUsage: usage,
      targetAudience: topic.targetAudience,
      estimatedReadTime: Math.ceil(wordCount / 200) + ' minutes'
    };
  }
  
  /**
   * Extract keywords from generated content
   */
  extractKeywordsFromContent(content) {
    const keywords = [];
    const importantTerms = [
      'kommunikation', 'hilfsmittel', 'sprachcomputer', 
      'unterstützt', 'förderung', 'therapie', 'beratung',
      'kostenübernahme', 'krankenkasse', 'beantragung'
    ];
    
    const words = content.toLowerCase().split(/\s+/);
    const wordFrequency = {};
    
    words.forEach(word => {
      const cleaned = word.replace(/[^\w]/g, '');
      if (cleaned.length > 5 && !wordFrequency[cleaned]) {
        wordFrequency[cleaned] = 0;
      }
      if (wordFrequency[cleaned] !== undefined) {
        wordFrequency[cleaned]++;
      }
    });
    
    // Get top frequent words that are also important
    Object.entries(wordFrequency)
      .filter(([word, freq]) => freq > 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([word]) => {
        if (importantTerms.some(term => word.includes(term))) {
          keywords.push(word);
        }
      });
    
    return keywords;
  }
  
  /**
   * Check content quality
   */
  checkContentQuality(article) {
    const issues = [];
    let score = 1.0;
    
    // Check word count (800-1200 words)
    if (article.wordCount < 800) {
      issues.push(`Artikel zu kurz (${article.wordCount} Wörter, mindestens 800 erforderlich)`);
      score -= 0.3;
    } else if (article.wordCount > 1500) {
      issues.push(`Artikel zu lang (${article.wordCount} Wörter, maximal 1500 empfohlen)`);
      score -= 0.1;
    }
    
    // Check for structure (headings)
    const headingCount = (article['Article Content'].match(/##/g) || []).length;
    if (headingCount < 3) {
      issues.push('Unzureichende Struktur (weniger als 3 Überschriften)');
      score -= 0.2;
    }
    
    // Check keyword integration
    const content = article['Article Content'].toLowerCase();
    const keywordIntegration = article['Primary Keywords'].filter(kw => 
      content.includes(kw.toLowerCase())
    ).length / article['Primary Keywords'].length;
    
    if (keywordIntegration < 0.5) {
      issues.push('Unzureichende Keyword-Integration');
      score -= 0.2;
    }
    
    // Check for introduction and conclusion
    const hasIntro = content.length > 200 && !content.startsWith('#');
    const hasConclusion = content.includes('fazit') || content.includes('zusammenfassung');
    
    if (!hasIntro) {
      issues.push('Fehlende oder zu kurze Einleitung');
      score -= 0.1;
    }
    
    if (!hasConclusion) {
      issues.push('Fehlendes Fazit oder Zusammenfassung');
      score -= 0.1;
    }
    
    return {
      passed: score >= 0.7,
      score,
      issues
    };
  }
  
  /**
   * Assess content quality (post-generation)
   */
  async assessContentQuality(article) {
    const assessment = {
      wordCount: article.wordCount,
      structure: {
        hasTitle: !!article['Main Post Title'],
        headingCount: (article['Article Content'].match(/##/g) || []).length,
        paragraphCount: article['Article Content'].split('\n\n').length
      },
      keywords: {
        primaryIntegrated: 0,
        secondaryIntegrated: 0,
        density: 0
      },
      readability: {
        estimatedReadTime: article.estimatedReadTime,
        targetAudience: article.targetAudience
      },
      overall: 0
    };
    
    // Calculate keyword metrics
    const content = article['Article Content'].toLowerCase();
    
    assessment.keywords.primaryIntegrated = article['Primary Keywords'].filter(kw => 
      content.includes(kw.toLowerCase())
    ).length;
    
    assessment.keywords.secondaryIntegrated = article['Keywords'].filter(kw => 
      content.includes(kw.toLowerCase())
    ).length;
    
    assessment.keywords.density = 
      ((assessment.keywords.primaryIntegrated + assessment.keywords.secondaryIntegrated) / 
       article.wordCount) * 100;
    
    // Calculate overall score
    let score = 0;
    
    // Word count score (30%)
    if (article.wordCount >= 800 && article.wordCount <= 1200) {
      score += 0.3;
    } else if (article.wordCount >= 600 && article.wordCount <= 1500) {
      score += 0.2;
    } else {
      score += 0.1;
    }
    
    // Structure score (30%)
    if (assessment.structure.headingCount >= 3) {
      score += 0.3;
    } else if (assessment.structure.headingCount >= 2) {
      score += 0.2;
    } else {
      score += 0.1;
    }
    
    // Keyword integration score (20%)
    if (assessment.keywords.primaryIntegrated >= 2) {
      score += 0.2;
    } else if (assessment.keywords.primaryIntegrated >= 1) {
      score += 0.1;
    }
    
    // Content completeness (20%)
    if (assessment.structure.paragraphCount >= 5) {
      score += 0.2;
    } else if (assessment.structure.paragraphCount >= 3) {
      score += 0.1;
    }
    
    assessment.overall = score;
    
    logger.info('Content quality assessment', {
      score,
      wordCount: assessment.wordCount,
      structure: assessment.structure,
      keywordMetrics: assessment.keywords
    });
    
    return score;
  }

  /**
   * Main workflow orchestrator
   */
  async generateArticle(topic, intent = 'educational') {
    const workflowId = `wf_${Date.now()}`;
    this.startTime = Date.now();
    
    logger.info('=== CONTENT GENERATION WORKFLOW STARTED ===', {
      workflowId,
      topic,
      intent,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Step 1: Query knowledge
      const knowledge = await this.queryKnowledge(topic, intent);
      
      // Step 2: Generate initial content
      const content = await this.generateContent(knowledge, {
        temperature: 0.7,
        targetLength: 'standard'
      });
      
      // Step 3: Check for duplicates
      const isDuplicate = await this.checkDuplicates(
        content.title,
        content.keywords,
        content.primaryKeywords
      );
      
      if (isDuplicate) {
        logger.warn('Duplicate content detected, regenerating...', { workflowId });
        // Would regenerate here in full implementation
      }
      
      const totalDuration = Date.now() - this.startTime;
      
      logger.info('=== CONTENT GENERATION WORKFLOW COMPLETED ===', {
        workflowId,
        totalDuration_ms: totalDuration,
        totalDuration_seconds: (totalDuration / 1000).toFixed(2),
        steps: Object.keys(this.stepTimings).length,
        success: true
      });
      
      return content;
      
    } catch (error) {
      const totalDuration = Date.now() - this.startTime;
      
      logger.error('=== CONTENT GENERATION WORKFLOW FAILED ===', {
        workflowId,
        totalDuration_ms: totalDuration,
        error: error.message,
        stack: error.stack,
        stepsCompleted: Object.keys(this.stepTimings).length
      });
      
      throw error;
    }
  }
}

export default ContentGenerator;

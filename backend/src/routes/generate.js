import Fastify from 'fastify';
import ContentGenerator from '../services/contentGenerator.js';

const generateRoutes = async (fastify, options) => {
  // Test content generation endpoint
  fastify.get('/test', async (request, reply) => {
    try {
      const generator = new ContentGenerator();
      
      // Test with a simple topic
      const testTopic = 'Sprachcomputer für ALS-Patienten';
      const testIntent = 'educational';
      
      fastify.log.info('Testing content generation', { testTopic, testIntent });
      
      // Test knowledge query
      const knowledge = await generator.queryKnowledge(testTopic, testIntent);
      
      return {
        success: true,
        message: 'Content generation test completed',
        testTopic,
        testIntent,
        knowledge: {
          totalChunks: knowledge.totalChunks,
          relevanceScore: knowledge.relevanceScore,
          faqCount: knowledge.faqs?.length || 0,
          serviceCount: knowledge.services?.length || 0,
          productCount: knowledge.products?.length || 0,
          guideCount: knowledge.guides?.length || 0
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('Content generation test failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Test failed',
        message: error.message
      });
    }
  });

  // Generate full article endpoint
  fastify.post('/', async (request, reply) => {
    try {
      const { topic, intent = 'educational', options = {} } = request.body;
      
      if (!topic) {
        return reply.code(400).send({
          success: false,
          error: 'Missing required field: topic'
        });
      }
      
      fastify.log.info('Generating article', { topic, intent });
      
      const generator = new ContentGenerator();
      const result = await generator.generateBlogArticle(topic, { intent, ...options });
      
      return {
        success: true,
        message: 'Article generated successfully',
        data: {
          workflowId: result.workflowId,
          title: result['Main Post Title'],
          category: result.Category,
          wordCount: result.wordCount,
          qualityScore: result.qualityScore,
          generationTime: result.generationTime,
          keywords: result.Keywords,
          primaryKeywords: result['Primary Keywords']
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      fastify.log.error('Article generation failed:', error);
      return reply.code(500).send({
        success: false,
        error: 'Generation failed',
        message: error.message
      });
    }
  });

  // Health check for content generation
  fastify.get('/health', async (request, reply) => {
    try {
      const generator = new ContentGenerator();
      
      return {
        success: true,
        message: 'Content generation service healthy',
        services: {
          airtable: !!(generator.airtableService && generator.airtableService.base),
          supabase: !!(generator.supabaseService && generator.supabaseService.client)
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: 'Health check failed',
        message: error.message
      });
    }
  });
};

export default generateRoutes;

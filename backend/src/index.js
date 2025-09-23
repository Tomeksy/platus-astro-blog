import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import articlePublisher from './services/articlePublisher.js';
import airtableService from './services/airtable.js';
import githubService from './services/github.js';
import openaiService from './services/openai.js';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Create Fastify instance
const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    }
  }
});

// Register CORS
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
});

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    service: 'hilfsmittelberater-backend',
    railwayDomain: process.env.RAILWAY_PUBLIC_DOMAIN || 'not deployed'
  };
});

// Detailed health check with service status
fastify.get('/health/detailed', async (request, reply) => {
  const services = {};
  
  // Check Airtable
  if (process.env.AIRTABLE_API_KEY) {
    try {
      services.airtable = await airtableService.testConnection();
    } catch (error) {
      services.airtable = { connected: false, error: error.message };
    }
  } else {
    services.airtable = { connected: false, error: 'Not configured' };
  }
  
  // Check GitHub
  if (process.env.GITHUB_TOKEN) {
    try {
      services.github = await githubService.testConnection();
    } catch (error) {
      services.github = { connected: false, error: error.message };
    }
  } else {
    services.github = { connected: false, error: 'Not configured' };
  }
  
  // Check OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      services.openai = await openaiService.testConnection();
    } catch (error) {
      services.openai = { connected: false, error: error.message };
    }
  } else {
    services.openai = { connected: false, error: 'Not configured' };
  }
  
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    message: 'Hilfsmittelberater Backend API',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    railwayUrl: process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : 'local',
    endpoints: {
      health: {
        basic: 'GET /health',
        detailed: 'GET /health/detailed'
      },
      webhook: {
        main: 'POST /webhook',
        test: 'GET /webhook/test'
      },
      info: 'GET /'
    },
    webhookUrl: process.env.RAILWAY_PUBLIC_DOMAIN 
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}/webhook`
      : `http://localhost:${process.env.PORT || 3001}/webhook`
  };
});

// Webhook endpoint for Pipedream
fastify.post('/webhook', async (request, reply) => {
  try {
    fastify.log.info('Webhook received:', request.body);
    
    const { recordId, action } = request.body;
    
    if (!recordId) {
      return reply.code(400).send({
        success: false,
        error: 'Missing recordId in request body'
      });
    }
    
    // Handle different actions
    switch (action) {
      case 'test':
        // Test the article without publishing
        try {
          const testResult = await articlePublisher.testProcess(recordId);
          return {
            success: true,
            message: 'Test successful - article ready for publishing',
            data: testResult
          };
        } catch (testError) {
          return reply.code(500).send({
            success: false,
            error: 'Test failed',
            message: testError.message
          });
        }
        
      case 'publish':
        // Publish the article to GitHub
        try {
          const publishResult = await articlePublisher.processArticle(recordId);
          return {
            success: true,
            message: 'Article published successfully',
            data: publishResult
          };
        } catch (publishError) {
          return reply.code(500).send({
            success: false,
            error: 'Publishing failed',
            message: publishError.message
          });
        }
        
      default:
        // Default: just acknowledge receipt
        return {
          success: true,
          message: 'Webhook received - no action specified',
          data: {
            recordId,
            action: action || 'none',
            timestamp: new Date().toISOString(),
            hint: 'Use action: "test" or "publish" to process the article'
          }
        };
    }
  } catch (error) {
    fastify.log.error('Webhook error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET webhook endpoint for Airtable button (uses query params)
fastify.get('/webhook', async (request, reply) => {
  try {
    fastify.log.info('GET Webhook from Airtable:', request.query);
    
    // Extract record_id from query parameters
    const recordId = request.query.record_id || request.query.recordId;
    const action = request.query.action || 'acknowledge'; // Default to safe mode
    
    if (!recordId) {
      return reply.code(400).send({
        success: false,
        error: 'Missing record_id in query parameters',
        received: request.query,
        hint: 'Expected query parameter: ?record_id=recXXXXXXXXXXXX'
      });
    }
    
    // Handle different actions (same as POST endpoint)
    switch (action) {
      case 'test':
        // Test the article without publishing
        try {
          const testResult = await articlePublisher.testProcess(recordId);
          return {
            success: true,
            message: 'Test successful - article ready for publishing',
            data: testResult
          };
        } catch (testError) {
          return reply.code(500).send({
            success: false,
            error: 'Test failed',
            message: testError.message
          });
        }
        
      case 'publish':
        // Publish the article to GitHub
        try {
          const publishResult = await articlePublisher.processArticle(recordId);
          return {
            success: true,
            message: 'Article published successfully via Airtable button',
            data: publishResult
          };
        } catch (publishError) {
          return reply.code(500).send({
            success: false,
            error: 'Publishing failed',
            message: publishError.message
          });
        }
        
      default:
        // Default: just acknowledge receipt
        return {
          success: true,
          message: 'Webhook received from Airtable button',
          data: {
            recordId: recordId,
            action: action,
            timestamp: new Date().toISOString(),
            hint: 'Add ?action=test or ?action=publish to control behavior'
          }
        };
    }
  } catch (error) {
    fastify.log.error('GET Webhook error:', error);
    return reply.code(500).send({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Test webhook endpoint
fastify.get('/webhook/test', async (request, reply) => {
  return {
    success: true,
    message: 'Webhook endpoint is active',
    testPayload: {
      recordId: 'rec123456',
      action: 'test',
      articleData: {
        title: 'Test Article',
        content: 'Test content'
      }
    },
    instruction: 'Send POST request to /webhook with this payload'
  };
});

// Start server
const start = async () => {
  try {
    const port = process.env.PORT || 3001;
    const host = process.env.HOST || '0.0.0.0';
    
    await fastify.listen({ port, host });
    console.log(`🚀 Server running at http://${host}:${port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

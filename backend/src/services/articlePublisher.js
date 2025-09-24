import airtableService from './airtable.js';
import githubService from './github.js';
import openaiService from './openai.js';
import { formatMarkdown } from '../utils/formatter.js';

/**
 * Main service for publishing articles
 */
class ArticlePublisher {
  /**
   * Process article from Airtable to GitHub
   */
  async processArticle(recordId) {
    try {
      console.log(`📝 Processing article: ${recordId}`);
      
      // Step 1: Fetch article from Airtable
      const article = await airtableService.getArticle(recordId, 'drafts');
      
      if (!article) {
        throw new Error(`Article not found: ${recordId}`);
      }
      
      const { fields } = article;
      
      // Step 2: Generate/enhance content if needed
      let content = fields.Content || fields.content || fields['Article Content'];
      
      if (!content) {
        throw new Error('No content found in article record');
      }
      
      if (fields['Needs AI Processing']) {
        console.log('🤖 Enhancing content with AI...');
        content = await openaiService.enhanceContent(
          content,
          fields['AI Instructions'] || 'Verbessere Struktur und Lesbarkeit'
        );
      }
      
      // Step 3: Generate SEO metadata if missing
      if (!fields.Description && !fields.description) {
        console.log('🔍 Generating SEO metadata...');
        const seoData = await openaiService.generateSEOMetadata(
          fields['Main Post Title'] || fields.Title || fields.title,
          content
        );
        // Parse and add to fields (simplified for now)
        fields.Description = seoData;
      }
      
      // Step 4: Format as markdown
      const markdownContent = formatMarkdown({
        title: fields.Title || fields.title,
        content: content,
        metadata: {
          description: fields.Description || fields.description,
          author: fields.Author || 'Platus Communicates Team',
          categories: fields.Categories || ['Allgemein'],
          tags: fields.Tags || [],
          featured: fields.Featured || false,
          coverImage: fields['Cover Image'] || fields.coverImage,
          imageAlt: fields['Image Alt'] || fields.imageAlt
        }
      });
      
      // Step 5: Generate filename
      const filename = this.generateFilename(fields.Title || fields.title);
      const filepath = `src/content/blog/${filename}`;
      
      // Step 6: Push to GitHub
      console.log(`📤 Publishing to GitHub: ${filepath}`);
      const githubResult = await githubService.createOrUpdateFile(
        filepath,
        markdownContent,
        `Add blog post: ${fields.Title || fields.title}`
      );
      
      // Step 7: Move to posted table in Airtable
      await airtableService.moveToPosted(recordId, githubResult.url);
      
      console.log(`✅ Article published successfully: ${githubResult.url}`);
      
      return {
        success: true,
        recordId,
        filename,
        githubUrl: githubResult.url,
        sha: githubResult.sha
      };
      
    } catch (error) {
      console.error(`❌ Failed to process article ${recordId}:`, error);
      
      // Update status in Airtable
      try {
        await airtableService.updateArticleStatus(recordId, 'error', 'drafts');
      } catch (updateError) {
        console.error('Failed to update error status:', updateError);
      }
      
      throw error;
    }
  }
  
  /**
   * Generate URL-friendly filename
   */
  generateFilename(title) {
    const slug = title
      .toLowerCase()
      .replace(/ä/g, 'ae')
      .replace(/ö/g, 'oe')
      .replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 100);
    
    return `${slug}.md`;
  }
  
  /**
   * Test article processing without publishing
   */
  async testProcess(recordId) {
    try {
      console.log(`🧪 Test processing article: ${recordId}`);
      
      // Fetch article
      const article = await airtableService.getArticle(recordId, 'drafts');
      
      if (!article) {
        throw new Error(`Article not found: ${recordId}`);
      }
      
      const { fields } = article;
      
      // Format as markdown
      const markdownContent = formatMarkdown({
        title: fields.Title || fields.title,
        content: fields.Content || fields.content || 'No content',
        metadata: {
          description: fields.Description || 'Test description',
          author: fields.Author || 'Platus Communicates Team',
          categories: fields.Categories || ['Test'],
          tags: fields.Tags || [],
          featured: false
        }
      });
      
      const filename = this.generateFilename(fields.Title || fields.title);
      
      return {
        success: true,
        test: true,
        recordId,
        title: fields.Title || fields.title,
        filename,
        preview: markdownContent.substring(0, 500) + '...'
      };
      
    } catch (error) {
      console.error(`❌ Test failed for ${recordId}:`, error);
      throw error;
    }
  }
}

export default new ArticlePublisher();

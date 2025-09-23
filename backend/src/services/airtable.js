import Airtable from 'airtable';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Airtable service for managing blog articles
 */
class AirtableService {
  constructor() {
    if (!process.env.AIRTABLE_API_KEY || !process.env.AIRTABLE_BASE_ID) {
      console.warn('⚠️ Airtable credentials not configured');
      return;
    }

    // Configure Airtable
    this.base = new Airtable({ 
      apiKey: process.env.AIRTABLE_API_KEY 
    }).base(process.env.AIRTABLE_BASE_ID);
    
    // Table references
    this.draftsTable = this.base(process.env.AIRTABLE_TABLE_DRAFTS || 'Drafts');
    this.postedTable = this.base(process.env.AIRTABLE_TABLE_POSTED || 'Posted');
  }

  /**
   * Get article by record ID
   */
  async getArticle(recordId, tableName = 'drafts') {
    const table = tableName === 'drafts' ? this.draftsTable : this.postedTable;
    
    try {
      const record = await table.find(recordId);
      
      return {
        id: record.id,
        fields: record.fields,
        createdTime: record._rawJson.createdTime
      };
    } catch (error) {
      console.error(`Failed to fetch article ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Update article status
   */
  async updateArticleStatus(recordId, status, tableName = 'drafts') {
    const table = tableName === 'drafts' ? this.draftsTable : this.postedTable;
    
    try {
      const record = await table.update(recordId, {
        Status: status,
        'Last Updated': new Date().toISOString()
      });
      
      console.log(`✅ Updated article status: ${recordId} -> ${status}`);
      return record;
    } catch (error) {
      console.error(`Failed to update article ${recordId}:`, error);
      throw error;
    }
  }

  /**
   * Move article from drafts to posted
   */
  async moveToPosted(recordId, githubUrl) {
    try {
      // Get the draft record
      const draftRecord = await this.getArticle(recordId, 'drafts');
      
      // Create in posted table with GitHub URL
      const postedRecord = await this.postedTable.create({
        ...draftRecord.fields,
        'GitHub URL': githubUrl,
        'Published Date': new Date().toISOString(),
        Status: 'published'
      });
      
      // Delete from drafts table
      await this.draftsTable.destroy(recordId);
      
      console.log(`✅ Moved article to posted: ${recordId} -> ${postedRecord.id}`);
      return postedRecord;
    } catch (error) {
      console.error(`Failed to move article to posted:`, error);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      await this.draftsTable.select({ maxRecords: 1 }).firstPage();
      return { connected: true, base: process.env.AIRTABLE_BASE_ID };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default new AirtableService();

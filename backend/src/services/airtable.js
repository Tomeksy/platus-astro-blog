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
   * Create a new draft record in Airtable
   * @param {Object} fields - Article data keyed by Airtable column names
   */
  async createDraft(fields) {
    if (!this.draftsTable) {
      throw new Error('Airtable drafts table not configured');
    }

    try {
      // Convert array fields to CSV strings where Airtable expects text
      const preparedFields = { ...fields };
      if (Array.isArray(preparedFields.Keywords)) {
        preparedFields.Keywords = preparedFields.Keywords.join(', ');
      }
      if (Array.isArray(preparedFields['Primary Keywords'])) {
        preparedFields['Primary Keywords'] = preparedFields['Primary Keywords'].join(', ');
      }

      // If Airtable uses a singular column name, map it automatically
      if (!('Primary Keywords' in preparedFields) && 'Primary Keyword' in preparedFields) {
        preparedFields['Primary Keyword'] = Array.isArray(preparedFields['Primary Keyword'])
          ? preparedFields['Primary Keyword'].join(', ')
          : preparedFields['Primary Keyword'];
      }

      // Map target audience to allowed single-select options
      const mapAudience = value => {
        if (!value) return 'Betroffener';
        const v = value.toLowerCase();
        if (v.includes('angehör')) return 'Angehöriger';
        if (v.includes('fach') || v.includes('therapeut')) return 'Fachpersonal';
        return 'Betroffener';
      };

      const allowedFields = {
        'Main Post Title': preparedFields['Main Post Title'],
        'Intent': preparedFields.Intent,
        'Category': preparedFields.Category,
        'Keywords': preparedFields.Keywords,
        'Primary Keywords': preparedFields['Primary Keywords'],
        'Article Content': preparedFields['Article Content'],
        'Target Audience': mapAudience(preparedFields.targetAudience || preparedFields['Target Audience'])
      };

      const record = await this.draftsTable.create(allowedFields);

      console.log(`✅ Draft created in Airtable: ${record.id}`);
      return {
        id: record.id,
        fields: record.fields,
        createdTime: record._rawJson.createdTime
      };
    } catch (error) {
      console.error('Failed to create draft in Airtable:', error);
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

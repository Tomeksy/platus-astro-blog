import { Octokit } from '@octokit/rest';
import dotenv from 'dotenv';

dotenv.config();

/**
 * GitHub service for managing blog repository
 */
class GitHubService {
  constructor() {
    if (!process.env.GITHUB_TOKEN) {
      console.warn('⚠️ GitHub token not configured');
      return;
    }

    this.octokit = new Octokit({
      auth: process.env.GITHUB_TOKEN
    });

    // Parse repository info
    this.owner = process.env.GITHUB_OWNER;
    // Handle both 'owner/repo' and just 'repo' formats
    const repoStr = process.env.GITHUB_REPO;
    this.repo = repoStr?.includes('/') ? repoStr.split('/')[1] : repoStr;
    this.branch = process.env.GITHUB_BRANCH || 'main';
    
    console.log(`✅ GitHub service initialized for ${this.owner}/${this.repo}`);
  }

  /**
   * Create or update a file in the repository
   */
  async createOrUpdateFile(path, content, message) {
    if (!this.octokit) {
      throw new Error('GitHub client not initialized');
    }

    try {
      // Check if file exists
      let sha = null;
      try {
        const { data } = await this.octokit.repos.getContent({
          owner: this.owner,
          repo: this.repo,
          path: path,
          ref: this.branch
        });
        sha = data.sha;
        console.log(`📝 File exists, updating: ${path}`);
      } catch (error) {
        if (error.status === 404) {
          console.log(`📝 Creating new file: ${path}`);
        } else {
          throw error;
        }
      }

      // Create or update file
      const response = await this.octokit.repos.createOrUpdateFileContents({
        owner: this.owner,
        repo: this.repo,
        path: path,
        message: message,
        content: Buffer.from(content).toString('base64'),
        sha: sha,
        branch: this.branch
      });

      console.log(`✅ File committed: ${response.data.commit.sha}`);
      
      return {
        sha: response.data.commit.sha,
        url: response.data.content.html_url,
        message: response.data.commit.message
      };

    } catch (error) {
      console.error('❌ GitHub operation failed:', error.message);
      throw error;
    }
  }

  /**
   * Test connection
   */
  async testConnection() {
    if (!this.octokit) {
      return { connected: false, error: 'No GitHub token configured' };
    }

    try {
      await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo
      });
      
      return { connected: true, repository: `${this.owner}/${this.repo}` };
    } catch (error) {
      return { connected: false, error: error.message };
    }
  }
}

export default new GitHubService();

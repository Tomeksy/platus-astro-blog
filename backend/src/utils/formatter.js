/**
 * Format article data into Astro-compatible Markdown
 */
export function formatMarkdown({ title, content, metadata }) {
  // Create frontmatter
  const frontmatter = {
    title: title,
    description: metadata.description,
    publishedDate: new Date().toISOString().split('T')[0],
    author: metadata.author || 'Platus Communicates Team',
    categories: metadata.categories || ['Allgemein'],
    tags: metadata.tags || [],
    featured: metadata.featured || false,
    draft: false
  };
  
  // Add optional fields
  if (metadata.coverImage) {
    frontmatter.coverImage = metadata.coverImage;
  }
  
  if (metadata.imageAlt) {
    frontmatter.imageAlt = metadata.imageAlt;
  }
  
  // Build the markdown file
  const markdownContent = [
    '---',
    ...Object.entries(frontmatter).map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}: [${value.map(v => `"${v}"`).join(', ')}]`;
      } else if (typeof value === 'boolean') {
        return `${key}: ${value}`;
      } else if (typeof value === 'string' && value.includes('"')) {
        return `${key}: "${value.replace(/"/g, '\\"')}"`;
      } else {
        return `${key}: "${value}"`;
      }
    }),
    '---',
    '',
    content
  ].join('\n');
  
  return markdownContent;
}

/**
 * Validate article data
 */
export function validateArticleData(articleData) {
  const errors = [];
  
  if (!articleData.title) {
    errors.push('Missing title');
  }
  
  if (!articleData.content) {
    errors.push('Missing content');
  }
  
  if (!articleData.metadata?.description) {
    errors.push('Missing description');
  }
  
  if (!articleData.metadata?.categories || articleData.metadata.categories.length === 0) {
    errors.push('Missing categories');
  }
  
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join(', ')}`);
  }
  
  return true;
}

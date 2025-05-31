import MarkdownIt from 'markdown-it';

// Configure Markdown processor
const md = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
  typographer: true,
});

// Function to render markdown to HTML
export function renderMarkdown(markdownContent: string): string {
  return md.render(markdownContent);
}

// Function to extract a plain text excerpt from markdown
export function extractExcerpt(markdownContent: string, maxLength: number = 160): string {
  // Remove markdown formatting
  let plainText = markdownContent
    .replace(/#+\s+(.*)/g, '$1') // Headers
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .replace(/^\s*>\s*(.*)/gm, '$1') // Blockquotes
    .replace(/!\[.*?\]\(.*?\)/g, '') // Images
    .replace(/\n\s*\n/g, '\n') // Multiple new lines
    .trim();
    
  // Truncate and add ellipsis if needed
  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + '...';
}

// Get all headings from markdown with their levels
export function extractHeadings(markdownContent: string): { level: number; text: string; id: string }[] {
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const headings: { level: number; text: string; id: string }[] = [];
  let match;
  
  while ((match = headingRegex.exec(markdownContent)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-');
      
    headings.push({ level, text, id });
  }
  
  return headings;
}